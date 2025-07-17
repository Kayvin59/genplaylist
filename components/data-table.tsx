"use client"

import { createPlaylist } from "@/app/actions/spotify"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Music } from "lucide-react"
import { useEffect, useState } from "react"

interface Track {
  title: string
  artist: string
  selected: boolean
}

interface ScrapedDataTableProps {
  data: {
    title: string
    links: string[]
  }
}

export default function ScrapedDataTable({ data }: ScrapedDataTableProps) {
  const [tracks, setTracks] = useState<Track[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [isCreatingPlaylist, setIsCreatingPlaylist] = useState(false)

  // Parse track information from links
  useEffect(() => {
    const parsedTracks = data.links.map((link) => {
      // Simple parsing: "Artist - Song Title" or just use the full text
      const dashIndex = link.indexOf(" - ")
      let artist = "Unknown Artist"
      let title = link

      if (dashIndex > 0) {
        artist = link.substring(0, dashIndex).trim()
        title = link.substring(dashIndex + 3).trim()
      }

      return {
        title,
        artist,
        selected: false,
      }
    })
    setTracks(parsedTracks)
  }, [data.links])

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked)
    setTracks(tracks.map((track) => ({ ...track, selected: checked })))
  }

  const handleTrackSelect = (index: number, checked: boolean) => {
    const updatedTracks = tracks.map((track, i) => (i === index ? { ...track, selected: checked } : track))
    setTracks(updatedTracks)
    setSelectAll(updatedTracks.every((track) => track.selected))
  }

  const selectedTracks = tracks.filter((track) => track.selected)

  const handleCreatePlaylist = async () => {
    if (selectedTracks.length === 0) return

    setIsCreatingPlaylist(true)
    try {
      const result = await createPlaylist({
        name: `${data.title} - Generated`,
        description: `Generated from ${data.title}`,
        tracks: selectedTracks,
      })

      if (result.success) {
        alert(`Playlist created! Added ${result.tracksAdded}/${selectedTracks.length} tracks`)
      }
    } catch (error) {
      console.error("Failed to create playlist:", error)
      alert("Failed to create playlist. Please try again.")
    } finally {
      setIsCreatingPlaylist(false)
    }
  }

  return (
    <Card className="w-full border border-gray-500">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          {data.title}
        </CardTitle>
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{tracks.length} tracks found</Badge>
          <Badge variant="outline">{selectedTracks.length} selected</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="select-all"
              checked={selectAll}
              onCheckedChange={handleSelectAll}
              disabled={tracks.length === 0}
            />
            <label htmlFor="select-all" className="text-sm font-medium cursor-pointer">
              Select All
            </label>
          </div>
          <Button
            onClick={handleCreatePlaylist}
            disabled={selectedTracks.length === 0 || isCreatingPlaylist}
            className="bg-green-500 hover:bg-green-600"
          >
            {isCreatingPlaylist ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              `Create Playlist (${selectedTracks.length})`
            )}
          </Button>
        </div>

        <div className="border rounded-md">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Select</TableHead>
                <TableHead>Artist</TableHead>
                <TableHead>Title</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tracks.map((track, index) => (
                <TableRow key={index}>
                  <TableCell>
                    <Checkbox
                      checked={track.selected}
                      onCheckedChange={(checked) => handleTrackSelect(index, checked as boolean)}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{track.artist}</TableCell>
                  <TableCell>{track.title}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
