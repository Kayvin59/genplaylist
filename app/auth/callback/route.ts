import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get("code")
  const error = searchParams.get("error")

  console.log("🔄 CALLBACK HIT:", {
    url: request.url,
    hasCode: !!code,
    hasError: !!error,
  })

  if (error) {
    return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(error)}`)
  }

  if (code) {
    const supabase = await createClient()
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (!exchangeError) {
      return NextResponse.redirect(`${origin}/generate`)
    } else {
      return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent(exchangeError.message)}`)
    }
  }

  return NextResponse.redirect(`${origin}/auth/error?message=No authorization code received`)
}
