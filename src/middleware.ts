import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cloudReady, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/** Keeps the Supabase session fresh and sends signed-out visitors to /login. */
export async function middleware(req: NextRequest) {
  if (!cloudReady) return NextResponse.next();
  const path = req.nextUrl.pathname;
  const protectedPath = path.startsWith("/app") || path.startsWith("/onboarding");

  // No session cookie means signed out: answer right away instead of asking
  // Supabase first (keeps the homepage instant for new visitors).
  const hasSession = req.cookies.getAll().some((c) => c.name.startsWith("sb-") && /-auth-token(\.\d+)?$/.test(c.name));
  if (!hasSession) {
    if (!protectedPath) return NextResponse.next();
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }

  let res = NextResponse.next({ request: req });
  const sb = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll: (list) => {
        for (const { name, value } of list) req.cookies.set(name, value);
        res = NextResponse.next({ request: req });
        for (const { name, value, options } of list) res.cookies.set(name, value, options);
      },
    },
  });
  const {
    data: { user },
  } = await sb.auth.getUser();

  // A redirect must carry the refreshed session cookies. Otherwise the new
  // tokens are lost, the old refresh token is already spent, and the person
  // gets signed out a moment later (e.g. after reopening Safari).
  const redirect = (pathname: string) => {
    const to = req.nextUrl.clone();
    to.pathname = pathname;
    to.search = "";
    const out = NextResponse.redirect(to);
    for (const c of res.cookies.getAll()) out.cookies.set(c);
    return out;
  };

  if (!user && protectedPath) return redirect("/login");
  if (user && (path === "/login" || path === "/signup")) return redirect("/app");
  return res;
}

export const config = {
  // "/" too, so opening the site keeps the session fresh (the landing page itself stays public).
  matcher: ["/", "/app/:path*", "/onboarding/:path*", "/login", "/signup", "/auth/reset"],
};
