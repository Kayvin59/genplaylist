import { Check } from "lucide-react"
import type { Metadata } from "next"

import PricingCards from "./pricing-cards"

export const metadata: Metadata = {
  title: "Pricing — GenPlaylist",
  description:
    "Credit packs to create Spotify playlists from any URL. Pay once, use anytime — credits never expire.",
}

const FEATURES = [
  { label: "Paste any music URL", free: true, paid: true },
  { label: "AI-powered track extraction", free: true, paid: true },
  { label: "Create Spotify playlists", free: false, paid: true },
  { label: "Credits never expire", free: false, paid: true },
  { label: "Playlist history", free: false, paid: true },
]

export default function PricingPage() {
  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-foreground mb-3">
          Simple, transparent pricing
        </h1>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Pay once, use anytime. 1 credit = 1 playlist created. No subscriptions, no hidden fees.
        </p>
      </div>

      <PricingCards />

      {/* Feature comparison */}
      <div className="mt-16 max-w-lg mx-auto">
        <h2 className="text-lg font-semibold text-center mb-6">
          What&apos;s included
        </h2>
        <div className="space-y-3">
          {FEATURES.map((feature) => (
            <div
              key={feature.label}
              className="flex items-center gap-3 text-sm"
            >
              <Check
                className={`h-4 w-4 flex-shrink-0 ${
                  feature.paid ? "text-primary" : "text-muted-foreground"
                }`}
              />
              <span
                className={
                  feature.paid ? "text-foreground" : "text-muted-foreground"
                }
              >
                {feature.label}
              </span>
              {!feature.free && (
                <span className="ml-auto text-xs text-primary font-medium">
                  Credit packs
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="mt-16 max-w-lg mx-auto mb-8">
        <h2 className="text-lg font-semibold text-center mb-6">
          Frequently asked questions
        </h2>
        <div className="space-y-5">
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Do credits expire?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              No. Credits never expire — use them whenever you want.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">
              What counts as 1 credit?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Creating a playlist costs 1 credit, regardless of how many tracks
              it contains. Scraping and previewing tracks is free.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">
              Can I get a refund?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Unused credits can be refunded within 14 days of purchase. Contact
              us at support.
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">
              What happens to my playlists if I run out of credits?
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your playlists stay on Spotify forever — they&apos;re yours. You
              just need credits to create new ones.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
