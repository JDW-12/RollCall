import { NextResponse, type NextRequest } from "next/server";
import { canonicalHost, SESSION_DAYS } from "@/lib/canonical";

/**
 * Keeps people signed in. Old deployment URLs forward to the one production address (a sign-in lives
 * on one host), and each page visit pushes the sign-in cookie's expiry out again, so anyone who uses
 * the app now and then never gets signed out. The server-side session is extended in getCurrentUser.
 */
export function proxy(request: NextRequest) {
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? request.nextUrl.host;
  const target = canonicalHost(
    { host, pathname: request.nextUrl.pathname },
    { VERCEL_ENV: process.env.VERCEL_ENV, VERCEL_PROJECT_PRODUCTION_URL: process.env.VERCEL_PROJECT_PRODUCTION_URL },
  );
  if (target) {
    const url = request.nextUrl.clone();
    url.host = target;
    url.protocol = "https";
    url.port = "";
    return NextResponse.redirect(url, 308);
  }

  const res = NextResponse.next();
  const token = request.cookies.get("rc_session")?.value;
  if (token && request.method === "GET") {
    res.cookies.set("rc_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_DAYS * 86_400,
    });
  }
  return res;
}

export const config = {
  // Pages only: not the API, not static files, images or the icons.
  matcher: ["/((?!api/|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest.webmanifest|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt|xml)$).*)"],
};
