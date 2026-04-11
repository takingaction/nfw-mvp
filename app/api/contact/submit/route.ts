import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendContactFormEmail } from "@/lib/email";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const subjectLabels: Record<string, string> = {
  microgrant: "Microgrant question",
  membership: "Membership and billing",
  perks: "Perks and discounts",
  store: "Zero Dollar Store",
  account: "My account",
  partnership: "Partnership inquiry",
  press: "Press and media",
  other: "Something else",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message } = body;

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const subjectLabel = subjectLabels[subject] || subject;

    const { error: insertError } = await supabaseAdmin
      .from("contact_submissions")
      .insert([
        {
          name,
          email,
          subject_label: subjectLabel,
          message,
        },
      ]);

    if (insertError) {
      console.error("Failed to insert contact submission:", insertError);
    }

    sendContactFormEmail({ name, email, subject: subjectLabel, message });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact form submission error:", err);
    return NextResponse.json({ success: true });
  }
}
