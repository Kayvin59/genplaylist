"use client"

import { scrapeUrl } from "@/app/actions/generate"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Loader2, Search, X } from "lucide-react"
import { useRef, useState } from "react"
import { useFormState, useFormStatus } from "react-dom"
import ScrapedDataTable from "./data-table"

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button
      type="submit"
      className="w-full max-w-md bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white font-semibold py-3 shadow-lg hover:shadow-xl transition-all duration-200"
      disabled={pending}
    >
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Analyzing Content...
        </>
      ) : (
        <>
          <Search className="mr-2 h-4 w-4" />
          Extract Music Tracks
        </>
      )}
    </Button>
  )
}

export default function UrlInput() {
  const [state, formAction] = useFormState(scrapeUrl, null)
  const [url, setUrl] = useState("")
  const formRef = useRef<HTMLFormElement>(null)

  const clearUrl = () => {
    setUrl("")
    if (formRef.current) {
      formRef.current.reset()
    }
  }

  return (
    <div className="w-full max-w-4xl space-y-8">
      <Card className="shadow-xl border border-gray-500 bg-gradient-to-br from-white to-gray-50">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800">
            Paste any music-related URL to extract tracks and create playlists
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form ref={formRef} action={formAction} className="space-y-4">
            <div className="relative">
              <Input
                type="url"
                name="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.reddit.com/r/hiphopheads/comments/..."
                required
                className="w-full pr-10 py-3 text-base mb-6 border-gray-300 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
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
            <SubmitButton />
          </form>

          {state?.error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm font-medium text-red-800 text-center">{state.error}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {state?.success && <ScrapedDataTable data={state.data} />}
    </div>
  )
}
