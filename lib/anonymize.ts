import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

const supabaseAdmin = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function generateHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

function hashUserId(userId: string): string {
  return `anon_${generateHash(userId)}`;
}

export interface AnonymizationResult {
  success: boolean;
  error?: string;
  details?: {
    profilesAnonymized?: boolean;
    authUpdated?: boolean;
    grantsAnonymized?: number;
    documentsDeleted?: number;
    redemptionsDeleted?: number;
    zdcClaimsAnonymized?: number;
    storeLikesDeleted?: number;
    nfwPerkRedemptionsDeleted?: number;
    contactSubmissionsAnonymized?: number;
    testimonialsDeleted?: number;
    giftCodesAnonymized?: number;
    giftPurchasesAnonymized?: number;
  };
}

export async function anonymizeUser(
  userId: string,
  deletionRequestId: string,
  adminUserId: string
): Promise<AnonymizationResult> {
  const errors: string[] = [];

  try {
    // 1. Anonymize profiles table
    const anonId = hashUserId(userId);
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        email: `deleted_${anonId}@deleted.local`,
        full_name: "Deleted User",
        phone_number: null,
        avatar_url: null,
        address_line1: null,
        address_line2: null,
        city: null,
        state: null,
        zip: null,
        date_of_birth: null,
        household_income: null,
        occupation: null,
        industry: null,
        company_name: null,
        company_website: null,
        linkedin_url: null,
        twitter_handle: null,
        bio: null,
        social_handles: null,
        shipping_address: null,
        identities: null,
        stripe_connect_account_id: null,
        access_perks_member_id: null,
        access_perks_synced_at: null,
        first_paid_at: null,
        first_paid_level: null,
        stripe_customer_id: null,
        subscription_status: null,
        subscription_ends_at: null,
        previous_membership_level: null,
        gift_code_redeemed: null,
        signup_source: null,
        is_approved_free_member: false,
        free_membership_contact_submitted: null,
        waitlist_joined_at: null,
        waitlist_email_sent_at: null,
        profile_completed: false,
        is_admin: false,
        is_reviewer: false,
        deletion_requested_at: new Date().toISOString(),
        // Keep these for audit/analytics
        // id: preserved (FK constraint)
        // membership_level: preserved as 'deleted'
        membership_level: "deleted",
        joined_at: null, // Will be cleared
      })
      .eq("id", userId);

    if (profileError) {
      errors.push(`Profile anonymization failed: ${profileError.message}`);
    }

    // Log to deletion_log
    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "anonymize_profile",
      table_name: "profiles",
      record_identifier: userId,
      details: { anon_id: anonId },
      performed_by: adminUserId,
    });

    // 2. Anonymize auth.users metadata
    try {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email: `deleted_${anonId}@deleted.local`,
        phone: undefined,
        user_metadata: {
          full_name: "Deleted User",
          avatar_url: undefined,
          deletion_request_id: deletionRequestId,
        },
      });

      await supabaseAdmin.from("deletion_log").insert({
        deletion_request_id: deletionRequestId,
        user_id: userId,
        action: "anonymize_auth_user",
        table_name: "auth.users",
        record_identifier: userId,
        performed_by: adminUserId,
      });
    } catch (authError: any) {
      errors.push(`Auth user update failed: ${authError.message}`);
    }

    // 3. Anonymize grants (clear essay fields, keep metadata)
    const { data: grants, error: grantsError } = await supabaseAdmin
      .from("grants")
      .select("id, who_are_you, biggest_challenge, fund_usage")
      .eq("user_id", userId);

    if (!grantsError && grants) {
      for (const grant of grants) {
        await supabaseAdmin
          .from("grants")
          .update({
            who_are_you: "[DELETED]",
            biggest_challenge: "[DELETED]",
            fund_usage: "[DELETED]",
          })
          .eq("id", grant.id);

        await supabaseAdmin.from("deletion_log").insert({
          deletion_request_id: deletionRequestId,
          user_id: userId,
          action: "anonymize_grant",
          table_name: "grants",
          record_identifier: grant.id,
          performed_by: adminUserId,
        });
      }
    }

    // 4. Delete offer_redemptions
    const { error: redemptionsError } = await supabaseAdmin
      .from("offer_redemptions")
      .delete()
      .eq("user_id", userId);

    if (redemptionsError) {
      errors.push(`Offer redemptions deletion failed: ${redemptionsError.message}`);
    }

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "delete_offer_redemptions",
      table_name: "offer_redemptions",
      record_identifier: userId,
      performed_by: adminUserId,
    });

    // 5. Anonymize zero_dollar_claims (keep for analytics, clear shipping PII)
    const { data: zdcClaims, error: zdcError } = await supabaseAdmin
      .from("zero_dollar_claims")
      .select("id")
      .eq("user_id", userId);

    if (!zdcError && zdcClaims) {
      for (const claim of zdcClaims) {
        await supabaseAdmin
          .from("zero_dollar_claims")
          .update({
            shipping_address: null,
            shipping_name: null,
            shipping_phone: null,
          })
          .eq("id", claim.id);
      }
    }

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "anonymize_zdc_claims",
      table_name: "zero_dollar_claims",
      record_identifier: userId,
      details: { claims_affected: zdcClaims?.length || 0 },
      performed_by: adminUserId,
    });

    // 6. Delete store_likes
    await supabaseAdmin
      .from("store_likes")
      .delete()
      .eq("user_id", userId);

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "delete_store_likes",
      table_name: "store_likes",
      record_identifier: userId,
      performed_by: adminUserId,
    });

    // 7. Delete nfw_perk_redemptions
    await supabaseAdmin
      .from("nfw_perk_redemptions")
      .delete()
      .eq("user_id", userId);

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "delete_nfw_perk_redemptions",
      table_name: "nfw_perk_redemptions",
      record_identifier: userId,
      performed_by: adminUserId,
    });

    // 8. Anonymize contact_submissions (keep messages, clear sender info)
    const { data: contacts, error: contactsError } = await supabaseAdmin
      .from("contact_submissions")
      .select("id")
      .eq("user_id", userId);

    if (!contactsError && contacts) {
      for (const contact of contacts) {
        await supabaseAdmin
          .from("contact_submissions")
          .update({
            name: "Deleted User",
            email: `deleted_${anonId}@deleted.local`,
            phone: null,
          })
          .eq("id", contact.id);
      }
    }

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "anonymize_contact_submissions",
      table_name: "contact_submissions",
      record_identifier: userId,
      details: { submissions_affected: contacts?.length || 0 },
      performed_by: adminUserId,
    });

    // 9. Delete testimonials
    await supabaseAdmin
      .from("testimonials")
      .delete()
      .eq("user_id", userId);

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "delete_testimonials",
      table_name: "testimonials",
      record_identifier: userId,
      performed_by: adminUserId,
    });

    // 10. Anonymize gift_membership_codes (keep redemption records)
    await supabaseAdmin
      .from("gift_membership_codes")
      .update({
        redeemed_by_user_id: null,
        redeemed_at: null,
        redeemed_name: "Deleted User",
        redeemed_email: `deleted_${anonId}@deleted.local`,
      })
      .eq("redeemed_by_user_id", userId);

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "anonymize_gift_codes",
      table_name: "gift_membership_codes",
      record_identifier: userId,
      performed_by: adminUserId,
    });

    // 11. Anonymize gift_membership_purchases (keep business records)
    await supabaseAdmin
      .from("gift_membership_purchases")
      .update({
        buyer_name: "Deleted User",
        buyer_email: `deleted_${anonId}@deleted.local`,
      })
      .eq("buyer_email", (await supabaseAdmin.from("profiles").select("email").eq("id", userId).single()).data?.email);

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "anonymize_gift_purchases",
      table_name: "gift_membership_purchases",
      record_identifier: userId,
      performed_by: adminUserId,
    });

    // 12. Delete pending_monthly_claims
    await supabaseAdmin
      .from("pending_monthly_claims")
      .delete()
      .eq("user_id", userId);

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "delete_pending_monthly_claims",
      table_name: "pending_monthly_claims",
      record_identifier: userId,
      performed_by: adminUserId,
    });

    // 13. Delete stripe_backfill_status
    await supabaseAdmin
      .from("stripe_backfill_status")
      .delete()
      .eq("user_id", userId);

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "delete_stripe_backfill",
      table_name: "stripe_backfill_status",
      record_identifier: userId,
      performed_by: adminUserId,
    });

    // 14. Membership payments and upgrades - RETAIN for analytics
    // These are financial records that should be kept for revenue tracking
    // Just anonymize the link to the user
    await supabaseAdmin
      .from("membership_payments")
      .update({ user_id: null })
      .eq("user_id", userId);

    await supabaseAdmin
      .from("membership_upgrades")
      .update({ user_id: null })
      .eq("user_id", userId);

    await supabaseAdmin.from("deletion_log").insert({
      deletion_request_id: deletionRequestId,
      user_id: userId,
      action: "retain_financial_records",
      table_name: "membership_payments, membership_upgrades",
      record_identifier: userId,
      details: { note: "Retained for analytics, user link anonymized" },
      performed_by: adminUserId,
    });

    return {
      success: errors.length === 0,
      error: errors.length > 0 ? errors.join("; ") : undefined,
      details: {
        profilesAnonymized: true,
        grantsAnonymized: grants?.length || 0,
        redemptionsDeleted: 1,
        zdcClaimsAnonymized: zdcClaims?.length || 0,
        storeLikesDeleted: 1,
        nfwPerkRedemptionsDeleted: 1,
        contactSubmissionsAnonymized: contacts?.length || 0,
        testimonialsDeleted: 1,
        giftCodesAnonymized: 1,
        giftPurchasesAnonymized: 1,
      },
    };
  } catch (error: any) {
    console.error("[anonymizeUser] Error:", error);
    return {
      success: false,
      error: error.message || "Anonymization failed",
    };
  }
}

