'use client'

import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import { useState } from 'react'
import LoginButton from './LoginButton'

interface WelcomeProps {
  user: User | null
}

export default function Welcome({ user: serverUser }: WelcomeProps) {
  const [user, setUser] = useState<User | null>(serverUser)
  const supabase = createClient()

  if (!user) {
    return <LoginButton />
  }

  return (
    <div>
      <p>Welcome, {user.user_metadata.full_name || user.email}!</p>
      <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">User Information</h3>
            <p><strong>User ID:</strong> {user.id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Last Sign In:</strong> {new Date(user.last_sign_in_at || '').toLocaleString()}</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">User Metadata</h3>
            <pre className="bg-gray-100 p-2 rounded-md overflow-x-auto">
              {JSON.stringify(user.user_metadata, null, 2)}
            </pre>
          </div>
        </div>
      <Button onClick={() => signOut()}>Sign out</Button>
    </div>
  )
}