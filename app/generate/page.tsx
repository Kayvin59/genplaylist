import Welcome from "@/components/Welcome"
import MusicUrlInput from "@/components/MusicUrlInput"
import { createClient } from "@/utils/supabase/server"
import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Generate Playlist",
  description:
    "Paste a URL from any music blog, review, or Reddit thread and generate a Spotify playlist instantly.",
}

export default async function GeneratePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/")
  }

  // Extract Spotify data server-side
  const spotifyData = {
    display_name: user.user_metadata?.full_name || user.user_metadata?.name,
    avatar_url: user.user_metadata?.avatar_url,
    followers: user.user_metadata?.followers,
    country: user.user_metadata?.country,
  }

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <Welcome user={user} spotifyData={spotifyData} />
      <MusicUrlInput />
    </div>
  )
}
