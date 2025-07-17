"use client"

import { signInWithSpotify } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { Loader2, Music } from "lucide-react"
import { useTransition } from "react"

export default function LoginButton() {
  const [isPending, startTransition] = useTransition()

  const handleLogin = () => {
    startTransition(async () => {
      try {
        await signInWithSpotify()
      } catch (error) {
        console.error("Login failed:", error)
      }
    })
  }

  return (
    <Card className="w-full max-w-md mx-auto border border-gray-500">
      <CardHeader className="text-center">
        <CardDescription className="text-gray-500">Connect your Spotify account to generate playlists from any URL</CardDescription>
      </CardHeader>
      <CardContent>
        <Button
          className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3"
          onClick={handleLogin}
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connecting to Spotify...
            </>
          ) : (
            <>
              <Music className="mr-2 h-4 w-4" />
              Sign in with Spotify
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
