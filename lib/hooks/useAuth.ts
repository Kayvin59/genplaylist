"use client"

import { createClient } from "@/utils/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useEffect, useState } from "react"

interface SpotifyUserData {
  display_name?: string
  avatar_url?: string
  followers?: { total: number }
  country?: string
}

interface UseAuthReturn {
  user: User | null
  spotifyData: SpotifyUserData | null
  loading: boolean
  error: string | null
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null)
  const [spotifyData, setSpotifyData] = useState<SpotifyUserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser()

        if (userError) {
          setError(userError.message)
          return
        }

        setUser(user)

        if (user?.user_metadata) {
          setSpotifyData({
            display_name: user.user_metadata.full_name || user.user_metadata.name,
            avatar_url: user.user_metadata.avatar_url,
            followers: user.user_metadata.followers,
            country: user.user_metadata.country,
          })
        }
      } catch (err) {
        setError("Failed to fetch user data")
      } finally {
        setLoading(false)
      }
    }

    fetchUser()

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setUser(null)
        setSpotifyData(null)
      } else if (event === "SIGNED_IN" && session?.user) {
        setUser(session.user)
        if (session.user.user_metadata) {
          setSpotifyData({
            display_name: session.user.user_metadata.full_name || session.user.user_metadata.name,
            avatar_url: session.user.user_metadata.avatar_url,
            followers: session.user.user_metadata.followers,
            country: session.user.user_metadata.country,
          })
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return { user, spotifyData, loading, error }
}
