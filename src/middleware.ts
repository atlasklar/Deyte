import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { cloudReady, SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/** Keeps the Supabase session fresh and sends signed-out visitors to /login. */
export async function middleware(req: NextRequest) {
  if (!cloudReady) return NextResponse.next();
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

  const path = req.nextUrl.pathname;
  const protectedPath = path.startsWith("/app") || path.startsWith("/onboarding");
  if (!user && protectedPath) {
    const to = req.nextUrl.clone();
    to.pathname = "/login";
    to.search = "";
    return NextResponse.redirect(to);
  }
  if (user && (path === "/login" || path === "/signup")) {
    const to = req.nextUrl.clone();
    to.pathname = "/app";
    to.search = "";
    return NextResponse.redirect(to);
  }
  return res;
}

export const config = {
  matcher: ["/app/:path*", "/onboarding/:path*", "/login", "/signup", "/auth/reset"],
};
