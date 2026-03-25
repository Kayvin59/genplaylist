import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { headers } from "next/headers"

// --- Upstash Redis client ---
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

// --- Rate limiters (sliding window) ---
// Each limiter is a singleton — Upstash handles per-key tracking in Redis.

/** Scraping: 10 requests per 60s per IP */
export const scrapeRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "ratelimit:scrape",
})

/** Playlist creation: 5 requests per 60s per IP */
export const playlistRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, "60 s"),
  prefix: "ratelimit:playlist",
})

/** Subscribe: 20 requests per 60s per IP */
export const subscribeRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, "60 s"),
  prefix: "ratelimit:subscribe",
})

// --- Helpers ---

/**
 * Get the client IP from request headers (works behind Vercel/proxies).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers()
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? "unknown"
}

// --- URL Validation ---

export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url?.trim()) {
    return { isValid: false, error: "URL is required" }
  }

  try {
    const urlObj = new URL(url.trim())

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { isValid: false, error: "Only HTTP and HTTPS URLs are supported" }
    }

    // Block localhost/private IPs in production
    if (process.env.NODE_ENV === "production") {
      const hostname = urlObj.hostname.toLowerCase()
      const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "10.", "172.", "192.168.", "169.254."]

      if (blockedHosts.some((blocked) => hostname.includes(blocked))) {
        return { isValid: false, error: "Private/local URLs not allowed" }
      }
    }

    // URL length limit
    if (url.length > 2048) {
      return { isValid: false, error: "URL too long (max 2048 characters)" }
    }

    return { isValid: true }
  } catch {
    return { isValid: false, error: "Invalid URL format" }
  }
}
