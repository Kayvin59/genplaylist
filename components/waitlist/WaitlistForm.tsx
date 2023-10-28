"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

const FormSchema = z.object({
	email: z.string().min(1, { message: "Email is required" }).email({
		message: "Must be a valid email",
	}),
});

export default function WaitlistForm() {
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
	});

	async function onSubmit(data: z.infer<typeof FormSchema>) {
		try {
			const response = await fetch("/api/subscribe", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(data),
			});
			console.log("response:", response);

			if (response.ok) {
				const responseData = await response.json();
				return responseData;
			} else {
				console.log("Server returned an error::", response.status);
			}
		} catch (error) {
			console.error("error:", error);
		}
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="space-y-6 flex flex-col"
			>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem className="flex flex-col flex-wrap items-start">
							<FormLabel className="text-right pr-2">Email</FormLabel>
							<FormControl>
								<Input
									type="email"
									placeholder="username@genplaylist.com"
									className="bg-white w-[75%] m-0"
									{...field}
									onChange={(event) => {
										event.preventDefault();
									}}
								/>
							</FormControl>
							<FormMessage className="w-full" />
						</FormItem>
					)}
				/>
				<Button type="submit" className="gap-4 self-end">
					Submit
				</Button>
			</form>
		</Form>
	);
}
