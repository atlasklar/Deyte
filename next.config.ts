import type { NextConfig } from "next";

const MEDIA = "https://d8j0ntlcm91z4.cloudfront.net";
/** This project's Supabase (auth, database, photos). Only it, not any Supabase project. */
const SUPABASE = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").origin;
  } catch {
    return "https://*.supabase.co";
  }
})();
const SUPABASE_WS = SUPABASE.replace(/^http/, "ws");
/** Where the browser may load things from. Anything else (an injected script, a hostile iframe) is blocked. */
const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://vercel.live",
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${SUPABASE} https://*.googleusercontent.com ${MEDIA}`,
  `media-src 'self' blob: ${MEDIA}`,
  "font-src 'self' data:",
  `connect-src 'self' ${SUPABASE} ${SUPABASE_WS} https://vercel.live ${MEDIA}`,
  "frame-src https://vercel.live",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  ...(SUPABASE.startsWith("https") ? ["upgrade-insecure-requests"] : []),
].join("; ");

const nextConfig: NextConfig = {
  // This app lives in a subfolder of a larger repo; trace files from here only.
  outputFileTracingRoot: __dirname,
  poweredByHeader: false,
  devIndicators: false,
  // The coaching playbook ships as plain Markdown, imported as a string.
  webpack(config) {
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "same-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
          ...(process.env.NODE_ENV === "production" ? [{ key: "Content-Security-Policy", value: CSP }] : []),
        ],
      },
    ];
  },
};

export default nextConfig;