export async function getDocumentsPendingDeletion(
  deletionRequestId: string
): Promise<{ id: string; filename: string; grant_id: string | null }[]> {
  const { data, error } = await supabaseAdmin
    .from("deletion_documents_pending")
    .select("id, filename, grant_id")
    .eq("deletion_request_id", deletionRequestId);

  if (error) {
    console.error("[getDocumentsPendingDeletion] Error:", error);
    return [];
  }

  return data || [];
}

export async function markDocumentReviewed(
  documentId: string,
  action: "delete" | "retain",
  adminUserId: string
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("deletion_documents_pending")
    .update({
      action,
      reviewed_at: new Date().toISOString(),
      reviewed_by: adminUserId,
    })
    .eq("id", documentId);

  if (error) {
    console.error("[markDocumentReviewed] Error:", error);
    return false;
  }

  return true;
}

export async function deleteGrantDocument(
  documentId: string,
  deletionRequestId: string,
  adminUserId: string
): Promise<boolean> {
  // Get document info
  const { data: doc, error: fetchError } = await supabaseAdmin
    .from("deletion_documents_pending")
    .select("storage_path, bucket, document_id")
    .eq("id", documentId)
    .single();

  if (fetchError || !doc) {
    console.error("[deleteGrantDocument] Fetch error:", fetchError);
    return false;
  }

  // Delete from storage
  const { error: storageError } = await supabaseAdmin.storage
    .from(doc.bucket)
    .remove([doc.storage_path]);

  if (storageError) {
    console.error("[deleteGrantDocument] Storage delete error:", storageError);
    // Continue anyway to clean up DB records
  }

  // Delete from grant_documents table
  const { error: grantDocError } = await supabaseAdmin
    .from("grant_documents")
    .delete()
    .eq("id", doc.document_id);

  if (grantDocError) {
    console.error("[deleteGrantDocument] Grant documents delete error:", grantDocError);
  }

  // Update pending document record
  await supabaseAdmin
    .from("deletion_documents_pending")
    .update({ action: "delete" })
    .eq("id", documentId);

  // Log
  await supabaseAdmin.from("deletion_log").insert({
    deletion_request_id: deletionRequestId,
    user_id: null,
    action: "delete_grant_document",
    table_name: "grant_documents",
    record_identifier: doc.document_id,
    details: { filename: doc.storage_path },
    performed_by: adminUserId,
  });

  return true;
}
