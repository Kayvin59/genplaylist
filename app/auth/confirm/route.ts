import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type")
  const next = searchParams.get("next") ?? "/generate"

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({
      type: type as any,
      token_hash,
    })

    if (!error) {
      console.log('Email confirmed successfully')
      return NextResponse.redirect(`${origin}${next}`)
    } else {
      console.error("Email confirmation error:", error)
      return NextResponse.redirect(
        `${origin}/auth/error?message=${encodeURIComponent("Email confirmation failed. Please try again.")}`,
      )
    }
  }

  // Invalid confirmation link
  return NextResponse.redirect(`${origin}/auth/error?message=${encodeURIComponent("Invalid confirmation link.")}`)
}
