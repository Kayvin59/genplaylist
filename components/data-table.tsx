"use client"

import { createPlaylist } from "@/app/actions/spotify"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrapedDataTableProps, UITrack } from "@/types"
import { AlbumIcon, Check, ChevronLeft, ChevronRight, ExternalLink, List, Loader2, Music, X } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const ITEMS_PER_PAGE = 10

export default function ScrapedDataTable({ data }: ScrapedDataTableProps) {
  const [tracks, setTracks] = useState<UITrack[]>([])
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [playlistName, setPlaylistName] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const [playlistResult, setPlaylistResult] = useState<{
    success: boolean
    message: string
    playlistUrl?: string
    playlistId?: string
  } | null>(null)

  const router = useRouter()

  // Convert data to tracks format
  useEffect(() => {
    const convertedTracks = data.tracks.map((track) => ({
      title: track.title,
      artist: track.artist,
      album: track.album,
      selected: false,
    }))
    setTracks(convertedTracks)
    setPlaylistName(`${data.title} Playlist`)
  }, [data])  
  
  // Pagination
  const totalPages = Math.ceil(tracks.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentTracks = tracks.slice(startIndex, endIndex)
  const selectedTracks = tracks.filter((track) => track.selected)

  const handleSelectAll = (checked: boolean) => {
    setTracks(tracks.map((track) => ({ ...track, selected: checked })))
  }

  const handleTrackSelect = (index: number, checked: boolean) => {
    const actualIndex = startIndex + index
    const updatedTracks = tracks.map((track, i) => (i === actualIndex ? { ...track, selected: checked } : track))
    setTracks(updatedTracks)
  }

  const handleCreatePlaylist = async () => {
    if (selectedTracks.length === 0 || !playlistName.trim()) return

    setIsCreatingPlaylist(true)
    setPlaylistResult(null)

    try {
      const result = await createPlaylist({
        name: playlistName.trim(),
        description: `Generated from ${data.title}`,
        tracks: selectedTracks,
      })

      if (result.needsAuth) {
        router.push("/auth/login")
        return
      }

      if (result.success) {
        setPlaylistResult({
          success: true,
          message: `Playlist "${playlistName}" created successfully! Added ${result.tracksAdded}/${result.totalTracks} tracks.`,
          playlistUrl: result.playlistUrl,
          playlistId: result.playlistId,
        })
      } else {
        setPlaylistResult({
          success: false,
          message: result.error || "Failed to create playlist",
        })
      }
    } catch (error) {
      console.error("Failed to create playlist:", error)
      setPlaylistResult({
        success: false,
        message: "An unexpected error occurred. Please try again.",
      })
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  // Success state (same as before)
  if (playlistResult?.success) {
    return (
      <Card className="w-full shadow-lg border border-gray-200">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-green-800 mb-6">🎉 Playlist Created!</h3>
            <p className="text-gray-600 mb-4">{playlistResult.message}</p>
            {playlistResult.playlistUrl && (
              <div className="space-y-3">
                <a
                  href={playlistResult.playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 mb-4 bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  <Music className="w-4 h-4" />
                  Open in Spotify
                  <ExternalLink className="w-4 h-4" />
                </a>
                <div className="mb-4">
                  <iframe
                    src={`https://open.spotify.com/embed/playlist/${playlistResult.playlistId}`}
                    width="100%"
                    height="400"
                    frameBorder="0"
                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    loading="lazy"
                    className="rounded-lg"
                  ></iframe>
                </div>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setPlaylistResult(null)
              setTracks(tracks.map((track) => ({ ...track, selected: false })))
            }}
            className="mt-4"
          >
            Create Another Playlist
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full border border-gray-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 mb-4">
          <Music className="w-5 h-5 text-blue-600" />
          {data.title}
        </CardTitle>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary">
              <List className="w-3 h-3 mr-1" />
              {data.tracks.length} tracks
            </Badge>
            <Badge variant="outline">
              <AlbumIcon className="w-3 h-3 mr-1" />
              {data.albums.length} albums
            </Badge>
            <Badge
              className={`${data.confidence >= 0.8 ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"}`}
            >
              {Math.round(data.confidence * 100)}% confidence
            </Badge>
          </div>
          <Badge variant="outline">{selectedTracks.length} selected</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Playlist Name Input */}
        <div className="space-y-2 text-left">
          <Label htmlFor="playlist-name">Playlist Name</Label>
          <Input
            id="playlist-name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="Enter playlist name"
            className="max-w-md"
          />
        </div>


        {/* Tabs for Tracks and Albums */}
        <Tabs defaultValue="tracks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tracks">
              <List className="w-4 h-4 mr-2" />
              Tracks ({data.tracks.length})
            </TabsTrigger>
            <TabsTrigger value="albums">
              <AlbumIcon className="w-4 h-4 mr-2" />
              Albums ({data.albums.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="space-y-4">
            {/* Selection Controls */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={tracks.length > 0 && tracks.every((track) => track.selected)}
                  onCheckedChange={handleSelectAll}
                  disabled={tracks.length === 0}
                />
                <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
                  Select All ({tracks.length} tracks)
                </label>
              </div>
              <Button
                onClick={handleCreatePlaylist}
                disabled={selectedTracks.length === 0 || isCreatingPlaylist || !playlistName.trim()}
                className="bg-green-500 hover:bg-green-600"
              >
                {isCreatingPlaylist ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  `🎵 Create Playlist (${selectedTracks.length})`
                )}
              </Button>
            </div>

            {/* Error Message */}
            {playlistResult && !playlistResult.success && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-600" />
                  <p className="text-sm font-medium text-red-800">{playlistResult.message}</p>
                </div>
              </div>
            )}

            {/* Tracks Table */}
            <div className="space-y-4">
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">Select</TableHead>
                      <TableHead>Artist</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Album</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentTracks.map((track, index) => (
                      <TableRow key={startIndex + index}>
                        <TableCell>
                          <Checkbox
                            checked={track.selected}
                            onCheckedChange={(checked) => handleTrackSelect(index, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{track.artist}</TableCell>
                        <TableCell>{track.title}</TableCell>
                        <TableCell className="text-gray-500">{track.album || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, tracks.length)} of {tracks.length} tracks
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </Button>
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        const page = i + 1
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => setCurrentPage(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        )
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="albums" className="space-y-4">
            {data.albums.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {data.albums.map((album, index) => (
                  <Card key={index} className="p-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-gray-800">{album.album}</h4>
                      <p className="text-sm text-gray-600">by {album.artist}</p>
                      {album.year && (
                        <Badge variant="outline" className="text-xs">
                          {album.year}
                        </Badge>
                      )}
                      {album.trackCount && (
                        <Badge variant="outline" className="text-xs ml-2">
                          {album.trackCount} tracks
                        </Badge>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <AlbumIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No albums found in this content</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
