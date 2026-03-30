import GenerateClient from "@/components/generate-client"
import Welcome from "@/components/Welcome"
import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"
import { Suspense } from "react"

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

  // Fetch credits from profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('credits_remaining')
    .eq('id', user.id)
    .single()

  const initialCredits = profile?.credits_remaining ?? 0

  return (
    <div className="w-full flex flex-col items-center justify-center">
      <Welcome user={user} spotifyData={spotifyData} />
      <Suspense>
        <GenerateClient initialCredits={initialCredits} />
      </Suspense>
    </div>
  )
}
