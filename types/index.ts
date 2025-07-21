import type { User } from "@supabase/supabase-js";

// Spotify
export interface SpotifyTrack {
  title: string
  artist: string
  album?: string
}

export interface UITrack extends SpotifyTrack {
  selected: boolean
}

export interface Album {
  artist: string
  album: string
  year?: number
  trackCount?: number
}

export interface CreatePlaylistParams {
  name: string
  description: string
  tracks: UITrack[]
}

export interface PlaylistResult {
  success: boolean
  error?: string
  needsAuth?: boolean
  playlistId?: string
  playlistUrl?: string
  tracksAdded?: number
  totalTracks?: number
}

export interface SpotifyUserData {
  display_name?: string
  avatar_url?: string
  followers?: { total: number }
  country?: string
}

export interface ScrapedDataTableProps {
  data: {
    title: string
    tracks: SpotifyTrack[]
    albums: Album[]
    confidence: number
    contentType: string
  }
}

export interface ScrapedData {
  title: string,
  links: []
}

export interface WelcomeProps {
  user: User
  spotifyData: SpotifyUserData
}

export interface UseAuthReturn {
  user: User | null
  spotifyData: SpotifyUserData | null
  loading: boolean
  error: string | null
}

export interface rawMusicScraperResult {
  success: boolean
  error?: string
  errorType?: "403_blocked" | "quota_exceeded" | "rate_limit" | "validation" | "general" // ✅ NEW: error types
  data?: {
    title: string
    tracks: SpotifyTrack[]
    albums: Album[]
    confidence: number
    isMusicContent: boolean
    contentType: string
  }
}
