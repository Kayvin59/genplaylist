"use client"

import type React from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { useMusicScraper } from "@/lib/hooks/useScrape"
import { Album, AlertCircle, Globe, List, Loader2, Search, X } from "lucide-react"
import { useState } from "react"
import ScrapedDataTable from "./data-table"

export default function MusicUrlInput() {
  const [url, setUrl] = useState("")
  const { isLoading, currentStep, result, error, scrapeUrl, reset } = useMusicScraper()

  const clearUrl = () => {
    setUrl("")
    reset()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return

    const scrapeResult = await scrapeUrl(url.trim())

    if (scrapeResult.success && scrapeResult.data) {
      if (!scrapeResult.data.isMusicContent || scrapeResult.data.confidence < 0.5) {
        return
      }
      const hasAlbumTracks = scrapeResult.data.albums?.some((a: any) => a.tracks?.length > 0) ?? false
      if (scrapeResult.data.tracks.length === 0 && scrapeResult.data.albums.length === 0 && !hasAlbumTracks) {
        return
      }
    }
  }

  const getStepProgress = () => {
    switch (currentStep) {
      case "scraping":
        return 30
      case "analyzing":
        return 65
      case "processing":
        return 90
      default:
        return 0
    }
  }

  const getStepLabel = () => {
    switch (currentStep) {
      case "scraping":
        return "Reading page content..."
      case "analyzing":
        return "Finding tracks..."
      case "processing":
        return "Almost done..."
      default:
        return ""
    }
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return "bg-green-50 text-green-700 border-green-200"
    if (confidence >= 0.5) return "bg-amber-50 text-amber-700 border-amber-200"
    return "bg-red-50 text-red-700 border-red-200"
  }

  const getErrorHint = (errorMessage: string) => {
    if (errorMessage.includes("blocks") || errorMessage.includes("403")) {
      return "This site blocks automated access. Try a different source."
    }
    if (errorMessage.includes("Rate limit")) {
      return null // The error message itself is clear enough
    }
    if (errorMessage.includes("quota") || errorMessage.includes("credits")) {
      return null
    }
    return "Try music blogs, album reviews, or Reddit threads."
  }

  return (
    <div className="w-full max-w-4xl space-y-6">
      <Card className="border border-border">
        <CardHeader className="text-center pb-2">
          <CardTitle className="flex items-center justify-center gap-2 text-xl font-semibold text-foreground">
            <Globe className="w-5 h-5 text-muted-foreground" />
            Paste a music URL
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Blog posts, Reddit threads, album reviews, tracklists
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
                className="w-full pr-10 py-3 text-base rounded-lg"
                disabled={isLoading}
              />
              {url && !isLoading && (
                <button
                  type="button"
                  onClick={clearUrl}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <Button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="w-full bg-[#1DB954] hover:bg-[#1aa34a] text-white font-medium py-3 h-11 transition-colors"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {getStepLabel()}
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Find tracks
                </>
              )}
            </Button>
          </form>

          {/* Progress */}
          {isLoading && (
            <div className="space-y-1.5">
              <Progress value={getStepProgress()} className="w-full h-1.5" />
              <p className="text-center text-xs text-muted-foreground">{getStepLabel()}</p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-red-800">{error}</p>
                {getErrorHint(error) && (
                  <p className="text-red-600 mt-0.5">{getErrorHint(error)}</p>
                )}
              </div>
            </div>
          )}

          {/* Results summary */}
          {result && (
            <div className="flex gap-2 flex-wrap items-center pt-1">
              <Badge className={getConfidenceColor(result.confidence)}>
                {Math.round(result.confidence * 100)}% match
              </Badge>
              {(() => {
                const albumTrackCount = result.albums?.reduce((sum: number, a: any) => sum + (a.tracks?.length || 0), 0) ?? 0
                const totalTracks = result.tracks.length + albumTrackCount
                return totalTracks > 0 ? (
                  <Badge variant="outline" className="text-muted-foreground">
                    <List className="w-3 h-3 mr-1" />
                    {totalTracks} tracks
                  </Badge>
                ) : null
              })()}
              {result.albums?.length > 0 && (
                <Badge variant="outline" className="text-muted-foreground">
                  <Album className="w-3 h-3 mr-1" />
                  {result.albums.length} albums
                </Badge>
              )}
            </div>
          )}

          {/* Clear */}
          {!isLoading && (url || result || error) && (
            <Button variant="ghost" size="sm" onClick={clearUrl} className="w-full text-muted-foreground hover:text-foreground transition-colors">
              <X className="mr-1.5 h-3.5 w-3.5" />
              Clear
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Results Table */}
      {result && <ScrapedDataTable data={result} />}
    </div>
  )
}
