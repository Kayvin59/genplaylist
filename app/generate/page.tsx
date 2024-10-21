import Welcome from '@/components/Welcome'
import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export default async function GeneratePage() {
  const cookieStore = cookies()
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <>
      <div>Generate Page</div>
      <Welcome user={user} />
    </>
  )
}