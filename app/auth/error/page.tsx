"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

export default function AuthError() {
  const searchParams = useSearchParams()
  const error = searchParams.get("message") || "An unknown error occurred"

  return (
    <div className="flex items-center justify-center p-4 mt-16">
      <Card className="w-full max-w-md border border-border">
        <CardHeader className="text-center pb-2">
          <div className="flex justify-center mb-3">
            <div className="w-12 h-12 bg-red-50 border border-red-200 rounded-full flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-500" />
            </div>
          </div>
          <CardTitle className="text-base font-semibold">Authentication error</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          <Button asChild className="w-full bg-[#1DB954] hover:bg-[#1aa34a] text-white transition-colors">
            <Link href="/">Try again</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
