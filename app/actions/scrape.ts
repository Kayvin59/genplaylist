"use server"

import { checkRateLimit, validateUrl } from "@/lib/security"
import { rawMusicScraperResult } from "@/types"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

// Firecrawl configuration
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v0"

// AI schema for extracting music data
const MusicDataSchema = z.object({
  isMusicContent: z.boolean().describe("Whether the content contains music-related information"),
  title: z.string().describe("Title of the article/post"),

  tracks: z
    .array(
      z.object({
        artist: z.string().min(1).max(100).describe("Artist name"),
        title: z.string().min(1).max(100).describe("Song title"),
        album: z.string().max(100).optional().describe("Album name if mentioned"),
      }),
    )
    .max(500)
    .describe("List of music tracks found"),

  albums: z
    .array(
      z.object({
        artist: z.string().min(1).max(100).describe("Artist name"),
        album: z.string().min(1).max(100).describe("Album name"),
        year: z.number().optional().describe("Release year if mentioned"),
        trackCount: z.number().optional().describe("Number of tracks if mentioned"),
      }),
    )
    .max(50)
    .describe("List of albums found"),

  confidence: z.number().min(0).max(1).describe("Confidence score: 1.0 = very confident, 0.0 = not confident"),
  contentType: z
    .enum(["playlist", "album_review", "tracklist", "music_blog", "reddit_post", "non_music"])
    .describe("Type of content"),
})


export async function musicScraper(url: string ): Promise<rawMusicScraperResult> {
  // rate limiting (10 req/min)
  const rateLimitCheck = checkRateLimit(`scrape_global`, 10, 60000)
  if (!rateLimitCheck.allowed) {
    return {
      success: false,
      error: `Rate limit exceeded. Try again in ${Math.ceil((rateLimitCheck.resetTime - Date.now()) / 1000)}s`,
      errorType: "rate_limit",
    }
  }

  // Validate URL
  const urlValidation = validateUrl(url)
  if (!urlValidation.isValid) {
    return { success: false, error: urlValidation.error, errorType: "validation" }
  }

  // Check API key
  if (!FIRECRAWL_API_KEY) {
    return { success: false, error: "Firecrawl API key not configured" }
  }

  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: "OpenAI API key not configured", errorType: "general" }
  }

  try {

    // Step 1: Scrape website content with Firecrawl
    console.log("🔍 Scraping website content...")

    const scrapeResponse = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url.trim(),
        formats: ["markdown"], // Get clean markdown content
        onlyMainContent: true, // Skip navigation, ads, etc.
        includeTags: ["h1", "h2", "h3", "h4", "ul", "ol", "li", "p", "div", "span"],
        excludeTags: ["nav", "footer", "aside", "script", "style", "header", "advertisement"],
        waitFor: 3000, // Wait for dynamic content to load
      }),
    })

    if (!scrapeResponse.ok) {
      console.error("Firecrawl error:", scrapeResponse.status)

      if (scrapeResponse.status === 403) {
        return {
          success: false,
          error: "Website blocks automated access. Try manual input instead.",
          errorType: "403_blocked",
        }
      }

      if (scrapeResponse.status === 429) {
        return {
          success: false,
          error: "Too many requests. Please wait a moment and try again.",
          errorType: "rate_limit",
        }
      }

      throw new Error(`Failed to scrape website: ${scrapeResponse.status}`)
    }
    console.log("scrapeResponse :", scrapeResponse)

    const scrapeData = await scrapeResponse.json()
    const markdownContent = scrapeData.data?.markdown
    console.log("scrapeData :", scrapeData)
    console.log("markdownContent :", markdownContent)

    if (!markdownContent || markdownContent.trim().length < 50) {
      return { success: false, error: "No meaningful content found on this page" }
    }

    // Step 2: Analyze content with AI
    console.log("🤖 Analyzing content with AI...")

    const result = await generateObject({
      model: openai("gpt-4o"), // gpt-4o-mini
      schema: MusicDataSchema,
      prompt: `Extract music data from this content. Focus on:

TRACKS: Individual songs with artist names
ALBUMS: Full album mentions with artist

EXTRACT FORMATS:
• "Artist - Song" 
• "Artist: Song"
• "Song by Artist"
• Album: "Artist - Album Name (2024)"

IGNORE: News, non-music content, navigation

Content:
${markdownContent.slice(0, 6000)}`,
      abortSignal: AbortSignal.timeout(20000)
    })

    // Step 3: Validate and organize results
    if (!result.object.isMusicContent || result.object.confidence < 0.5) {
      return {
        success: true,
        data: {
          title: result.object.title || "Non-Music Content",
          tracks: [],
          albums: [],
          confidence: result.object.confidence,
          isMusicContent: false,
          contentType: result.object.contentType || "non-music",
        },
      }
    }

    // Clean and validate extracted tracks
    const validTracks = result.object.tracks
      .filter((track) => {
        // Must have both artist and title
        if (!track.artist?.trim() || !track.title?.trim()) return false
        // Reasonable length limits
        if (track.artist.length < 2 || track.title.length < 2) return false
        if (track.artist.length > 100 || track.title.length > 200) return false
        return true
      })
      .map((track) => ({
        artist: track.artist.trim(),
        title: track.title.trim(),
        album: track.album?.trim(),
      }))

    const validAlbums = result.object.albums
      .filter((album) => {
        if (!album.artist?.trim() || !album.album?.trim()) return false
        if (album.artist.length < 2 || album.album.length < 2) return false
        if (album.artist.length > 100 || album.album.length > 100) return false
        return true
      })
      .map((album) => ({
        artist: album.artist.trim(),
        album: album.album.trim(),
        year: album.year,
        trackCount: album.trackCount,
      }))

    console.log(
      `✅ Found ${validTracks.length} valid tracks and ${validAlbums.length} albums with ${Math.round(result.object.confidence * 100)}% confidence`,
    )

    return {
      success: true,
      data: {
        title: result.object.title || "Music Content",
        tracks: validTracks,
        albums: validAlbums,
        confidence: result.object.confidence,
        isMusicContent: result.object.isMusicContent,
        contentType: result.object.contentType || "music",
      },
    }
  } catch (error: any) {
    console.error("Music scrape error:", error)
    if (error.name === "AbortError") {
      return { success: false, error: "Request timed out", errorType: "general" }
    }

    if (error.message?.includes("quota")) {
      return {
        success: false,
        error: "OpenAI quota exceeded. Add credits to continue.",
        errorType: "quota_exceeded",
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to analyze webpage content",
    }
  }
}
