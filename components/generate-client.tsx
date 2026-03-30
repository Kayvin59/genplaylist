"use client"

import MusicUrlInput from "@/components/MusicUrlInput"
import { useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

interface GenerateClientProps {
  initialCredits: number
}

export default function GenerateClient({ initialCredits }: GenerateClientProps) {
  const [creditsRemaining, setCreditsRemaining] = useState(initialCredits)
  const searchParams = useSearchParams()
  const checkoutStatus = searchParams.get("checkout")

  // Refresh credits after successful checkout
  useEffect(() => {
    if (checkoutStatus === "success") {
      // Fetch updated credits from the server
      fetch("/api/credits")
        .then((res) => res.json())
        .then((data) => {
          if (data.credits !== undefined) {
            setCreditsRemaining(data.credits)
          }
        })
        .catch(console.error)
    }
  }, [checkoutStatus])

  return (
    <>
      {checkoutStatus === "success" && (
        <div className="w-full max-w-4xl mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-center">
          <p className="text-sm font-medium text-green-800">
            Payment successful! You now have {creditsRemaining} credits.
          </p>
        </div>
      )}
      {checkoutStatus === "cancelled" && (
        <div className="w-full max-w-4xl mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
          <p className="text-sm font-medium text-amber-800">
            Checkout cancelled. No credits were charged.
          </p>
        </div>
      )}
      <MusicUrlInput
        creditsRemaining={creditsRemaining}
        onCreditsChange={setCreditsRemaining}
      />
    </>
  )
}
