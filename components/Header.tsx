import Image from "next/image";
import Link from "next/link";
import Logo from "../public/genplaylist2.svg";

export default function Header() {
	return (
		<header className="flex xs:flex-row justify-center items-center w-full border-b sm:px-6 p-4 border-border gap-2">
			<Link href="/">
				<Image priority src={Logo} width={280} height={56} alt="Genplaylist" />
			</Link>
		</header>
	);
}
