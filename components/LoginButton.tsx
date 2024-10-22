'use client'

import { signInWithSpotify } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Loader2 } from 'lucide-react'
import { useTransition } from 'react'

export default function LoginButton() {
  const [isPending, startTransition] = useTransition()

  const handleLogin = () => {
    startTransition(() => {
      signInWithSpotify()
    })
  }

  return (
    <Button className="text-lg font-semibold p-5" onClick={handleLogin} disabled={isPending}>
      {isPending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Connecting...
        </>
      ) : (
        'Sign in with Spotify'
      )}
    </Button>
  )
}