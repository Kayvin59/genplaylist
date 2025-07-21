"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

export async function signInWithSpotify() {
  const supabase = await createClient()

  const getBaseUrl = () => {
    // Check for explicit site URL (production & preview)
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL
    }

    // Check for Vercel URL (preview deployments)
    if (process.env.VERCEL_URL) {
      return `https://${process.env.VERCEL_URL}`
    }

    // Development fallback
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3000"
    }

    // Last resort fallback
    return "https://gen-playlist-git-dev-kayvin-team.vercel.app"
  }

  const baseUrl = getBaseUrl()

  console.log("🔗 OAuth redirect URL:", `${baseUrl}/auth/callback?next=/generate`)

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "spotify",
    options: {
      redirectTo: `${baseUrl}/auth/callback?next=/generate`,
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
