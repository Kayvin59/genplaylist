import Link from "next/link";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";

export default function Home() {
	return (
		<div className="flex max-w-6xl mx-auto flex-col items-center min-h-screen">
			<Header />
			<main className="flex flex-1 w-full flex-col items-center justify-start text-center py-12">
				<h1 className="mb-6 text-6xl font-bold">
					Generate playlist from your favorites music websites
				</h1>
				<h2 className="mb-6 text-2xl">
					Share your link and get a playlist, on any streaming platform
				</h2>
				<Button asChild>
					<Link href="/login">Login</Link>
				</Button>
			</main>
			<Footer />
		</div>
	);
}
