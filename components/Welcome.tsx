"use client"

import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { WelcomeProps } from "@/types"
import { LogOut, UserIcon } from "lucide-react"
import Image from "next/image"

export default function Welcome({ user, spotifyData }: WelcomeProps) {
  const displayName = spotifyData?.display_name || user.email?.split("@")[0] || "User"

  return (
    <div className="w-full max-w-4xl mx-auto mb-8 flex items-center justify-between px-1">
      <div className="flex items-center gap-3">
        {spotifyData?.avatar_url ? (
          <Image
            src={spotifyData.avatar_url}
            alt="Profile"
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center">
            <UserIcon className="w-4 h-4 text-muted-foreground" />
          </div>
        )}
        <span className="text-sm text-foreground font-medium">{displayName}</span>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => signOut()}
        className="text-muted-foreground hover:text-foreground transition-colors"
      >
        <LogOut className="mr-1.5 h-3.5 w-3.5" />
        Sign out
      </Button>
    </div>
  )
}
