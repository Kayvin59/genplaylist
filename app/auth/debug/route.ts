  // TODO:REMOVE TEST
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  return NextResponse.json({
    message: "Debug route working!",
    url: request.url,
    timestamp: new Date().toISOString(),
    headers: Object.fromEntries(request.headers.entries()),
  })
}
