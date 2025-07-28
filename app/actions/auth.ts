"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function signInWithSpotify() {
  const supabase = await createClient()


  const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`

  console.log("OAuth redirect URL:", redirectUrl)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "spotify",
    options: {
      redirectTo: redirectUrl,
      scopes: "user-read-email user-read-private playlist-modify-public playlist-modify-private",
    },
  })

  if (error) {
    console.error("Spotify OAuth Error:", error)
    throw new Error(`Authentication failed: ${error.message}`)
  }

  if (data.url) {
    // revalidatePath('/', 'layout')
    redirect(data.url)
  }
}

export async function signOut() {
  const supabase = await createClient()

  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error("Sign out error:", error)
    throw new Error(`Sign out failed: ${error.message}`)
  }

  revalidatePath("/", "layout")
  redirect("/")
}
