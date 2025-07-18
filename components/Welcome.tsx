"use client"

import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { WelcomeProps } from "@/types"
import { UserIcon } from "lucide-react"


export default function Welcome({ user, spotifyData }: WelcomeProps) {
  const displayName = spotifyData?.display_name || user.email?.split("@")[0] || "User"

  return (
    <Card className="w-full max-w-md mx-auto mb-12 border border-gray-500">
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
        <Button onClick={() => signOut()} className="w-full max-w-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-200">
          Sign out
        </Button>
      </CardContent>
    </Card>
  )
}
