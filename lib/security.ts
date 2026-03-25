import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"
import { headers } from "next/headers"

// --- Upstash Redis client ---
const redis = new Redis({
  url: process.env.KV_REST_API_URL!,
  token: process.env.KV_REST_API_TOKEN!,
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

// --- URL Validation (SSRF protection) ---

/**
 * Check if an IP address is private/reserved (SSRF protection).
 * Covers IPv4 private ranges, loopback, link-local, and cloud metadata IPs.
 */
function isPrivateIp(hostname: string): boolean {
  // IPv4 patterns
  const ipv4Match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/)
  if (ipv4Match) {
    const [, a, b] = ipv4Match.map(Number)

    // 10.0.0.0/8 — private
    if (a === 10) return true
    // 172.16.0.0/12 — private (172.16.x.x to 172.31.x.x only)
    if (a === 172 && b >= 16 && b <= 31) return true
    // 192.168.0.0/16 — private
    if (a === 192 && b === 168) return true
    // 127.0.0.0/8 — loopback
    if (a === 127) return true
    // 169.254.0.0/16 — link-local (AWS/cloud metadata)
    if (a === 169 && b === 254) return true
    // 0.0.0.0
    if (a === 0) return true
  }

  // IPv6 loopback & private
  const normalized = hostname.replace(/^\[|\]$/g, "")
  if (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80")
  ) {
    return true
  }

  // Hostnames that resolve to loopback
  const blockedHostnames = ["localhost", "0177.0.0.1", "0x7f.0.0.1", "2130706433"]
  if (blockedHostnames.includes(hostname.toLowerCase())) return true

  return false
}

export function validateUrl(url: string): { isValid: boolean; error?: string } {
  if (!url?.trim()) {
    return { isValid: false, error: "URL is required" }
  }

  // URL length limit
  if (url.length > 2048) {
    return { isValid: false, error: "URL too long (max 2048 characters)" }
  }

  try {
    const urlObj = new URL(url.trim())

    // Only allow HTTP/HTTPS
    if (!["http:", "https:"].includes(urlObj.protocol)) {
      return { isValid: false, error: "Only HTTP and HTTPS URLs are supported" }
    }

    // Block credentials in URL (e.g. http://user:pass@internal-service)
    if (urlObj.username || urlObj.password) {
      return { isValid: false, error: "URLs with credentials are not allowed" }
    }

    // Block private/reserved IPs and hostnames in production
    if (process.env.NODE_ENV === "production") {
      const hostname = urlObj.hostname.toLowerCase()

      if (isPrivateIp(hostname)) {
        return { isValid: false, error: "Private/local URLs not allowed" }
      }

      // Block non-standard ports (only allow 80/443/default)
      if (urlObj.port && !["80", "443"].includes(urlObj.port)) {
        return { isValid: false, error: "Non-standard ports are not allowed" }
      }
    }

    return { isValid: true }
  } catch {
    return { isValid: false, error: "Invalid URL format" }
  }
}
