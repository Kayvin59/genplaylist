import LoginButton from "@/components/LoginButton";

export default function Home() {
	return (
		<>
			<h1 className="mb-16 text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
				Generate playlist from your favorites music websites.
			</h1>
			<p className="text-lg text-gray-600 max-w-2xl mx-auto mb-14">Connect your Spotify account and transform any music URL into a curated playlist. We extract the tracks you love.</p>			<LoginButton />
		</>
	);
}
