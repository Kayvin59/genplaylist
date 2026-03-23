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
import { ScrapedDataTableProps, UIAlbum, UITrack } from "@/types"
import { AlbumIcon, AlertCircle, Check, ChevronLeft, ChevronRight, ExternalLink, List, Loader2, Music } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

const ITEMS_PER_PAGE = 10

export default function ScrapedDataTable({ data }: ScrapedDataTableProps) {
  const [tracks, setTracks] = useState<UITrack[]>([])
  const [albums, setAlbums] = useState<UIAlbum[]>([])
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

  useEffect(() => {
    const convertedTracks = data.tracks.map((track) => ({
      title: track.title,
      artist: track.artist,
      album: track.album,
      selected: false,
    }))
    setTracks(convertedTracks)
    const convertedAlbums = data.albums.map((album) => ({
      ...album,
      selected: false,
    }))
    setAlbums(convertedAlbums)
    const truncatedTitle = data.title.length > 40 ? data.title.slice(0, 40) + "..." : data.title
    setPlaylistName(`${truncatedTitle} Playlist`)
  }, [data])

  const totalPages = Math.ceil(tracks.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const endIndex = startIndex + ITEMS_PER_PAGE
  const currentTracks = tracks.slice(startIndex, endIndex)
  const selectedTracks = tracks.filter((track) => track.selected)
  const selectedAlbums = albums.filter((album) => album.selected)
  const hasSelection = selectedTracks.length > 0 || selectedAlbums.length > 0

  const handleSelectAll = (checked: boolean) => {
    setTracks(tracks.map((track) => ({ ...track, selected: checked })))
  }

  const handleTrackSelect = (index: number, checked: boolean) => {
    const actualIndex = startIndex + index
    const updatedTracks = tracks.map((track, i) => (i === actualIndex ? { ...track, selected: checked } : track))
    setTracks(updatedTracks)
  }

  const handleSelectAllAlbums = (checked: boolean) => {
    setAlbums(albums.map((album) => ({ ...album, selected: checked })))
  }

  const handleAlbumSelect = (index: number, checked: boolean) => {
    setAlbums(albums.map((album, i) => (i === index ? { ...album, selected: checked } : album)))
  }

  const handleCreatePlaylist = async () => {
    if (!hasSelection || !playlistName.trim()) return

    setIsCreatingPlaylist(true)
    setPlaylistResult(null)

    try {
      const result = await createPlaylist({
        name: playlistName.trim(),
        description: `Generated from ${data.title}`,
        tracks: selectedTracks,
        albums: selectedAlbums.length > 0 ? selectedAlbums : undefined,
      })

      if (result.needsAuth) {
        router.push("/")
        return
      }

      if (result.success) {
        setPlaylistResult({
          success: true,
          message: `Added ${result.tracksAdded} of ${result.totalTracks} tracks to "${playlistName}".`,
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
        message: "Something went wrong. Please try again.",
      })
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  // Success state
  if (playlistResult?.success) {
    return (
      <Card className="w-full border border-border">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-green-50 border border-green-200 rounded-full flex items-center justify-center">
              <Check className="w-7 h-7 text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-1">Playlist created</h3>
            <p className="text-sm text-muted-foreground mb-6">{playlistResult.message}</p>
            {playlistResult.playlistUrl && (
              <div className="space-y-4">
                <a
                  href={playlistResult.playlistUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-[#1DB954] hover:bg-[#1aa34a] text-white px-6 py-2.5 rounded-lg font-medium transition-colors text-sm"
                >
                  <Music className="w-4 h-4" />
                  Open in Spotify
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <div>
                  <iframe
                    src={`https://open.spotify.com/embed/playlist/${playlistResult.playlistId}`}
                    width="100%"
                    height="380"
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
            size="sm"
            onClick={() => {
              setPlaylistResult(null)
              setTracks(tracks.map((track) => ({ ...track, selected: false })))
              setAlbums(albums.map((album) => ({ ...album, selected: false })))
            }}
            className="mt-2"
          >
            Create another playlist
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full border border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold">
          <Music className="w-4 h-4 text-muted-foreground" />
          {data.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Playlist Name */}
        <div className="space-y-1.5">
          <Label htmlFor="playlist-name" className="text-sm font-medium">Playlist name</Label>
          <Input
            id="playlist-name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="My playlist"
            className="max-w-sm"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tracks" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="tracks" className="text-sm">
              <List className="w-3.5 h-3.5 mr-1.5" />
              Tracks ({data.tracks.length})
            </TabsTrigger>
            <TabsTrigger value="albums" className="text-sm">
              <AlbumIcon className="w-3.5 h-3.5 mr-1.5" />
              Albums ({data.albums.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracks" className="space-y-4 mt-4">
            {/* Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="select-all"
                  checked={tracks.length > 0 && tracks.every((track) => track.selected)}
                  onCheckedChange={handleSelectAll}
                  disabled={tracks.length === 0}
                />
                <label htmlFor="select-all" className="text-sm cursor-pointer select-none">
                  Select all ({tracks.length})
                </label>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {hasSelection && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedTracks.length > 0 ? `${selectedTracks.length} tracks` : ""}
                    {selectedTracks.length > 0 && selectedAlbums.length > 0 ? " + " : ""}
                    {selectedAlbums.length > 0 ? `${selectedAlbums.length} albums` : ""}
                  </Badge>
                )}
                <Button
                  onClick={handleCreatePlaylist}
                  disabled={!hasSelection || isCreatingPlaylist || !playlistName.trim()}
                  className="bg-[#1DB954] hover:bg-[#1aa34a] text-white transition-colors flex-1 sm:flex-none"
                  size="sm"
                >
                  {isCreatingPlaylist ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Music className="mr-1.5 h-3.5 w-3.5" />
                      Create playlist
                    </>
                  )}
                </Button>
              </div>
            </div>

            {/* Error */}
            {playlistResult && !playlistResult.success && (
              <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-sm font-medium text-red-800">{playlistResult.message}</p>
              </div>
            )}

            {/* Table */}
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Artist</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Title</TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Album</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentTracks.map((track, index) => (
                    <TableRow
                      key={startIndex + index}
                      className={`transition-colors cursor-pointer ${track.selected ? "bg-green-50/50" : "hover:bg-muted/30"}`}
                      onClick={() => handleTrackSelect(index, !track.selected)}
                    >
                      <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={track.selected}
                          onCheckedChange={(checked) => handleTrackSelect(index, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm">{track.artist}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{track.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{track.album || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-muted-foreground">
                  {startIndex + 1}–{Math.min(endIndex, tracks.length)} of {tracks.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 px-2"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    let page: number
                    if (totalPages <= 5) {
                      page = i + 1
                    } else if (currentPage <= 3) {
                      page = i + 1
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i
                    } else {
                      page = currentPage - 2 + i
                    }
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8 p-0 text-xs"
                      >
                        {page}
                      </Button>
                    )
                  })}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 px-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="albums" className="space-y-4 mt-4">
            {albums.length > 0 ? (
              <>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-albums"
                      checked={albums.length > 0 && albums.every((a) => a.selected)}
                      onCheckedChange={handleSelectAllAlbums}
                    />
                    <label htmlFor="select-all-albums" className="text-sm cursor-pointer select-none">
                      Select all ({albums.length})
                    </label>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    {selectedAlbums.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {selectedAlbums.length} selected
                      </Badge>
                    )}
                    <Button
                      onClick={handleCreatePlaylist}
                      disabled={!hasSelection || isCreatingPlaylist || !playlistName.trim()}
                      className="bg-[#1DB954] hover:bg-[#1aa34a] text-white transition-colors flex-1 sm:flex-none"
                      size="sm"
                    >
                      {isCreatingPlaylist ? (
                        <>
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <Music className="mr-1.5 h-3.5 w-3.5" />
                          Create playlist
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {albums.map((album, index) => (
                    <div
                      key={index}
                      className={`p-4 border rounded-lg space-y-1.5 cursor-pointer transition-colors ${
                        album.selected ? "border-green-300 bg-green-50/50" : "border-border hover:bg-muted/30"
                      }`}
                      onClick={() => handleAlbumSelect(index, !album.selected)}
                    >
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={album.selected}
                          onCheckedChange={(checked) => handleAlbumSelect(index, checked as boolean)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-0.5"
                        />
                        <div>
                          <h4 className="font-medium text-sm text-foreground">{album.album}</h4>
                          <p className="text-xs text-muted-foreground">by {album.artist}</p>
                          <div className="flex gap-1.5 pt-1">
                            {album.year && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {album.year}
                              </Badge>
                            )}
                            {album.trackCount && (
                              <Badge variant="outline" className="text-xs px-1.5 py-0">
                                {album.trackCount} tracks
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <AlbumIcon className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">No albums found in this content</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
