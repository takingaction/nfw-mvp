import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.text();
    console.log("Test webhook received:", body.substring(0, 500));
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Test webhook error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
