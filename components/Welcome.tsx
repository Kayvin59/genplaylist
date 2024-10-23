'use client'

import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { createClient } from '@/utils/supabase/client'
import { User } from '@supabase/supabase-js'
import { useEffect, useState } from 'react'
import LoginButton from './LoginButton'


export default function Welcome() {
  const [user, setUser] = useState<User | null>(null)
  const supabase = createClient()

  // Add loading indicator + Supabase Session
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }

    fetchUser()
  }, [supabase])

  if (!user) {
    return <LoginButton />
  }

  return (
    <div>
      <p>Welcome, {user.user_metadata.full_name || user.email}!</p>
      <div className="space-y-4">
          <div>
            <h3 className="text-lg font-semibold">User Information </h3>
            <p><strong>User ID:</strong> {user.identities && user.identities[0].id}</p>
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>Last Sign In:</strong> {new Date(user.last_sign_in_at || '').toLocaleString()}</p>
          </div>
        </div>
      <Button onClick={() => signOut()}>Sign out</Button>
    </div>
  )
}