import Welcome from "@/components/Welcome"
import MusicUrlInput from "@/components/music-url-input"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

export default async function GeneratePage() {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/auth/login")
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
