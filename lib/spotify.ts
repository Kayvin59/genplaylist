import { createClient } from "@/utils/supabase/client"

export async function getSpotifyAccessToken() {
  const supabase = createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session?.provider_token) {
    throw new Error("No Spotify access token available")
  }

  return session.provider_token
}

export async function createSpotifyPlaylist(name: string, description: string, trackUris: string[]) {
  try {
    const accessToken = await getSpotifyAccessToken()
    const supabase = createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user?.user_metadata?.provider_id) {
      throw new Error("Spotify user ID not found")
    }

    const spotifyUserId = user.user_metadata.provider_id

    // Create playlist
    const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${spotifyUserId}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        description,
        public: false,
      }),
    })

    if (!playlistResponse.ok) {
      throw new Error("Failed to create playlist")
    }

    const playlist = await playlistResponse.json()

    // Add tracks to playlist
    if (trackUris.length > 0) {
      await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: trackUris,
        }),
      })
    }

    return playlist
  } catch (error) {
    console.error("Error creating Spotify playlist:", error)
    throw error
  }
}
