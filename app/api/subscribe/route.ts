import { subscribeAction } from '@/app/actions/subscribe'
import { subscribeRateLimit } from '@/lib/security'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json(
      { message: "Only POST requests are allowed" },
      { status: 405 }
    )
  }

  // Rate limiting (20 req/min per IP via Upstash Redis)
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? request.headers.get("x-real-ip")
    ?? "unknown"
  const { success: allowed } = await subscribeRateLimit.limit(ip)
  if (!allowed) {
    return NextResponse.json(
      { message: "Too many requests. Please try again later." },
      { status: 429 }
    )
  }

  try {
    const formData = await request.formData()
    const result = await subscribeAction(formData)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}