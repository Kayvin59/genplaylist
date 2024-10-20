import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import "./globals.css";

const roboto = Roboto({
	weight: ["400", "700"],
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "GenPlaylist",
	description:
		"Easily generate playlist from your favorite music websites with GenPlaylist. Share your link and get a playlist on any streaming platform.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			<html lang="en">
				<body className={`${roboto.className}`}>
					<div className="flex max-w-6xl mx-auto flex-col items-center min-h-screen">
						<Header />
						<main className="flex flex-1 w-full flex-col items-center justify-start text-center py-12 px-6">
							{children}
							<Analytics />
						</main>
						<Footer />
					</div>
				</body>
			</html>
		</>
	);
}
