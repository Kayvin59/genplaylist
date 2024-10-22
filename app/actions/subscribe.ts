'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { z } from 'zod'

const schema = z.object({
  email: z.string().email('Invalid email address'),
})

async function saveEmail(email: string) {
  const cookieStore = cookies()
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("EarlyUsers")
      .insert({ email })
      .select()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error("Error saving email:", error)
    throw error
  }
}

export async function subscribeAction(formData: FormData) {
  const validatedFields = schema.safeParse({
    email: formData.get('email'),
  })

  if (!validatedFields.success) {
    return { error: validatedFields.error.flatten().fieldErrors }
  }

  const { email } = validatedFields.data

  try {
    const result = await saveEmail(email)
    return result
  } catch (error) {
    console.error('Error:', error)
    return { error: 'Failed to subscribe. Please try again.' }
  }
}