"use client"

import { musicScraper } from "@/app/actions/scrape"
import { useState } from "react"

interface ScrapeState {
  isLoading: boolean
  currentStep: "idle" | "scraping" | "analyzing" | "processing"
  stepMessage: string
  result: any | null
  error: string | null
}

export function useMusicScraper() {
  const [state, setState] = useState<ScrapeState>({
    isLoading: false,
    currentStep: "idle",
    stepMessage: "",
    result: null,
    error: null,
  })

  const scrapeUrl = async (url: string) => {
    setState({
      isLoading: true,
      currentStep: "scraping",
      stepMessage: "Starting...",
      result: null,
      error: null,
    })

    try {
      const result = await musicScraper(url)

      setState({
        isLoading: false,
        currentStep: "idle",
        stepMessage: "",
        result: result.success ? result.data : null,
        error: result.success ? null : result.error || "Unknown error",
      })

      return result
    } catch (error) {
      setState({
        isLoading: false,
        currentStep: "idle",
        stepMessage: "",
        result: null,
        error: error instanceof Error ? error.message : "Unknown error",
      })

      return { success: false, error: "Scraping failed" }
    }
  }

  const reset = () => {
    setState({
      isLoading: false,
      currentStep: "idle",
      stepMessage: "",
      result: null,
      error: null,
    })
  }

  return {
    ...state,
    scrapeUrl,
    reset,
  }
}
