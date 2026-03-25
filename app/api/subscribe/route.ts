import { subscribeAction } from '@/app/actions/subscribe'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json(
      { message: "Only POST requests are allowed" },
      { status: 405 }
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