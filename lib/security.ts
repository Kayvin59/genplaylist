// URL Validation (extracted from musicScraper function)
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

    // Block localhost/private IPs in production (NEW security feature)
    if (process.env.NODE_ENV === "production") {
      const hostname = urlObj.hostname.toLowerCase()
      const blockedHosts = ["localhost", "127.0.0.1", "0.0.0.0", "::1", "10.", "172.", "192.168.", "169.254."]

      if (blockedHosts.some((blocked) => hostname.includes(blocked))) {
        return { isValid: false, error: "Private/local URLs not allowed" }
      }
    }

    // URL length limit (NEW)
    if (url.length > 2048) {
      return { isValid: false, error: "URL too long (max 2048 characters)" }
    }

    return { isValid: true }
  } catch {
    return { isValid: false, error: "Invalid URL format" }
  }
}

// Rate Limiting Helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

export function checkRateLimit(
  identifier: string,
  maxRequests = 10,
  windowMs = 60000,
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now()

  // Clean old entries
  const entries = Array.from(rateLimitMap.entries())
  for (const [key, value] of entries) {
    if (value.resetTime < now) {
      rateLimitMap.delete(key)
    }
  }

  const current = rateLimitMap.get(identifier)

  if (!current || current.resetTime < now) {
    // New window
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return { allowed: true, remaining: maxRequests - 1, resetTime: now + windowMs }
  }

  if (current.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetTime: current.resetTime }
  }

  current.count++
  return { allowed: true, remaining: maxRequests - current.count, resetTime: current.resetTime }
}
