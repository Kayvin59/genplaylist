"use client"

import { createPlaylist } from "@/app/actions/spotify"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrapedDataTableProps, UIAlbum, UITrack } from "@/types"
import { AlertCircle, Check, ChevronDown, ChevronRight, ExternalLink, Loader2, Music } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"

interface AlbumGroup {
  album: UIAlbum
  tracks: UITrack[]
  expanded: boolean
}

export default function ScrapedDataTable({ data }: ScrapedDataTableProps) {
  const [tracks, setTracks] = useState<UITrack[]>([])
  const [albums, setAlbums] = useState<UIAlbum[]>([])
  const [expandedAlbums, setExpandedAlbums] = useState<Set<string>>(new Set())
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)
  const [playlistName, setPlaylistName] = useState("")
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

  // Group tracks by album and merge with album metadata
  const { albumGroups, ungroupedTracks } = useMemo(() => {
    const groups: AlbumGroup[] = []
    const matched = new Set<number>()

    for (let ai = 0; ai < albums.length; ai++) {
      const album = albums[ai]
      const albumTracks: UITrack[] = []

      tracks.forEach((track, ti) => {
        if (!matched.has(ti) && track.album && track.album.toLowerCase() === album.album.toLowerCase()) {
          albumTracks.push(track)
          matched.add(ti)
        }
      })

      groups.push({
        album,
        tracks: albumTracks,
        expanded: expandedAlbums.has(`${album.artist}-${album.album}`),
      })
    }

    const ungrouped = tracks.filter((_, i) => !matched.has(i))
    return { albumGroups: groups, ungroupedTracks: ungrouped }
  }, [tracks, albums, expandedAlbums])

  const selectedTracks = tracks.filter((t) => t.selected)
  const selectedAlbums = albums.filter((a) => a.selected)
  const totalSelected = selectedTracks.length + selectedAlbums.filter((a) => {
    // Count albums that are selected but have no matched tracks (will be fetched from Spotify)
    const group = albumGroups.find((g) => g.album === a)
    return group && group.tracks.length === 0
  }).length
  const hasSelection = selectedTracks.length > 0 || selectedAlbums.some((a) => a.selected)

  const toggleExpanded = (album: UIAlbum) => {
    const key = `${album.artist}-${album.album}`
    setExpandedAlbums((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleAlbumSelect = (albumIndex: number, checked: boolean) => {
    // Toggle album selection
    setAlbums(albums.map((a, i) => (i === albumIndex ? { ...a, selected: checked } : a)))

    // Also toggle all matched tracks for this album
    const album = albums[albumIndex]
    setTracks(
      tracks.map((t) =>
        t.album && t.album.toLowerCase() === album.album.toLowerCase() ? { ...t, selected: checked } : t,
      ),
    )
  }

  const handleTrackSelect = (trackIndex: number, checked: boolean) => {
    const updated = tracks.map((t, i) => (i === trackIndex ? { ...t, selected: checked } : t))
    setTracks(updated)

    // Update album checkbox state: if all tracks in an album are deselected, deselect the album
    const track = tracks[trackIndex]
    if (track.album) {
      const albumIdx = albums.findIndex((a) => a.album.toLowerCase() === track.album?.toLowerCase())
      if (albumIdx !== -1) {
        const albumTracks = updated.filter(
          (t) => t.album && t.album.toLowerCase() === albums[albumIdx].album.toLowerCase(),
        )
        const allSelected = albumTracks.length > 0 && albumTracks.every((t) => t.selected)
        const noneSelected = albumTracks.every((t) => !t.selected)
        if (noneSelected) {
          setAlbums(albums.map((a, i) => (i === albumIdx ? { ...a, selected: false } : a)))
        } else if (allSelected) {
          setAlbums(albums.map((a, i) => (i === albumIdx ? { ...a, selected: true } : a)))
        }
      }
    }
  }

  const handleSelectAll = (checked: boolean) => {
    setTracks(tracks.map((t) => ({ ...t, selected: checked })))
    setAlbums(albums.map((a) => ({ ...a, selected: checked })))
  }

  const getTrackGlobalIndex = (track: UITrack) => {
    return tracks.findIndex((t) => t === track)
  }

  const handleCreatePlaylist = async () => {
    if (!hasSelection || !playlistName.trim()) return

    setIsCreatingPlaylist(true)
    setPlaylistResult(null)

    // For albums with no matched tracks, pass them separately so Spotify can fetch their tracks
    const albumsWithoutTracks = selectedAlbums.filter((a) => {
      const group = albumGroups.find((g) => g.album === a)
      return group && group.tracks.filter((t) => t.selected).length === 0
    })

    try {
      const result = await createPlaylist({
        name: playlistName.trim(),
        description: `Generated from ${data.title}`,
        tracks: selectedTracks,
        albums: albumsWithoutTracks.length > 0 ? albumsWithoutTracks : undefined,
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
              setTracks(tracks.map((t) => ({ ...t, selected: false })))
              setAlbums(albums.map((a) => ({ ...a, selected: false })))
            }}
            className="mt-2"
          >
            Create another playlist
          </Button>
        </CardContent>
      </Card>
    )
  }

  const allSelected =
    tracks.length + albums.length > 0 &&
    tracks.every((t) => t.selected) &&
    albums.every((a) => a.selected)

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
          <Label htmlFor="playlist-name" className="text-sm font-medium">
            Playlist name
          </Label>
          <Input
            id="playlist-name"
            value={playlistName}
            onChange={(e) => setPlaylistName(e.target.value)}
            placeholder="My playlist"
            className="max-w-sm"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={allSelected}
              onCheckedChange={handleSelectAll}
              disabled={tracks.length === 0 && albums.length === 0}
            />
            <label htmlFor="select-all" className="text-sm cursor-pointer select-none">
              Select all
            </label>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            {hasSelection && (
              <Badge variant="secondary" className="text-xs">
                {selectedTracks.length} tracks
                {selectedAlbums.length > 0 && ` + ${selectedAlbums.length} albums`}
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

        {/* Albums with expandable tracks */}
        <div className="space-y-3">
          {albumGroups.map((group, albumIdx) => {
            const isExpanded = expandedAlbums.has(`${group.album.artist}-${group.album.album}`)
            const albumTrackCount = group.tracks.length
            const selectedInAlbum = group.tracks.filter((t) => t.selected).length

            return (
              <div key={albumIdx} className="border border-border rounded-lg overflow-hidden">
                {/* Album header */}
                <div
                  className={`flex items-center gap-3 p-3 cursor-pointer transition-colors ${
                    group.album.selected ? "bg-green-50/50" : "hover:bg-muted/30"
                  }`}
                  onClick={() => toggleExpanded(group.album)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={group.album.selected}
                      onCheckedChange={(checked) => handleAlbumSelect(albumIdx, checked as boolean)}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {albumTrackCount > 0 ? (
                      isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )
                    ) : (
                      <div className="w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm text-foreground truncate">{group.album.album}</h4>
                    <p className="text-xs text-muted-foreground truncate">by {group.album.artist}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {group.album.year && (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {group.album.year}
                      </Badge>
                    )}
                    {albumTrackCount > 0 ? (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {selectedInAlbum > 0 && `${selectedInAlbum}/`}
                        {albumTrackCount} tracks
                      </Badge>
                    ) : group.album.trackCount ? (
                      <Badge variant="outline" className="text-xs px-1.5 py-0">
                        {group.album.trackCount} tracks
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {/* Expanded track list */}
                {isExpanded && albumTrackCount > 0 && (
                  <div className="border-t border-border">
                    <Table>
                      <TableBody>
                        {group.tracks.map((track) => {
                          const globalIdx = getTrackGlobalIndex(track)
                          return (
                            <TableRow
                              key={globalIdx}
                              className={`transition-colors cursor-pointer ${
                                track.selected ? "bg-green-50/30" : "hover:bg-muted/20"
                              }`}
                              onClick={() => handleTrackSelect(globalIdx, !track.selected)}
                            >
                              <TableCell className="w-12 pr-0" onClick={(e) => e.stopPropagation()}>
                                <Checkbox
                                  checked={track.selected}
                                  onCheckedChange={(checked) => handleTrackSelect(globalIdx, checked as boolean)}
                                />
                              </TableCell>
                              <TableCell className="font-medium text-sm">{track.artist}</TableCell>
                              <TableCell className="text-sm text-muted-foreground">{track.title}</TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* No tracks hint */}
                {isExpanded && albumTrackCount === 0 && (
                  <div className="border-t border-border p-3">
                    <p className="text-xs text-muted-foreground text-center">
                      No individual tracks found — selecting this album will fetch all tracks from Spotify
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Ungrouped tracks (not belonging to any album) */}
          {ungroupedTracks.length > 0 && (
            <div className="border border-border rounded-lg overflow-hidden">
              {albumGroups.length > 0 && (
                <div className="p-3 bg-muted/30 border-b border-border">
                  <h4 className="font-medium text-sm text-muted-foreground">Other tracks</h4>
                </div>
              )}
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12"></TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Artist
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      Title
                    </TableHead>
                    <TableHead className="text-xs font-medium uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                      Album
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ungroupedTracks.map((track) => {
                    const globalIdx = getTrackGlobalIndex(track)
                    return (
                      <TableRow
                        key={globalIdx}
                        className={`transition-colors cursor-pointer ${
                          track.selected ? "bg-green-50/50" : "hover:bg-muted/30"
                        }`}
                        onClick={() => handleTrackSelect(globalIdx, !track.selected)}
                      >
                        <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={track.selected}
                            onCheckedChange={(checked) => handleTrackSelect(globalIdx, checked as boolean)}
                          />
                        </TableCell>
                        <TableCell className="font-medium text-sm">{track.artist}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{track.title}</TableCell>
                        <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                          {track.album || "—"}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
