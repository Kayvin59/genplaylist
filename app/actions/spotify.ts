"use server"

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation"

interface Track {
  title: string
  artist: string
}

interface CreatePlaylistParams {
  name: string
  description: string
  tracks: Track[]
}

export async function createPlaylist({ name, description, tracks }: CreatePlaylistParams) {
  const supabase = await createClient()

  // Get current user and session
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/auth/login")
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.provider_token) {
    throw new Error("No Spotify access token available")
  }

  const accessToken = session.provider_token
  const spotifyUserId = user.user_metadata?.provider_id

  if (!spotifyUserId) {
    throw new Error("Spotify user ID not found")
  }

  try {
    // Step 1: Create empty playlist
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
      const error = await playlistResponse.json()
      throw new Error(`Failed to create playlist: ${error.error?.message || "Unknown error"}`)
    }

    const playlist = await playlistResponse.json()

    // Step 2: Search for tracks and collect URIs
    const trackUris: string[] = []

    for (const track of tracks) {
      try {
        // Search for the track
        const searchQuery = `track:"${track.title}" artist:"${track.artist}"`
        const searchResponse = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=track&limit=1`,
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        )

        if (searchResponse.ok) {
          const searchResult = await searchResponse.json()
          if (searchResult.tracks?.items?.length > 0) {
            trackUris.push(searchResult.tracks.items[0].uri)
          }
        }
      } catch (error) {
        console.error(`Failed to search for track: ${track.title} by ${track.artist}`, error)
      }
    }

    // Step 3: Add tracks to playlist (if any found)
    if (trackUris.length > 0) {
      const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uris: trackUris,
        }),
      })

      if (!addTracksResponse.ok) {
        const error = await addTracksResponse.json()
        console.error("Failed to add tracks:", error)
      }
    }

    return {
      success: true,
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls.spotify,
      tracksAdded: trackUris.length,
      totalTracks: tracks.length,
    }
  } catch (error) {
    console.error("Error creating playlist:", error)
    throw error
  }
}
