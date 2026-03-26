"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle } from "lucide-react"
import Link from "next/link"

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-red-50 border border-red-200 rounded-full flex items-center justify-center">
              <AlertCircle className="w-7 h-7 text-red-500" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred. Please try again.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button onClick={reset} variant="outline" size="sm">
              Try again
            </Button>
            <Button asChild size="sm" className="bg-[#1DB954] hover:bg-[#1aa34a] text-black">
              <Link href="/">Go home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
