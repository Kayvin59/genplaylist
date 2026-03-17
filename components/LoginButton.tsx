"use client"

import { signInWithSpotify } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
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
    <Button
      className="bg-[#1DB954] hover:bg-[#1aa34a] text-white font-semibold px-8 py-3 h-12 text-base transition-colors"
      onClick={handleLogin}
      disabled={isPending}
    >
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        <>
          <Music className="mr-2 h-4 w-4" />
          Sign in with Spotify
        </>
      )}
    </Button>
  )
}
