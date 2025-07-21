"use server"

import { CreatePlaylistParams, PlaylistResult } from "@/types"
import { createClient } from "@/utils/supabase/server"


export async function createPlaylist({ name, description, tracks }: CreatePlaylistParams): Promise<PlaylistResult> {
  // Input Validation
  if (!name?.trim()) {
    return { success: false, error: "Playlist name is required" }
  }

  if (!tracks?.length) {
    return { success: false, error: "No tracks selected" }
  }

  // Sanitize and validate inputs
  const sanitizedName = name.trim().slice(0, 100) // Spotify limit
  const sanitizedDescription = description.trim().slice(0, 300) // Spotify limit

  if (sanitizedName.length < 1) {
    return { success: false, error: "Playlist name cannot be empty" }
  }

  if (tracks.length > 10000) {
    return { success: false, error: "Too many tracks selected (max 10,000)" }
  }

  // Validate track data
  const validTracks = tracks.filter(
    (track) => track?.title?.trim() && track?.artist?.trim() && track.title.length <= 200 && track.artist.length <= 200,
  )

  if (validTracks.length === 0) {
    return { success: false, error: "No valid tracks found" }
  }

  const supabase = await createClient()

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
    // Create playlist with sanitized data
    const playlistResponse = await fetch(`https://api.spotify.com/v1/users/${spotifyUserId}/playlists`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: sanitizedName,
        description: sanitizedDescription,
        public: false,
      }),
    })

    if (!playlistResponse.ok) {
      const error = await playlistResponse.json()

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

    // Search for tracks with rate limiting
    const trackUris: string[] = []
    const batchSize = 10

    for (let i = 0; i < validTracks.length; i += batchSize) {
      const batch = validTracks.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (track) => {
          try {
            // Sanitize search query
            const sanitizedTitle = track.title.trim().replace(/[^\w\s-]/g, "")
            const sanitizedArtist = track.artist.trim().replace(/[^\w\s-]/g, "")

            const searchQuery = `track:"${sanitizedTitle}" artist:"${sanitizedArtist}"`

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
        }),
      )

      // Rate limiting - wait between batches
      if (i + batchSize < validTracks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Add tracks to playlist in batches
    if (trackUris.length > 0) {
      const addBatchSize = 100 // Spotify limit

      for (let i = 0; i < trackUris.length; i += addBatchSize) {
        const batch = trackUris.slice(i, i + addBatchSize)

        const addTracksResponse = await fetch(`https://api.spotify.com/v1/playlists/${playlist.id}/tracks`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            uris: batch,
          }),
        })

        if (!addTracksResponse.ok) {
          const error = await addTracksResponse.json()
          console.error("Failed to add tracks batch:", error)
        }
      }
    }

    return {
      success: true,
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls.spotify,
      tracksAdded: trackUris.length,
      totalTracks: validTracks.length,
    }
  } catch (error) {
    console.error("Error creating playlist:", error)
    return {
      success: false,
      error: `Failed to create playlist: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
