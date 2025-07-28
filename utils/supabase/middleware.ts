import { createServerClient } from "@supabase/ssr"
import { type NextRequest, NextResponse } from "next/server"

export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // The request and response cookies need to be updated
          // in the same way.
          cookiesToSet.forEach(({ name, value, options }) => {
            // Pass a single object to request.cookies.set
            request.cookies.set({ name, value, ...options })
            response.cookies.set({ name, value, ...options })
          })
        },
      },
    },
  )

  // IMPORTANT: The `auth.getUser()` method must be called to refresh the session.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // If the user is not logged in and is trying to access a protected route,
  // redirect them to the home page.
  if (!user && request.nextUrl.pathname.startsWith("/generate")) {
    const url = new URL("/", request.url)
    return NextResponse.redirect(url)
  }

  return response
}
