"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useMusicScraper } from "@/lib/hooks/useScrape"
import { Album, AlertTriangle, CheckCircle, List, Loader2, Music, Sparkles, X } from "lucide-react"
import { useState } from "react"
import ScrapedDataTable from "./data-table"

export default function MusicUrlInput() {
  const [url, setUrl] = useState("")
  const { isLoading, currentStep, stepMessage, result, error, scrapeUrl, reset } = useMusicScraper()

  const clearUrl = () => {
    setUrl("")
    reset()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    const scrapeResult = await scrapeUrl(url.trim())

    if (scrapeResult.success && scrapeResult.data) {
      // Check if it's music content with good confidence
      if (!scrapeResult.data.isMusicContent || scrapeResult.data.confidence < 0.5) {
        return
      }

      // Check if we found tracks
      if (scrapeResult.data.tracks.length === 0) {
        return
      }
    }
  }

  // Progress bar
  const getStepProgress = () => {
    switch (currentStep) {
      case "scraping":
        return 25
      case "analyzing":
        return 60
      case "processing":
        return 90
      default:
        return 0
    }
  }

  // Step icon function
  const getStepIcon = () => {
    switch (currentStep) {
      case "scraping":
        return "🔍"
      case "analyzing":
        return "🤖"
      case "processing":
        return "⚡"
      default:
        return "🎵"
    }
  }

  // Get confidence color for badge
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "bg-green-100 text-green-800 border-green-300"
    if (confidence >= 0.7) return "bg-blue-100 text-blue-800 border-blue-300"
    if (confidence >= 0.5) return "bg-yellow-100 text-yellow-800 border-yellow-300"
    return "bg-red-100 text-red-800 border-red-300"
  }

  return (
    <div className="w-full max-w-4xl space-y-8">
      {/* Main Input Card */}
      <Card className="shadow-xl border-0 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800">
            <Music className="w-6 h-6 text-purple-600" />
            {/* ✅ CHANGED: Updated title */}
            Universal Music Extractor
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {/* ✅ CHANGED: Updated description */}
            Extract tracks and albums from any music website using AI
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://reddit.com/r/hiphopheads/... or any music website"
                className="w-full pr-10 py-3 text-base border-gray-300 focus:border-purple-500 focus:ring-purple-500 rounded-lg"
                disabled={isLoading}
              />
              {url && (
                <button
                  type="button"
                  onClick={clearUrl}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-200"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {/* ✅ CHANGED: Dynamic step feedback */}
                  {getStepIcon()} {stepMessage}
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {/* ✅ CHANGED: Updated button text */}
                  Extract Music Data
                </>
              )}
            </Button>
          </form>

          {/* Progress Bar */}
          {isLoading && (
            <div className="space-y-2">
              <Progress value={getStepProgress()} className="w-full" />
              <div className="text-center text-sm text-gray-600">🤖 Analyzing webpage content...</div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-red-800">{error}</p>
                  <p className="text-xs text-red-600 mt-1">
                    💡 Try: Music blogs, album reviews, Reddit music posts, or streaming sites.
                  </p>
                </div>
              </div>
            </div>
          )}

          {result && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">Music content detected!</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge className={getConfidenceColor(result.confidence)}>
                  {Math.round(result.confidence * 100)}% confidence
                </Badge>
                <Badge variant="outline" className="border-purple-300 text-purple-700">
                  {result.contentType}
                </Badge>
                {/* ✅ NEW: Track count badge */}
                <Badge variant="outline" className="border-blue-300 text-blue-700">
                  <List className="w-3 h-3 mr-1" />
                  {result.tracks.length} tracks
                </Badge>
                {/* ✅ NEW: Album count badge */}
                <Badge variant="outline" className="border-green-300 text-green-700">
                  <Album className="w-3 h-3 mr-1" />
                  {result.albums?.length || 0} albums
                </Badge>
              </div>
            </div>
          )}

          {/* Clear button condition */}
          {(url || result || error) && (
            <Button variant="outline" onClick={clearUrl} className="w-full bg-transparent">
              <X className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}

        </CardContent>
      </Card>

      {/* Results Table */}
      {result && (
        <ScrapedDataTable
          data={result}
        />
      )}
    </div>
  )
}
