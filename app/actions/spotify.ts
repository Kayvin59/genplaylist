"use server"

import { CreatePlaylistParams, PlaylistResult } from "@/types"
import { createClient } from "@/utils/supabase/server"

export async function createPlaylist({ name, description, tracks }: CreatePlaylistParams): Promise<PlaylistResult> {
  const supabase = await createClient()

// Get current user, session and structured response
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      success: false,
      error: "Authentication required",
      needsAuth: true,
    }
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.provider_token) {
    return {
      success: false,
      error: "Spotify access token not available. Please reconnect your account.",
      needsAuth: true,
    }
  }

  const accessToken = session.provider_token
  const spotifyUserId = user.user_metadata?.provider_id

  if (!spotifyUserId) {
    return {
      success: false,
      error: "Spotify user ID not found. Please reconnect your account.",
      needsAuth: true,
    }
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

      // Handle token expiration
      if (playlistResponse.status === 401) {
        return {
          success: false,
          error: "Spotify session expired. Please reconnect your account.",
          needsAuth: true,
        }
      }

      return {
        success: false,
        error: `Failed to create playlist: ${error.error?.message || "Unknown error"}`,
      }
    }

    const playlist = await playlistResponse.json()

    // Step 2: Search for tracks and collect URIs
    const trackUris: string[] = []

    for (const track of tracks) {
      try {
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
    return {
      success: false,
      error: `Failed to create playlist: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
