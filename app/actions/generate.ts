'use server'

import * as cheerio from 'cheerio';
import { z } from 'zod';

const urlSchema = z.object({
  url: z.string().url().startsWith('https://www.reddit.com/r/hiphopheads')
})

interface ScrapedData {
  title: string;
  links: string[];
}

export async function scrapeUrl(prevState: any, formData: FormData) {
  const validatedFields = urlSchema.safeParse({
    url: formData.get('url')
  })

  if (!validatedFields.success) {
    return { error: 'Invalid URL. Please enter a valid URL from r/hiphopheads subreddit.' }
  }

  const url = validatedFields.data.url

  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
      },
    })
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const html = await response.text()

    const $ = cheerio.load(html)
    const scrapedData: ScrapedData = {
      title: '',
      links: []
    }

    // Find the specific <shreddit-post /> element
    const targetPost = $('shreddit-post').filter((_, el) => {
      const $el = $(el)
      const author = $el.attr('author')
      const postTitle = $el.attr('post-title')
      return author === 'DropWatcher' || 
             (postTitle && postTitle.startsWith('Drop Watch:')) ||
             false; // Add a boolean value to the filter function
    }).first()

    if (targetPost.length) {
      scrapedData.title = targetPost.attr('post-title') || 'Drop Watch Post'

      // Find all <a> elements within lists in the target post
      targetPost.find('ul li a, ol li a').each((_, el) => {
        const link = $(el).text().trim()
        if (link) {
          scrapedData.links.push(link)
        }
      })
    }

    if (scrapedData.links.length === 0) {
      return { error: 'No matching post or links found.' }
    }

    return { 
      success: true, 
      data: scrapedData
    }
  } catch (error) {
    console.error('Error scraping URL:', error)
    return { error: 'Failed to scrape URL. Please try again.' }
  }
}
