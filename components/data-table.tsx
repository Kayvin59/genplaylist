"use client"

import { createPlaylist, fetchAlbumTracks } from "@/app/actions/spotify"
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
  const [loadingAlbumTracks, setLoadingAlbumTracks] = useState<Set<string>>(new Set())

  const router = useRouter()

  useEffect(() => {
    console.log("[ScrapedDataTable] Received data prop:", {
      title: data.title,
      tracksCount: data.tracks?.length,
      albumsCount: data.albums?.length,
      tracks: data.tracks,
      albums: data.albums,
    })

    // Standalone tracks (not belonging to any album)
    const convertedTracks = data.tracks.map((track) => ({
      title: track.title,
      artist: track.artist,
      album: track.album,
      selected: false,
    }))
    setTracks(convertedTracks)

    // Albums with their tracks converted to UITrack[]
    const convertedAlbums: UIAlbum[] = data.albums.map((album) => ({
      ...album,
      selected: false,
      tracks: (album.tracks || []).map((t) => ({
        title: t.title,
        artist: t.artist,
        album: album.album,
        selected: false,
      })),
    }))
    setAlbums(convertedAlbums)
    const truncatedTitle = data.title.length > 40 ? data.title.slice(0, 40) + "..." : data.title
    setPlaylistName(`${truncatedTitle} Playlist`)
  }, [data])

  // Build album groups from album state (tracks live on each album)
  const albumGroups: AlbumGroup[] = useMemo(() => {
    return albums.map((album) => ({
      album,
      tracks: album.tracks || [],
      expanded: expandedAlbums.has(`${album.artist}-${album.album}`),
    }))
  }, [albums, expandedAlbums])

  // All selected tracks across albums + ungrouped
  const allSelectedTracks = [
    ...tracks.filter((t) => t.selected),
    ...albums.flatMap((a) => (a.tracks || []).filter((t) => t.selected)),
  ]
  const selectedAlbums = albums.filter((a) => a.selected)
  // Albums selected but with no tracks at all (will be fetched from Spotify)
  const albumsOnlySelected = selectedAlbums.filter((a) => !a.tracks?.length)
  const hasSelection = allSelectedTracks.length > 0 || albumsOnlySelected.length > 0

  const toggleExpanded = async (album: UIAlbum, albumIndex: number) => {
    const key = `${album.artist}-${album.album}`
    const isCurrentlyExpanded = expandedAlbums.has(key)

    setExpandedAlbums((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })

    // Fetch tracks from Spotify if expanding and album has no tracks yet
    if (!isCurrentlyExpanded && (!album.tracks || album.tracks.length === 0)) {
      setLoadingAlbumTracks((prev) => new Set(prev).add(key))
      try {
        const result = await fetchAlbumTracks(album.artist, album.album)
        if (result.needsAuth) {
          router.push("/")
          return
        }
        if (result.success && result.tracks && result.tracks.length > 0) {
          setAlbums((prev) =>
            prev.map((a, i) =>
              i === albumIndex
                ? {
                    ...a,
                    tracks: result.tracks!.map((t) => ({ ...t, selected: a.selected })),
                  }
                : a,
            ),
          )
        }
      } catch (error) {
        console.error("Failed to fetch album tracks:", error)
      } finally {
        setLoadingAlbumTracks((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    }
  }

  const handleAlbumSelect = async (albumIndex: number, checked: boolean) => {
    const album = albums[albumIndex]
    setAlbums(
      albums.map((a, i) =>
        i === albumIndex
          ? { ...a, selected: checked, tracks: (a.tracks || []).map((t) => ({ ...t, selected: checked })) }
          : a,
      ),
    )

    // If selecting an album with no tracks, fetch them from Spotify
    if (checked && (!album.tracks || album.tracks.length === 0)) {
      const key = `${album.artist}-${album.album}`
      setLoadingAlbumTracks((prev) => new Set(prev).add(key))
      // Auto-expand the album so user sees tracks loading
      setExpandedAlbums((prev) => new Set(prev).add(key))
      try {
        const result = await fetchAlbumTracks(album.artist, album.album)
        if (result.needsAuth) {
          router.push("/")
          return
        }
        if (result.success && result.tracks && result.tracks.length > 0) {
          setAlbums((prev) =>
            prev.map((a, i) =>
              i === albumIndex
                ? { ...a, tracks: result.tracks!.map((t) => ({ ...t, selected: true })) }
                : a,
            ),
          )
        }
      } catch (error) {
        console.error("Failed to fetch album tracks:", error)
      } finally {
        setLoadingAlbumTracks((prev) => {
          const next = new Set(prev)
          next.delete(key)
          return next
        })
      }
    }
  }

  const handleAlbumTrackSelect = (albumIndex: number, trackIndex: number, checked: boolean) => {
    setAlbums(
      albums.map((a, i) => {
        if (i !== albumIndex) return a
        const updatedTracks = (a.tracks || []).map((t, ti) => (ti === trackIndex ? { ...t, selected: checked } : t))
        const allSelected = updatedTracks.length > 0 && updatedTracks.every((t) => t.selected)
        const noneSelected = updatedTracks.every((t) => !t.selected)
        return {
          ...a,
          tracks: updatedTracks,
          selected: allSelected ? true : noneSelected ? false : a.selected,
        }
      }),
    )
  }

  const handleUngroupedTrackSelect = (trackIndex: number, checked: boolean) => {
    setTracks(tracks.map((t, i) => (i === trackIndex ? { ...t, selected: checked } : t)))
  }

  const handleSelectAll = async (checked: boolean) => {
    setTracks(tracks.map((t) => ({ ...t, selected: checked })))
    setAlbums(
      albums.map((a) => ({
        ...a,
        selected: checked,
        tracks: (a.tracks || []).map((t) => ({ ...t, selected: checked })),
      })),
    )

    // When selecting all, fetch tracks for albums that don't have them yet
    if (checked) {
      const albumsWithoutTracks = albums
        .map((a, i) => ({ album: a, index: i }))
        .filter(({ album }) => !album.tracks || album.tracks.length === 0)

      await Promise.all(
        albumsWithoutTracks.map(async ({ album, index }) => {
          const key = `${album.artist}-${album.album}`
          setLoadingAlbumTracks((prev) => new Set(prev).add(key))
          try {
            const result = await fetchAlbumTracks(album.artist, album.album)
            if (result.success && result.tracks && result.tracks.length > 0) {
              setAlbums((prev) =>
                prev.map((a, i) =>
                  i === index
                    ? { ...a, tracks: result.tracks!.map((t) => ({ ...t, selected: true })) }
                    : a,
                ),
              )
            }
          } catch (error) {
            console.error("Failed to fetch album tracks:", error)
          } finally {
            setLoadingAlbumTracks((prev) => {
              const next = new Set(prev)
              next.delete(key)
              return next
            })
          }
        }),
      )
    }
  }

  const handleCreatePlaylist = async () => {
    if (!hasSelection || !playlistName.trim()) return

    setIsCreatingPlaylist(true)
    setPlaylistResult(null)

    try {
      const result = await createPlaylist({
        name: playlistName.trim(),
        description: `Generated from ${data.title}`,
        tracks: allSelectedTracks,
        albums: albumsOnlySelected.length > 0 ? albumsOnlySelected : undefined,
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
                {allSelectedTracks.length} tracks
                {albumsOnlySelected.length > 0 && ` + ${albumsOnlySelected.length} albums`}
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
                  onClick={() => toggleExpanded(group.album, albumIdx)}
                >
                  <div onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={group.album.selected}
                      onCheckedChange={(checked) => handleAlbumSelect(albumIdx, checked as boolean)}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
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
                        {group.tracks.map((track, trackIdx) => (
                          <TableRow
                            key={trackIdx}
                            className={`transition-colors cursor-pointer ${
                              track.selected ? "bg-green-50/30" : "hover:bg-muted/20"
                            }`}
                            onClick={() => handleAlbumTrackSelect(albumIdx, trackIdx, !track.selected)}
                          >
                            <TableCell className="w-12 pr-0" onClick={(e) => e.stopPropagation()}>
                              <Checkbox
                                checked={track.selected}
                                onCheckedChange={(checked) =>
                                  handleAlbumTrackSelect(albumIdx, trackIdx, checked as boolean)
                                }
                              />
                            </TableCell>
                            <TableCell className="font-medium text-sm">{track.artist}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">{track.title}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}

                {/* Loading tracks from Spotify */}
                {isExpanded && albumTrackCount === 0 && loadingAlbumTracks.has(`${group.album.artist}-${group.album.album}`) && (
                  <div className="border-t border-border p-3 flex items-center justify-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Fetching tracks from Spotify...</p>
                  </div>
                )}

                {/* No tracks found after fetch */}
                {isExpanded && albumTrackCount === 0 && !loadingAlbumTracks.has(`${group.album.artist}-${group.album.album}`) && (
                  <div className="border-t border-border p-3">
                    <p className="text-xs text-muted-foreground text-center">
                      No tracks found on Spotify for this album
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Ungrouped tracks (not belonging to any album) */}
          {tracks.length > 0 && (
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
                  {tracks.map((track, idx) => (
                    <TableRow
                      key={idx}
                      className={`transition-colors cursor-pointer ${
                        track.selected ? "bg-green-50/50" : "hover:bg-muted/30"
                      }`}
                      onClick={() => handleUngroupedTrackSelect(idx, !track.selected)}
                    >
                      <TableCell className="pr-0" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={track.selected}
                          onCheckedChange={(checked) => handleUngroupedTrackSelect(idx, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell className="font-medium text-sm">{track.artist}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{track.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">
                        {track.album || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
