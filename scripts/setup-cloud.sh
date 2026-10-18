#!/usr/bin/env bash
# One-command cloud setup for Deyte: Supabase project + schema + auth settings,
# Vercel environment variables, and a production redeploy. Safe to re-run:
# it reuses the project it made before and only fills in what's missing.
#
# Needs (as environment variables, never pasted into chat or committed):
#   SUPABASE_ACCESS_TOKEN   supabase.com/dashboard/account/tokens
#   VERCEL_TOKEN            vercel.com/account/tokens
# Optional:
#   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET            → turns on "Continue with Google"
#   APPLE_SERVICES_ID, APPLE_TEAM_ID, APPLE_KEY_ID,
#   APPLE_PRIVATE_KEY (contents of the .p8 file)      → turns on "Continue with Apple"
#   SUPABASE_REGION (default us-east-1), SUPABASE_ORG_ID, VERCEL_PROJECT (default deyte),
#   SITE_URL (default: the Vercel project's production domain)
#
# Usage: bash scripts/setup-cloud.sh

set -euo pipefail
cd "$(dirname "$0")/.."

: "${SUPABASE_ACCESS_TOKEN:?Set SUPABASE_ACCESS_TOKEN}"
: "${VERCEL_TOKEN:?Set VERCEL_TOKEN}"
REGION="${SUPABASE_REGION:-us-east-1}"
NAME="deyte"
VERCEL_PROJECT="${VERCEL_PROJECT:-deyte}"

say() { printf '\033[1m→ %s\033[0m\n' "$*"; }
die() { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

# api METHOD URL TOKEN [JSON] → prints body; fails loudly on HTTP errors.
api() {
  local method=$1 url=$2 token=$3 body=${4:-} out code
  out=$(mktemp)
  if [[ -n $body ]]; then
    code=$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "$url" -H "Authorization: Bearer $token" -H 'Content-Type: application/json' --data "$body")
  else
    code=$(curl -sS -o "$out" -w '%{http_code}' -X "$method" "$url" -H "Authorization: Bearer $token")
  fi
  if [[ $code -ge 400 ]]; then
    echo "HTTP $code from $method $url: $(head -c 600 "$out")" >&2
    rm -f "$out"
    return 1
  fi
  cat "$out"
  rm -f "$out"
}
sb() { api "$1" "https://api.supabase.com/v1$2" "$SUPABASE_ACCESS_TOKEN" "${3:-}"; }
vc() { api "$1" "https://api.vercel.com$2" "$VERCEL_TOKEN" "${3:-}"; }

# ── Vercel project (needed first for the site address) ─────────────────────
say "Finding the Vercel project \"$VERCEL_PROJECT\""
TEAM_Q="" TEAM_SLUG=""
if ! PROJECT_JSON=$(vc GET "/v9/projects/$VERCEL_PROJECT" 2>/dev/null); then
  PROJECT_JSON=""
  for row in $(vc GET "/v2/teams?limit=50" | jq -r '.teams[] | "\(.id),\(.slug)"'); do
    if PROJECT_JSON=$(vc GET "/v9/projects/$VERCEL_PROJECT?teamId=${row%,*}" 2>/dev/null); then
      TEAM_Q="teamId=${row%,*}"
      TEAM_SLUG="${row#*,}"
      break
    fi
    PROJECT_JSON=""
  done
fi
[[ -n $PROJECT_JSON ]] || die "No Vercel project named \"$VERCEL_PROJECT\". Set VERCEL_PROJECT to its name."
VERCEL_ID=$(jq -r .id <<<"$PROJECT_JSON")
q() { [[ -n $TEAM_Q ]] && echo "${1}${TEAM_Q}" || true; }

if [[ -z ${SITE_URL:-} ]]; then
  DOMAINS=$(vc GET "/v9/projects/$VERCEL_ID/domains$(q '?')")
  DOMAIN=$(jq -r '[.domains[] | select(.redirect == null)] | (map(select(.name | endswith(".vercel.app") | not)) + .) | .[0].name // empty' <<<"$DOMAINS")
  SITE_URL="https://${DOMAIN:-$VERCEL_PROJECT.vercel.app}"
fi
SITE_URL="${SITE_URL%/}"
say "Site address: $SITE_URL"

# ── Supabase project ───────────────────────────────────────────────────────
say "Finding or creating the Supabase project \"$NAME\""
REF=$(sb GET /projects | jq -r --arg n "$NAME" '[.[] | select(.name == $n)][0].ref // empty')
if [[ -z $REF ]]; then
  ORG="${SUPABASE_ORG_ID:-$(sb GET /organizations | jq -r '.[0].id // empty')}"
  [[ -n $ORG ]] || die "Your Supabase account has no organization yet. Create one at supabase.com/dashboard."
  DB_PASS=$(openssl rand -base64 30 | tr -dc 'A-Za-z0-9' | head -c 32)
  BODY=$(jq -n --arg n "$NAME" --arg o "$ORG" --arg p "$DB_PASS" --arg r "$REGION" '{name:$n, organization_id:$o, db_pass:$p, region:$r}')
  REF=$(sb POST /projects "$BODY" | jq -r .ref)
  say "Created project $REF (database password is random; reset it in Supabase if you ever need it)"
fi

