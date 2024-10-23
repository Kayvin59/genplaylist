'use client'

import { scrapeUrl } from "@/app/actions/generate"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"
import { useRef } from 'react'
import { useFormState, useFormStatus } from 'react-dom'

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Scraping...
        </>
      ) : (
        'Scrape Drop Watch Post'
      )}
    </Button>
  )
}

export default function UrlInput() {
  const [state, formAction] = useFormState(scrapeUrl, null)
  const formRef = useRef<HTMLFormElement>(null)

  return (
    <div className="w-full max-w-md space-y-4">
      <form ref={formRef} action={formAction} className="space-y-4">
        <Input
          type="url"
          name="url"
          placeholder="Enter r/hiphopheads URL"
          required
          className="w-full"
        />
        <SubmitButton />
      </form>
      {state?.error && (
        <p className="text-red-500 text-sm">{state.error}</p>
      )}
      {state?.success && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">{state.data.title}</h2>
          <ul className="mt-2 space-y-2">
            {state.data.links.map((link, index) => (
              <li key={index} className="border p-2 rounded">
                {link}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}