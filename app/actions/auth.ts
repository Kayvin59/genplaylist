'use server'

import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export async function signInWithSpotify() {
  const cookieStore = cookies()
  const supabase = createClient()

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.VERCEL_URL}` || 'http://localhost:3000'

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'spotify',
    options: {
      redirectTo: `${siteUrl}/auth/callback?next=/generate`,
    },
  })

  if (error) {
    console.error('Error:', error)
    return { error: error.message }
  }

  if (data.url) {
    revalidatePath('/', 'layout')
    redirect(data.url)
  }
}

export async function signOut() {
  const cookieStore = cookies()
  const supabase = createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error:', error)
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  redirect('/')
}