"use server"

import { playlistRateLimit } from "@/lib/security"
import { CreatePlaylistParams, PlaylistResult, SpotifyTrack } from "@/types"
import { createClient } from "@/utils/supabase/server"


export async function fetchAlbumTracks(
  artist: string,
  album: string,
): Promise<{ success: boolean; tracks?: SpotifyTrack[]; error?: string; needsAuth?: boolean }> {
  const supabase = await createClient()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session?.provider_token) {
    return { success: false, error: "Spotify access token not available.", needsAuth: true }
  }

  const accessToken = session.provider_token

  try {
    const sanitizedAlbum = album.trim().replace(/[^\w\s-]/g, "")
    const sanitizedArtist = artist.trim().replace(/[^\w\s-]/g, "")
    const searchQuery = `album:"${sanitizedAlbum}" artist:"${sanitizedArtist}"`

    const searchResponse = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=album&limit=1`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!searchResponse.ok) {
      if (searchResponse.status === 401) {
        return { success: false, error: "Spotify session expired.", needsAuth: true }
      }
      return { success: false, error: `Spotify search failed (HTTP ${searchResponse.status})` }
    }

    const searchResult = await searchResponse.json()
    const spotifyAlbum = searchResult.albums?.items?.[0]

    if (!spotifyAlbum) {
      return { success: true, tracks: [] }
    }

    const albumTracksResponse = await fetch(
      `https://api.spotify.com/v1/albums/${spotifyAlbum.id}/tracks?limit=50`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )

    if (!albumTracksResponse.ok) {
      return { success: false, error: "Failed to fetch album tracks" }
    }

    const albumTracksData = await albumTracksResponse.json()
    const tracks: SpotifyTrack[] = (albumTracksData.items || []).map((track: any) => ({
      title: track.name,
      artist: track.artists?.map((a: any) => a.name).join(", ") || artist,
      album: spotifyAlbum.name,
    }))

    return { success: true, tracks }
  } catch (error) {
    console.error(`Failed to fetch tracks for album: ${album} by ${artist}`, error)
    return { success: false, error: "Failed to fetch album tracks" }
  }
}


export async function createPlaylist({ name, description, tracks, albums }: CreatePlaylistParams): Promise<PlaylistResult> {
  // Authentication first — reject unauthenticated requests before consuming rate limit tokens
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

  // Rate limiting (5 req/min per user — keyed by user ID for authenticated actions)
  const { success: allowed, reset } = await playlistRateLimit.limit(user.id)
  if (!allowed) {
    return {
      success: false,
      error: `Rate limit exceeded. Try again in ${Math.ceil((reset - Date.now()) / 1000)}s`,
    }
  }

  // Credit check — users need credits to create playlists
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("credits_remaining")
    .eq("id", user.id)
    .single()

  if (profileError || !profile) {
    return { success: false, error: "Profile not found. Please try logging in again." }
  }

  if (profile.credits_remaining <= 0) {
    return { success: false, error: "No credits remaining. Purchase more credits to create playlists." }
  }

  // Input Validation
  if (!name?.trim()) {
    return { success: false, error: "Playlist name is required" }
  }

  if (!tracks?.length && !albums?.length) {
    return { success: false, error: "No tracks or albums selected" }
  }

  // Sanitize and validate inputs
  const sanitizedName = name.trim().slice(0, 100) // Spotify limit
  const sanitizedDescription = description?.trim().slice(0, 300) ?? "" // Spotify limit

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

  if (validTracks.length === 0 && !albums?.length) {
    return { success: false, error: "No valid tracks or albums found" }
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

    // Search for individual tracks
    const trackUris: string[] = []
    const batchSize = 10

    for (let i = 0; i < validTracks.length; i += batchSize) {
      const batch = validTracks.slice(i, i + batchSize)

      await Promise.all(
        batch.map(async (track) => {
          try {
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

      if (i + batchSize < validTracks.length) {
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
    }

    // Search for album tracks
    if (albums?.length) {
      for (const album of albums) {
        try {
          const sanitizedAlbum = album.album.trim().replace(/[^\w\s-]/g, "")
          const sanitizedArtist = album.artist.trim().replace(/[^\w\s-]/g, "")
          const searchQuery = `album:"${sanitizedAlbum}" artist:"${sanitizedArtist}"`

          const searchResponse = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQuery)}&type=album&limit=1`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            },
          )

          if (searchResponse.ok) {
            const searchResult = await searchResponse.json()
            const spotifyAlbum = searchResult.albums?.items?.[0]

            if (spotifyAlbum) {
              // Fetch album tracks
              const albumTracksResponse = await fetch(
                `https://api.spotify.com/v1/albums/${spotifyAlbum.id}/tracks?limit=50`,
                {
                  headers: { Authorization: `Bearer ${accessToken}` },
                },
              )

              if (albumTracksResponse.ok) {
                const albumTracksData = await albumTracksResponse.json()
                for (const track of albumTracksData.items || []) {
                  if (track.uri) {
                    trackUris.push(track.uri)
                  }
                }
              }
            }
          }

          // Rate limiting between album searches
          await new Promise((resolve) => setTimeout(resolve, 100))
        } catch (error) {
          console.error(`Failed to search for album: ${album.album} by ${album.artist}`, error)
        }
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

    // Deduct one credit and log playlist to history
    await Promise.all([
      supabase
        .from("profiles")
        .update({
          credits_remaining: profile.credits_remaining - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id),
      supabase.from("playlists").insert({
        user_id: user.id,
        spotify_playlist_id: playlist.id,
        source_url: description || null,
        playlist_name: sanitizedName,
        track_count: trackUris.length,
      }),
    ])

    return {
      success: true,
      playlistId: playlist.id,
      playlistUrl: playlist.external_urls.spotify,
      tracksAdded: trackUris.length,
      totalTracks: validTracks.length + (albums?.length || 0),
    }
  } catch (error) {
    console.error("Error creating playlist:", error)
    return {
      success: false,
      error: `Failed to create playlist: ${error instanceof Error ? error.message : "Unknown error"}`,
    }
  }
}
