import LoginButton from "@/components/LoginButton";

export default function Home() {
	return (
		<div className="flex flex-col items-center justify-center max-w-2xl mx-auto mt-8 sm:mt-16">
			<h1 className="mb-4 text-4xl sm:text-5xl font-bold tracking-tight text-foreground">
				Paste a link.<br />Get a playlist.
			</h1>
			<p className="text-base text-muted-foreground max-w-lg mx-auto mb-10">
				Drop any music article, blog post, or Reddit thread — we extract every track and create your Spotify playlist in seconds.
			</p>
			<LoginButton />
		</div>
	);
}
