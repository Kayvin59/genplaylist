import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const next = searchParams.get("next") ?? "/generate"
  const error = searchParams.get("error")
  const errorCode = searchParams.get("error_code")
  const errorDescription = searchParams.get("error_description")

  // Handle OAuth errors
  if (error) {
    console.error("OAuth callback error:", { error, errorCode, errorDescription })

    // Handle email verification specifically
    if (errorCode === "provider_email_needs_verification") {
      return NextResponse.redirect(
        `${origin}/auth/error?message=${encodeURIComponent("Email verification required. Please check your email and click the confirmation link.")}`,
      )
    }

    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = await createClient()

    try {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (!exchangeError) {
        // Successful authentication - redirect to intended page
        const forwardedHost = request.headers.get("x-forwarded-host")
        const isLocalEnv = process.env.NODE_ENV === "development"

        if (isLocalEnv) {
          return NextResponse.redirect(`${origin}${next}`)
        } else if (forwardedHost) {
          return NextResponse.redirect(`https://${forwardedHost}${next}`)
        } else {
          return NextResponse.redirect(`${origin}${next}`)
        }
      } else {
        console.error("Code exchange error:", exchangeError)

        // Handle specific Supabase auth errors
        if (exchangeError.message.includes("email") && exchangeError.message.includes("confirm")) {
          return NextResponse.redirect(
            `${origin}/auth/error?message=${encodeURIComponent("Email verification required. Please check your email.")}`,
          )
        }

        return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(exchangeError.message)}`)
      }
    } catch (err) {
      console.error("Unexpected error during code exchange:", err)
      return NextResponse.redirect(`${origin}/auth/error?message=Authentication failed`)
    }
  }

  // No code parameter - redirect to home with error
  return NextResponse.redirect(`${origin}/auth/error?message=No authorization code received`)
}
