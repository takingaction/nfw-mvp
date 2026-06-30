import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendContactAcknowledgement, sendFreshdeskTicket, sendFreshdeskTicketRejectionEmail } from "@/lib/email";

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
  "free-membership": "Free Membership Request",
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, subject, message, website } = body;

    // Honeypot check - if website field has value, it's a bot
    if (website) {
      // Silent reject - return success to avoid revealing spam detection
      return NextResponse.json({ success: true });
    }

    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if user is logged in and update free membership contact status
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    const subjectLabel = subjectLabels[subject] || subject;

    // If this is a free membership request and user is logged in, update their profile
    if (subject === "free-membership" && user) {
      const profileUpdates: { free_membership_contact_submitted: boolean; membership_level?: string } = {
        free_membership_contact_submitted: true,
      };

      // If from_abandoned=true, downgrade to free membership and clear abandoned checkout
      if (body.from_abandoned === true) {
        profileUpdates.membership_level = "free";
        console.log("[contact-submit] Free membership request from abandoned checkout - clearing abandoned record for user:", user.id);
        const { error: deleteError } = await supabaseAdmin
          .from("abandoned_checkouts")
          .delete()
          .eq("user_id", user.id);

        if (deleteError) {
          console.error("[contact-submit] Failed to delete abandoned checkout:", deleteError);
        }
      }

      console.log("[contact-submit] Setting free_membership_contact_submitted=true for user:", user.id, "updates:", profileUpdates);
      await supabaseAdmin
        .from("profiles")
        .update(profileUpdates)
        .eq("id", user.id);
    }

    // Insert submission and get ID back
    const { data: insertData, error: insertError } = await supabaseAdmin
      .from("contact_submissions")
      .insert([
        {
          name,
          email,
          subject_label: subjectLabel,
          message,
          freshdesk_status: "pending",
        },
      ])
      .select("id")
      .single();

    if (insertError) {
      console.error("Failed to insert contact submission:", insertError);
    }

    const submissionId = insertData?.id;

    // Create Freshdesk ticket
    const freshdeskResult = await sendFreshdeskTicket({ name, email, subject: subjectLabel, message });
    let rejectionReason = null;

    if (freshdeskResult.success && submissionId) {
      // Success - update with ticket ID and status
      await supabaseAdmin
        .from("contact_submissions")
        .update({
          freshdesk_ticket_id: freshdeskResult.ticketId?.toString() || null,
          freshdesk_status: "created",
        })
        .eq("id", submissionId);
    } else if (!freshdeskResult.success && submissionId) {
      // Freshdesk rejected or errored - capture details
      rejectionReason = typeof freshdeskResult.error === "string"
        ? freshdeskResult.error
        : JSON.stringify(freshdeskResult.error);

      await supabaseAdmin
        .from("contact_submissions")
        .update({
          freshdesk_status: "rejected",
          freshdesk_response: rejectionReason,
        })
        .eq("id", submissionId);

      // Send rejection notification to admin
      try {
        await sendFreshdeskTicketRejectionEmail({
          name,
          email,
          subject: subjectLabel,
          message,
          rejectionReason,
        });
      } catch (emailErr) {
        console.error("Failed to send Freshdesk rejection email:", emailErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Contact form submission error:", err);
    return NextResponse.json({ success: true });
  }
}
