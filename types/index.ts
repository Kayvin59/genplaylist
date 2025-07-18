import type { User } from "@supabase/supabase-js";

export interface ScrapedData {
  title: string;
  links: string[];
}

// Spotify
export interface Track {
  title: string
  artist: string
}

export interface CreatePlaylistParams {
  name: string
  description: string
  tracks: Track[]
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


export interface Track {
  title: string
  artist: string
  selected: boolean
}

export interface ScrapedDataTableProps {
  data: {
    title: string
    links: string[]
  }
}


export interface SpotifyUserData {
  display_name?: string
  avatar_url?: string
  followers?: { total: number }
  country?: string
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