import { Button } from "@/components/ui/button";
import { ArrowUpRightSquare } from 'lucide-react';
import Link from "next/link";

export default function Home() {
	return (
		<>
			<h1 className="mb-10 text-5xl sm:text-6xl font-bold">
				Generate playlist from your favorites music websites.
			</h1>
			<h2 className="mb-10 text-lg sm:text-xl text-secondary-foreground font-bold">
				Share your link and get a playlist, on any streaming platform.
			</h2>
			<Button asChild className="text-lg font-semibold p-5">
				<Link href="/generate">
					Generate your playlist now
					<span className=" ml-4 text-lg font-semibold">
						<ArrowUpRightSquare />
					</span>
				</Link>
			</Button>
		</>
	);
}
