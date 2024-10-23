import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {

  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/generate'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.VERCEL_URL}`
  console.log('siteUrl-route', siteUrl)
  if (code) {
    const cookieStore = cookies()
    const supabase = createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      return NextResponse.redirect(`${siteUrl}${next}`)
    }
  }

  console.log('Redirecting to', siteUrl)
  return NextResponse.redirect(`${siteUrl}`)
}