say "Waiting for the project to be ready"
for _ in $(seq 1 90); do
  STATUS=$(sb GET "/projects/$REF" | jq -r .status)
  [[ $STATUS == ACTIVE_HEALTHY ]] && break
  sleep 10
done
[[ $STATUS == ACTIVE_HEALTHY ]] || die "Project $REF is still $STATUS. Re-run in a few minutes."
SUPABASE_URL="https://$REF.supabase.co"

say "Creating tables, security rules and photo storage"
sb POST "/projects/$REF/database/query" "$(jq -n --rawfile s supabase/schema.sql '{query:$s}')" >/dev/null

say "Reading API keys"
KEYS=$(sb GET "/projects/$REF/api-keys?reveal=true")
ANON=$(jq -r '(map(select(.type == "publishable"))[0].api_key) // (map(select(.name == "anon"))[0].api_key) // empty' <<<"$KEYS")
SERVICE=$(jq -r '(map(select(.type == "secret"))[0].api_key) // (map(select(.name == "service_role"))[0].api_key) // empty' <<<"$KEYS")
[[ -n $ANON && -n $SERVICE ]] || die "Couldn't read the project's API keys."

# ── Supabase auth settings ─────────────────────────────────────────────────
say "Configuring sign-in (site address, redirects, email, providers)"
ALLOW="$SITE_URL/**,http://localhost:3000/**"
[[ -n $TEAM_SLUG ]] && ALLOW="$ALLOW,https://*-$TEAM_SLUG.vercel.app/**"
AUTH=$(jq -n --arg site "$SITE_URL" --arg allow "$ALLOW" '{
  site_url: $site,
  uri_allow_list: $allow,
  mailer_secure_email_change_enabled: true,
  password_min_length: 8
}')

if [[ -n ${GOOGLE_CLIENT_ID:-} && -n ${GOOGLE_CLIENT_SECRET:-} ]]; then
  AUTH=$(jq --arg id "$GOOGLE_CLIENT_ID" --arg s "$GOOGLE_CLIENT_SECRET" '. + {external_google_enabled:true, external_google_client_id:$id, external_google_secret:$s}' <<<"$AUTH")
  GOOGLE=on
fi

if [[ -n ${APPLE_SERVICES_ID:-} && -n ${APPLE_TEAM_ID:-} && -n ${APPLE_KEY_ID:-} && -n ${APPLE_PRIVATE_KEY:-} ]]; then
  # Apple wants a client secret JWT signed with the .p8 key (valid up to 6 months).
  APPLE_SECRET=$(node -e '
    const c = require("crypto");
    const b = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const now = Math.floor(Date.now() / 1000);
    const h = b({ alg: "ES256", kid: process.env.APPLE_KEY_ID });
    const p = b({ iss: process.env.APPLE_TEAM_ID, iat: now, exp: now + 180 * 86400, aud: "https://appleid.apple.com", sub: process.env.APPLE_SERVICES_ID });
    const sig = c.sign("sha256", Buffer.from(h + "." + p), { key: process.env.APPLE_PRIVATE_KEY.replace(/\\n/g, "\n"), dsaEncoding: "ieee-p1363" });
    process.stdout.write(h + "." + p + "." + sig.toString("base64url"));
  ')
  AUTH=$(jq --arg id "$APPLE_SERVICES_ID" --arg s "$APPLE_SECRET" '. + {external_apple_enabled:true, external_apple_client_id:$id, external_apple_secret:$s}' <<<"$AUTH")
  APPLE=on
fi
sb PATCH "/projects/$REF/config/auth" "$AUTH" >/dev/null

# ── Vercel environment variables + redeploy ────────────────────────────────
say "Saving keys to Vercel"
ENV=$(jq -n --arg url "$SUPABASE_URL" --arg anon "$ANON" --arg svc "$SERVICE" '[
  {key:"NEXT_PUBLIC_SUPABASE_URL", value:$url, type:"plain", target:["production","preview","development"]},
  {key:"NEXT_PUBLIC_SUPABASE_ANON_KEY", value:$anon, type:"plain", target:["production","preview","development"]},
  {key:"SUPABASE_SERVICE_ROLE_KEY", value:$svc, type:"sensitive", target:["production","preview"]}
]')
vc POST "/v10/projects/$VERCEL_ID/env?upsert=true$(q '&')" "$ENV" >/dev/null

say "Redeploying production so the keys take effect"
LAST=$(vc GET "/v6/deployments?projectId=$VERCEL_ID&target=production&limit=1$(q '&')" | jq -r '.deployments[0].uid // empty')
if [[ -n $LAST ]]; then
  vc POST "/v13/deployments?forceNew=1$(q '&')" "$(jq -n --arg n "$VERCEL_PROJECT" --arg d "$LAST" '{name:$n, deploymentId:$d, target:"production"}')" >/dev/null
else
  echo "  No earlier production deployment found; push to main to deploy."
fi

cat <<EOF

✓ Done.
  Site:              $SITE_URL
  Supabase project:  $REF ($SUPABASE_URL)
  Email sign-up:     on
  Google:            ${GOOGLE:-off — create an OAuth client with redirect URI $SUPABASE_URL/auth/v1/callback}
  Apple:             ${APPLE:-off}
EOF
