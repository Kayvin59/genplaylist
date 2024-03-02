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
import { CheckCircle2, Loader2 } from "lucide-react";

const FormSchema = z.object({
	email: z.string().min(1, { message: "Email is required" }).email({
		message: "Must be a valid email",
	}),
});

export default function WaitlistForm() {
	const form = useForm<z.infer<typeof FormSchema>>({
		resolver: zodResolver(FormSchema),
		defaultValues: {
			email: "",
		},
	});

	const isSubmitting = form.formState.isSubmitting;
	const isSubmitSuccessful = form.formState.isSubmitSuccessful;

	function renderSubmitButton() {
		if (isSubmitting) {
			return (
				<Button type="submit" className="gap-4 self-end">
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Submiting...
				</Button>
			);
		} else {
			return (
				<Button type="submit" className="gap-4 self-end">
					Submit
				</Button>
			);
		}
	}

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
				form.reset();
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
									className="bg-white m-0"
									{...field}
								/>
							</FormControl>
							<FormMessage className="w-full" />
						</FormItem>
					)}
				/>
				{renderSubmitButton()}
				{isSubmitSuccessful && (
					<div className="flex flex-col gap-2 text-center text-muted-foreground">
						<CheckCircle2 className="text-green-500 mx-auto my-0" />
						<span className="text-2xl text-foreground uppercase font-bold">
							Success!
						</span>
						<span>Your email has been added to the GenPlaylist waitlist.</span>
						<span>
							We're thrilled to have you on board. Watch your inbox for exciting
							updates!
						</span>
					</div>
				)}
			</form>
		</Form>
	);
}
