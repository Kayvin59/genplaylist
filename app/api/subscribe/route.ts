import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
	// We only want to handle POST requests, everything else gets a 404
	if (req.method === "POST") {
		try {
			const emailResponse = await postHandler(req);
			return emailResponse;
		} catch (error) {
			console.log("Error:", error);
			return NextResponse.json(
				{ message: "Something went wrong" },
				{ status: 500 },
			);
		}
	} else {
		return NextResponse.json(
			{ message: "Only Post requests are allowed" },
			{ status: 404 },
		);
	}
}

async function postHandler(request: Request) {
	try {
		const { email } = await request.json();
		if (!email) {
			return NextResponse.json(
				{ message: "Email is required" },
				{ status: 400 },
			);
		}
		// Save the email to the database
		await saveEmail(email);
		return NextResponse.json(email);
	} catch (error) {
		console.log("Error:", error);
		return NextResponse.json(
			{ message: "Something went wrong" },
			{ status: 500 },
		);
	}
}

async function saveEmail(email: string) {
	try {
		const { data, error } = await supabase.from("EarlyUsers").insert({ email });
		if (error) {
			console.error("Error:", error);
			return NextResponse.json(
				{ message: "Something went wrong" },
				{ status: 500 },
			);
		}
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error:", error);
		return NextResponse.json(
			{ message: "Something went wrong" },
			{ status: 500 },
		);
	}
}
