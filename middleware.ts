import { updateSession } from "@/utils/supabase/middleware";
import { type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  
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

  return response;
}

export const config = {
  matcher: [
    "/auth/callback",
    "/generate",
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};