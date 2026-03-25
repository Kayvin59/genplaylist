"use server"

import { createClient } from "@/utils/supabase/server"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

export async function signInWithSpotify() {
  const supabase = await createClient()

  const getBaseUrl = async () => {
    // Fallback: explicit site URL (most trusted)
    if (process.env.NEXT_PUBLIC_SITE_URL) {
      return process.env.NEXT_PUBLIC_SITE_URL
    }

    // Fallback: localhost in development
    if (process.env.NODE_ENV === "development") {
      return "http://localhost:3000"
    }

    // Fallback: Vercel auto-provided URL
    if (process.env.VERCEL_URL) {
      const url = `https://${process.env.VERCEL_URL}`
      return url
    }

    // Use request host only if it matches a known trusted domain
    const headersList = await headers()
    const host = headersList.get("host")
    const trustedHosts = ["gen-playlist.vercel.app", "localhost:3000"]
    if (host && trustedHosts.some((trusted) => host === trusted || host.endsWith(`.${trusted}`))) {
      const proto = headersList.get("x-forwarded-proto") || "https"
      return `${proto}://${host}`
    }

    console.warn("No trusted URL source found, using hardcoded fallback")
    return "https://gen-playlist.vercel.app"
  }

  const baseUrl = await getBaseUrl()

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
    redirect(data.url)
  }

  return
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