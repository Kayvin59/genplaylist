import { updateSession } from "@/utils/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";

// Security headers applied to all matched routes
function applySecurityHeaders(response: NextResponse, request: NextRequest) {
  // --- Content Security Policy ---
  // 'unsafe-inline' is needed for Next.js inline styles and scripts in v14.
  // When upgrading to Next.js 15+, replace with nonce-based CSP.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  // Vercel preview/dev deployments inject a toolbar from vercel.live
  const isProduction = process.env.VERCEL_ENV === "production";
  const vercelLive = isProduction
    ? ""
    : " https://vercel.live https://*.vercel.live wss://ws-us3.pusher.com";

  const cspDirectives = [
    `default-src 'self'`,
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com https://vitals.vercel-insights.com${vercelLive}`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com${vercelLive}`,
    `font-src 'self' https://fonts.gstatic.com${vercelLive}`,
    `img-src 'self' data: blob:${vercelLive}`,
    `connect-src 'self' ${supabaseUrl} https://va.vercel-scripts.com https://vitals.vercel-insights.com${vercelLive}`,
    `frame-src https://open.spotify.com${vercelLive}`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
  ];
  response.headers.set(
    "Content-Security-Policy",
    cspDirectives.join("; ")
  );

  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=63072000; includeSubDomains; preload"
  );
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), browsing-topics=()"
  );
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");

  // Production cookie security
  if (process.env.NODE_ENV === "production") {
    const supabaseCookie = request.cookies.get(
      `sb-${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID}-auth-token`
    );

    if (supabaseCookie) {
      response.cookies.set({
        name: supabaseCookie.name,
        value: supabaseCookie.value,
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
      });
    }
  }
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protected routes: full session check + security headers
  if (
    pathname.startsWith("/generate") ||
    pathname.startsWith("/account") ||
    pathname.startsWith("/auth")
  ) {
    const response = await updateSession(request);
    applySecurityHeaders(response, request);
    return response;
  }

  // Public routes: security headers only, skip Supabase session check (faster TTFB)
  const response = NextResponse.next();
  applySecurityHeaders(response, request);
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};