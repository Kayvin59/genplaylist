import LoginButton from "@/components/LoginButton";

export default function Home() {
	return (
		<>
			<h1 className="mb-10 text-5xl sm:text-6xl font-bold">
				Generate playlist from your favorites music websites.
			</h1>
			<h2 className="mb-10 text-lg sm:text-xl text-secondary-foreground font-bold">
				Share your link and get a playlist, on any streaming platform.
			</h2>
			<LoginButton />
		</>
	);
}
