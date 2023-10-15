import Link from "next/link";
import Image from "next/image";
import Logo from "../public/genplaylist2.svg";
import { Button } from "@/components/ui/button";

export default function Header() {
	return (
		<header className="flex xs:flex-row justify-between items-center w-full border-b sm:px-4 p-2 border-gray-500 gap-2">
			<Link href="/">
				<Image
					priority
					src={Logo}
					width={200}
					height={200}
					alt="Follow us on Twitter"
				/>
			</Link>
			<Button asChild className="mb-3">
				<Link href="/login">Login</Link>
			</Button>
		</header>
	);
}
