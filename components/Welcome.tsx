'use client'

import { signOut } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { createClient } from '@/utils/supabase/client'
import { Session, User } from '@supabase/supabase-js'
import { useState } from 'react'
import LoginButton from './LoginButton'

interface WelcomeProps {
  user: User | null
  session: Session | null
}

export default function Welcome({ user: serverUser, session: serverSession }: WelcomeProps) {
  const [user, setUser] = useState<User | null>(serverUser)
  const [session, setSession] = useState<Session | null>(serverSession)
  const supabase = createClient()

/*   
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user)
        setSession(session)
      } else {
        setUser(null)
        setSession(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])
  */

  if (!user || !session) {
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
            <h3 className="text-lg font-semibold">Session Information</h3>
            <p><strong>Access Token:</strong> {session.access_token.slice(0, 10)}...{session.access_token.slice(-10)}</p>
            <p><strong>Token Type:</strong> {session.token_type}</p>
            <p><strong>Expires At:</strong> {session.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : ''}</p>
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