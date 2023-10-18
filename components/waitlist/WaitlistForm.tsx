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
	username: z
		.string()
		.min(2, {
			message: "Username must be at least 2 characters.",
		})
		.max(30, {
			message: "Username must not be longer than 30 characters.",
		}),
	email: z.string().min(1, { message: "Email is required" }).email({
		message: "Must be a valid email",
	}),
});

export default function WaitlistForm() {
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
	});

	function onSubmit(values: z.infer<typeof FormSchema>) {
		console.log("values:", values);
	}

	return (
		<Form {...form}>
			<form
				onSubmit={form.handleSubmit(onSubmit)}
				className="space-y-6 flex flex-col"
			>
				<FormField
					control={form.control}
					name="username"
					render={({ field }) => (
						<FormItem className="flex flex-wrap items-center gap-4">
							<FormLabel className="w-[22%] text-right">Username</FormLabel>
							<FormControl>
								<Input
									type="text"
									placeholder="playlistMaker"
									className="bg-white w-[73%]"
									{...field}
								/>
							</FormControl>
							<FormMessage className="w-full" />
						</FormItem>
					)}
				/>
				<FormField
					control={form.control}
					name="email"
					render={({ field }) => (
						<FormItem className="flex flex-wrap items-center gap-4">
							<FormLabel className="w-[22%] text-right">Email</FormLabel>
							<FormControl>
								<Input
									type="email"
									placeholder="myusername@genplaylist.com"
									className="bg-white w-[73%]"
									{...field}
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
