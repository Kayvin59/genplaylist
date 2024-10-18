"use client"

import { SignIn, SignOutButton, useUser } from "@clerk/nextjs"

export default function Welcome() {
    const { user, isSignedIn } = useUser()

    if (!isSignedIn) {
      return (
        <>
          <SignIn afterSignInUrl="/generate" />
        </>
      )
    }

    return (
        <div>
          <p>Welcome {user.firstName} !</p>
          <SignOutButton>
            <button>Sign out</button>
          </SignOutButton>
        </div>
    )
}