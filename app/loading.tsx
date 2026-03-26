export default function Loading() {
	return (
		<div className="flex flex-1 flex-col items-center justify-start w-full max-w-2xl mx-auto mt-8 sm:mt-16 gap-6 animate-pulse">
			{/* Title skeleton */}
			<div className="space-y-3 w-full flex flex-col items-center">
				<div className="h-10 w-3/4 bg-muted rounded-lg" />
				<div className="h-5 w-1/2 bg-muted rounded-lg" />
			</div>
			{/* Button skeleton */}
			<div className="h-11 w-48 bg-muted rounded-lg" />
		</div>
	);
}
