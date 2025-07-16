"use client"

import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { User } from "@supabase/supabase-js"
import { UserIcon } from "lucide-react"

interface SpotifyUserData {
  display_name?: string
  avatar_url?: string
  followers?: { total: number }
  country?: string
}

interface WelcomeProps {
  user: User
  spotifyData: SpotifyUserData
}

export default function Welcome({ user, spotifyData }: WelcomeProps) {
  const displayName = spotifyData?.display_name || user.email?.split("@")[0] || "User"

  return (
    <Card className="w-full max-w-md mx-auto mb-5">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center mb-4">
          {spotifyData?.avatar_url ? (
            <img
              src={spotifyData.avatar_url || "/placeholder.svg"}
              alt="Profile"
              className="w-16 h-16 rounded-full border-2 border-green-500"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-green-500 flex items-center justify-center">
              <UserIcon className="w-8 h-8 text-white" />
            </div>
          )}
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          Welcome, {displayName}!
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Button onClick={() => signOut()} variant="outline" className="w-full">
          Sign out
        </Button>
      </CardContent>
    </Card>
  )
}
