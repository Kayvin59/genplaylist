export default function GenerateLoading() {
  return (
    <div className="w-full flex flex-col items-center justify-center animate-pulse gap-6">
      {/* Welcome banner skeleton */}
      <div className="flex items-center gap-3 w-full max-w-md">
        <div className="w-10 h-10 rounded-full bg-muted flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-5 w-40 bg-muted rounded" />
          <div className="h-3 w-24 bg-muted rounded" />
        </div>
      </div>

      {/* URL input card skeleton */}
      <div className="w-full max-w-4xl border border-border rounded-lg p-6 space-y-4">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-48 bg-muted rounded" />
          <div className="h-4 w-64 bg-muted rounded" />
        </div>
        <div className="h-11 w-full bg-muted rounded-lg" />
        <div className="h-11 w-full bg-muted rounded-lg" />
      </div>
    </div>
  )
}
