import { NextResponse } from "next/server";
import { sendBankAccountConnectedAdminEmail } from "@/lib/email";

export async function POST() {
  try {
    await sendBankAccountConnectedAdminEmail({
      memberName: "Test Member",
      memberEmail: "ronpassaro@gmail.com",
      grantCycleName: "Test Grant Cycle - May 2026",
      grantId: "test-grant-id-123",
    });

    return NextResponse.json({ success: true, message: "Test email sent" });
  } catch (err: any) {
    console.error("[Test Email] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}