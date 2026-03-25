"use server"

import { checkRateLimit, validateUrl } from "@/lib/security"
import { rawMusicScraperResult } from "@/types"
import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import * as cheerio from "cheerio"
import { z } from "zod"

// Firecrawl configuration (optional fallback)
const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY
const FIRECRAWL_BASE_URL = "https://api.firecrawl.dev/v1"

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
        tracks: z
          .array(
            z.object({
              artist: z.string().min(1).max(100).describe("Artist name"),
              title: z.string().min(1).max(100).describe("Song title"),
            }),
          )
          .optional()
          .describe("Individual tracks from this album if mentioned in the content"),
      }),
    )
    .max(50)
    .describe("List of albums found"),

  confidence: z.number().min(0).max(1).describe("Confidence score: 1.0 = very confident, 0.0 = not confident"),
  contentType: z
    .enum(["playlist", "album_review", "tracklist", "music_blog", "reddit_post", "non_music"])
    .describe("Type of content"),
})

/**
 * Built-in scraper using fetch + Cheerio (free, no API key needed).
 * Extracts main text content from a webpage as clean text.
 */
async function scrapeWithCheerio(url: string): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      signal: AbortSignal.timeout(15000),
    })

    if (!response.ok) {
      if (response.status === 403) {
        return { success: false, error: "Website blocks automated access. Try a different URL." }
      }
      return { success: false, error: `Failed to fetch page (HTTP ${response.status})` }
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Remove non-content elements
    $("script, style, nav, footer, header, aside, iframe, noscript, svg, [role='navigation'], [role='banner'], .ad, .ads, .advertisement, .sidebar, .menu, .cookie-banner").remove()

    // Try to find main content area
    const mainSelectors = ["article", "main", "[role='main']", ".post-content", ".entry-content", ".article-body", ".content"]
    let mainContent = ""

    for (const selector of mainSelectors) {
      const el = $(selector)
      if (el.length > 0) {
        mainContent = el.text()
        break
      }
    }

    // Fallback to body if no main content area found
    if (!mainContent || mainContent.trim().length < 50) {
      mainContent = $("body").text()
    }

    // Clean up whitespace: collapse multiple spaces/newlines
    const cleaned = mainContent
      .replace(/\s+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      .trim()

    if (cleaned.length < 50) {
      return { success: false, error: "No meaningful content found on this page" }
    }

    return { success: true, content: cleaned }
  } catch (error: any) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return { success: false, error: "Request timed out" }
    }
    return { success: false, error: `Failed to scrape: ${error.message}` }
  }
}

/**
 * Scrape using Firecrawl API v1 (optional, used when FIRECRAWL_API_KEY is set).
 */
async function scrapeWithFirecrawl(url: string): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    const response = await fetch(`${FIRECRAWL_BASE_URL}/scrape`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url: url.trim(),
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
      signal: AbortSignal.timeout(30000),
    })

    if (!response.ok) {
      if (response.status === 403) {
        return { success: false, error: "Website blocks automated access." }
      }
      if (response.status === 429) {
        return { success: false, error: "Firecrawl rate limit exceeded." }
      }
      return { success: false, error: `Firecrawl error (HTTP ${response.status})` }
    }

    const data = await response.json()
    const markdown = data.data?.markdown

    if (!markdown || markdown.trim().length < 50) {
      return { success: false, error: "No meaningful content found on this page" }
    }

    return { success: true, content: markdown }
  } catch (error: any) {
    if (error.name === "AbortError" || error.name === "TimeoutError") {
      return { success: false, error: "Firecrawl request timed out" }
    }
    return { success: false, error: `Firecrawl error: ${error.message}` }
  }
}

export async function musicScraper(url: string): Promise<rawMusicScraperResult> {
  // Rate limiting (10 req/min)
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

  if (!process.env.OPENAI_API_KEY) {
    return { success: false, error: "OpenAI API key not configured", errorType: "general" }
  }

  try {
    // Step 1: Scrape website content
    // Use Firecrawl if API key is available, otherwise use built-in Cheerio scraper
    let scrapeResult: { success: boolean; content?: string; error?: string }

    if (FIRECRAWL_API_KEY) {
      scrapeResult = await scrapeWithFirecrawl(url)
      // Fall back to Cheerio if Firecrawl fails
      if (!scrapeResult.success) {
        console.log("Firecrawl failed, falling back to Cheerio scraper")
        scrapeResult = await scrapeWithCheerio(url)
      }
    } else {
      scrapeResult = await scrapeWithCheerio(url)
    }

    if (!scrapeResult.success || !scrapeResult.content) {
      return {
        success: false,
        error: scrapeResult.error || "Failed to scrape content",
        errorType: scrapeResult.error?.includes("blocks") ? "403_blocked" : "general",
      }
    }

    // Step 2: Analyze content with AI (GPT-4o-mini — fast and cost-effective)
    const result = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: MusicDataSchema,
      prompt: `Extract music data from this content. Focus on:

TRACKS: Individual songs with artist names (standalone tracks not part of an album)
ALBUMS: Full album mentions with artist. For each album, include its tracks if they are listed in the content.

IMPORTANT: When the content lists tracks that belong to an album, put those tracks inside the album's "tracks" array (not in the top-level tracks array). Only use the top-level tracks array for standalone songs not associated with any album.

EXTRACT FORMATS:
• "Artist - Song"
• "Artist: Song"
• "Song by Artist"
• Album: "Artist - Album Name (2024)"

IGNORE: News, non-music content, navigation

Content:
${scrapeResult.content.slice(0, 15000)}`,
      abortSignal: AbortSignal.timeout(20000),
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
          contentType: result.object.contentType || "non_music",
        },
      }
    }

    // Clean and validate extracted tracks
    const validTracks = result.object.tracks
      .filter((track) => {
        if (!track.artist?.trim() || !track.title?.trim()) return false
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
        tracks: album.tracks
          ?.filter((t) => t.artist?.trim() && t.title?.trim())
          .map((t) => ({
            artist: t.artist.trim(),
            title: t.title.trim(),
            album: album.album.trim(),
          })),
      }))

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
