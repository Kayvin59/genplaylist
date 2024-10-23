'use server'

import { z } from 'zod'

const urlSchema = z.object({
  url: z.string().url().startsWith('https://www.reddit.com/r/hiphopheads')
})

export async function scrapeUrl(prevState: any, formData: FormData) {
  const validatedFields = urlSchema.safeParse({
    url: formData.get('url')
  })

  if (!validatedFields.success) {
    return { error: 'Invalid URL. Please enter a valid URL from r/hiphopheads subreddit.' }
  }

  const url = validatedFields.data.url

  try {
    // Simulating a delay for scraping
    await new Promise(resolve => setTimeout(resolve, 2000))

    return { 
      success: true, 
      data: { 
        url, 
        scrapedAt: new Date().toISOString() 
      } 
    }
  } catch (error) {
    console.error('Error scraping URL:', error)
    return { error: 'Failed to scrape URL. Please try again.' }
  }
}

export async function generatePlaylist() {
  // Playlist generation via spotifyApi

}