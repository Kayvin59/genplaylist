import "./globals.css";
import { Analytics } from "@vercel/analytics/react";
import type { Metadata } from "next";
import { Roboto } from "next/font/google";

const roboto = Roboto({
	weight: ["400", "700"],
	subsets: ["latin"],
	display: "swap",
});

export const metadata: Metadata = {
	title: "GenPlaylist",
	description: "Generate playlist from your favorites music websites",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={`${roboto.className}`}>
				{children}
				<Analytics />
			</body>
		</html>
	);
}
