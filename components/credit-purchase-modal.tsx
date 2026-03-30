"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2, Zap } from "lucide-react"
import { useState } from "react"

const PACKS = [
  {
    type: "starter",
    name: "Starter",
    credits: 10,
    price: "5.00",
    perCredit: "0.50",
  },
  {
    type: "value",
    name: "Value",
    credits: 25,
    price: "10.00",
    perCredit: "0.40",
    popular: true,
  },
  {
    type: "power",
    name: "Power",
    credits: 60,
    price: "20.00",
    perCredit: "0.33",
  },
] as const

interface CreditPurchaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  creditsRemaining?: number
}

export default function CreditPurchaseModal({
  open,
  onOpenChange,
  creditsRemaining = 0,
}: CreditPurchaseModalProps) {
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
        throw new Error(data.error || "Failed to create checkout session")
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error) {
      console.error("Checkout error:", error)
      setLoadingPack(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Get Credits
          </DialogTitle>
          <DialogDescription>
            1 credit = 1 playlist created. Credits never expire.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-3 gap-3 py-4">
          {PACKS.map((pack) => (
            <div
              key={pack.type}
              className={`relative flex flex-col items-center rounded-lg border p-4 transition-colors ${
                pack.popular
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/50"
              }`}
            >
              {pack.popular && (
                <Badge className="absolute -top-2.5 text-[10px]">
                  Best value
                </Badge>
              )}
              <span className="mt-1 text-sm font-semibold">{pack.name}</span>
              <span className="mt-2 text-2xl font-bold">{pack.credits}</span>
              <span className="text-xs text-muted-foreground">credits</span>
              <span className="mt-3 text-lg font-bold">{pack.price}&euro;</span>
              <span className="text-[11px] text-muted-foreground">
                {pack.perCredit}&euro;/credit
              </span>
              <Button
                className="mt-3 w-full"
                size="sm"
                variant={pack.popular ? "default" : "outline"}
                disabled={loadingPack !== null}
                onClick={() => handlePurchase(pack.type)}
              >
                {loadingPack === pack.type ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Buy"
                )}
              </Button>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          You have{" "}
          <span className="font-semibold text-foreground">
            {creditsRemaining}
          </span>{" "}
          credit{creditsRemaining !== 1 ? "s" : ""} remaining
        </p>
      </DialogContent>
    </Dialog>
  )
}
