"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import { useState } from "react"

const PACKS = [
  {
    type: "starter",
    name: "Starter",
    credits: 10,
    price: "5",
    perCredit: "0.50",
    popular: false,
  },
  {
    type: "value",
    name: "Value",
    credits: 25,
    price: "10",
    perCredit: "0.40",
    popular: true,
  },
  {
    type: "power",
    name: "Power",
    credits: 60,
    price: "20",
    perCredit: "0.33",
    popular: false,
  },
]

export default function PricingCards() {
  const [loadingPack, setLoadingPack] = useState<string | null>(null)

  async function handlePurchase(packType: string) {
    setLoadingPack(packType)
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ packType }),
      })

      const data = await res.json()

      if (!res.ok) {
        // Not logged in — redirect to home
        if (res.status === 401) {
          window.location.href = "/"
          return
        }
        throw new Error(data.error || "Failed to create checkout session")
      }

      window.location.href = data.url
    } catch (error) {
      console.error("Checkout error:", error)
      setLoadingPack(null)
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {PACKS.map((pack) => (
        <div
          key={pack.type}
          className={`relative flex flex-col items-center rounded-xl border p-6 transition-colors ${
            pack.popular
              ? "border-primary bg-primary/5 shadow-sm"
              : "border-border"
          }`}
        >
          {pack.popular && (
            <Badge className="absolute -top-2.5">Best value</Badge>
          )}

          <h3 className="mt-1 text-lg font-semibold">{pack.name}</h3>

          <div className="mt-4 flex items-baseline gap-1">
            <span className="text-4xl font-bold">{pack.price}&euro;</span>
          </div>

          <p className="mt-1 text-sm text-muted-foreground">
            {pack.credits} credits
          </p>
          <p className="text-xs text-muted-foreground">
            {pack.perCredit}&euro; per playlist
          </p>

          <Button
            className={`mt-6 w-full ${
              pack.popular
                ? "bg-[#1DB954] hover:bg-[#1aa34a] text-black"
                : ""
            }`}
            variant={pack.popular ? "default" : "outline"}
            disabled={loadingPack !== null}
            onClick={() => handlePurchase(pack.type)}
          >
            {loadingPack === pack.type ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Get started"
            )}
          </Button>
        </div>
      ))}
    </div>
  )
}
