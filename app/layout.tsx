import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { SpeedInsights } from '@vercel/speed-insights/next';
import type { Metadata } from "next";
import { Roboto } from "next/font/google";
import React from "react";
import "./globals.css";

const roboto = Roboto({
	weight: ["400", "700"],
	subsets: ["latin"],
	display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://gen-playlist.vercel.app";

export const metadata: Metadata = {
	metadataBase: new URL(siteUrl),
	title: {
		default: "GenPlaylist — Paste a link, get a playlist",
		template: "%s | GenPlaylist",
	},
	description:
		"Paste any music article, blog post, or Reddit thread — GenPlaylist extracts every track and creates your Spotify playlist in seconds.",
	openGraph: {
		type: "website",
		siteName: "GenPlaylist",
		title: "GenPlaylist — Paste a link, get a playlist",
		description:
			"Paste any music article, blog post, or Reddit thread — GenPlaylist extracts every track and creates your Spotify playlist in seconds.",
		url: siteUrl,
		images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GenPlaylist" }],
	},
	twitter: {
		card: "summary_large_image",
		title: "GenPlaylist — Paste a link, get a playlist",
		description:
			"Paste any music article, blog post, or Reddit thread — GenPlaylist extracts every track and creates your Spotify playlist in seconds.",
		images: ["/og-image.png"],
	},
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
						</main>
						<Footer />
					</div>
					<SpeedInsights />
				</body>
			</html>
		</>
	);
}
