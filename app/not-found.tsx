import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Music } from "lucide-react"
import Link from "next/link"

export default function NotFound() {
  return (
    <div className="flex flex-1 items-center justify-center p-4">
      <Card className="w-full max-w-md border border-border">
        <CardContent className="p-8 text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-14 h-14 bg-muted border border-border rounded-full flex items-center justify-center">
              <Music className="w-7 h-7 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-1">Page not found</h2>
            <p className="text-sm text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>
          <Button asChild size="sm" className="bg-[#1DB954] hover:bg-[#1aa34a] text-black">
            <Link href="/">Go home</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
