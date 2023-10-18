"use client";

import WaitlistForm from "@/components/waitlist/WaitlistForm";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";

export default function WaitlistDialog() {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button className="font-bold">Join the waitlist</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px] border-[#707070] max-w-[80%] rounded">
				<DialogHeader className="mb-2">
					<DialogTitle>Join the waitlist!</DialogTitle>
					<DialogDescription>
						Enter your details. Click submit when you're done.
					</DialogDescription>
				</DialogHeader>
				<WaitlistForm />
			</DialogContent>
		</Dialog>
	);
}
