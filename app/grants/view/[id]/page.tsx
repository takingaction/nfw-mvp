import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import GrantDocuments from "@/components/grants/GrantDocuments";
import ConnectBankButton from "@/components/grants/ConnectBankButton";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function GrantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const { data: grant } = await supabaseAdmin
    .from("grants")
    .select(
      `
      *,
      grant_cycles (
        cycle_name,
        description,
        start_date,
        end_date,
        amount_per_grant,
        grants_available
      )
    `,
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!grant) {
    redirect("/grants/my-applications");
  }

  const { data: documents } = await supabaseAdmin
    .from("grant_documents")
    .select("*")
    .eq("grant_id", id)
    .order("uploaded_at", { ascending: false });

  const statusColors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-800",
    in_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-green-100 text-green-800",
    not_approved: "bg-red-100 text-red-800",
    payment_pending: "bg-orange-100 text-orange-800",
    payment_sent: "bg-purple-100 text-purple-800",
  };

  const statusLabels: Record<string, string> = {
    submitted: "Submitted",
    in_review: "Being Reviewed",
    approved: "Approved",
    not_approved: "Not Approved",
    payment_pending: "Payment Processing",
    payment_sent: "Payment Sent",
  };

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link
          href="/grants/my-applications"
          className="inline-flex items-center font-sans text-nfw-blackberry hover:text-nfw-aubergine mb-6 font-medium transition-colors"
        >
          Back to My Applications
        </Link>

        {/* Header */}
        <div className="bg-white border border-nfw-blackberry/10 p-8 mb-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span
                  className={`px-3 py-1 font-ui text-xs font-black tracking-[0.03em] uppercase ${statusColors[grant.status] || "bg-gray-100 text-gray-800"}`}
                >
                  {statusLabels[grant.status] || grant.status}
                </span>
                {grant.is_nominating && (
                  <span className="px-3 py-1 font-ui text-xs font-black tracking-[0.03em] uppercase bg-nfw-lilac/20 text-nfw-blackberry">
                    Nomination
                  </span>
                )}
              </div>
              <h1 className="font-serif text-4xl lg:text-6xl text-nfw-blackberry leading-tight">
                {grant.grant_cycles?.cycle_name || "Grant Application"}
              </h1>
              <p className="font-sans text-sm text-nfw-blackberry/50 mt-1">
                Submitted{" "}
                {grant.submitted_at
                  ? new Date(grant.submitted_at).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </p>
            </div>
            {grant.amount_approved && (
              <div className="text-right">
                <p className="font-ui text-3xl font-black tracking-[0.03em] uppercase text-nfw-blackberry">
                  ${grant.amount_approved.toLocaleString()}
                </p>
                <p className="font-sans text-sm text-nfw-blackberry/50">Approved Amount</p>
              </div>
            )}
          </div>

          {/* Grant Cycle Info */}
          {grant.grant_cycles && (
            <div className="bg-nfw-dove p-4 mb-6">
              <h3 className="font-sans text-sm font-semibold text-nfw-blackberry mb-1">Grant Cycle</h3>
              <p className="font-sans text-sm text-nfw-blackberry/60">
                {new Date(grant.grant_cycles.start_date).toLocaleDateString()} —{" "}
                {new Date(grant.grant_cycles.end_date).toLocaleDateString()}
              </p>
              <p className="font-sans text-sm text-nfw-blackberry/50 mt-1">
                ${grant.grant_cycles.amount_per_grant?.toLocaleString()} per
                grant · {grant.grant_cycles.grants_available} available
              </p>
            </div>
          )}

          {/* Application Answers */}
          <div className="space-y-6">
            {grant.who_are_you && (
              <div>
                <h3 className="font-sans text-sm font-semibold text-nfw-blackberry mb-2">
                  {grant.is_nominating ? "About the Nominee" : "Who are you?"}
                </h3>
                <p className="font-sans text-nfw-blackberry/70 whitespace-pre-wrap">
                  {grant.who_are_you}
                </p>
              </div>
            )}
            {grant.biggest_challenge && (
              <div>
                <h3 className="font-sans text-sm font-semibold text-nfw-blackberry mb-2">
                  Biggest Challenge
                </h3>
                <p className="font-sans text-nfw-blackberry/70 whitespace-pre-wrap">
                  {grant.biggest_challenge}
                </p>
              </div>
            )}
            {grant.fund_usage && (
              <div>
                <h3 className="font-sans text-sm font-semibold text-nfw-blackberry mb-2">
                  {grant.is_nominating
                    ? "How They Would Use the Funds"
                    : "How You Would Use the Funds"}
                </h3>
                <p className="font-sans text-nfw-blackberry/70 whitespace-pre-wrap">
                  {grant.fund_usage}
                </p>
              </div>
            )}
          </div>

          {/* Timeline */}
          <div className="border-t border-nfw-blackberry/10 pt-6 mt-6">
            <h3 className="font-sans text-sm font-semibold text-nfw-blackberry mb-4">
              Application Timeline
            </h3>
            <div className="space-y-3">
              {grant.submitted_at && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-sans text-sm font-medium text-nfw-blackberry">
                      Submitted for Review
                    </p>
                    <p className="font-sans text-xs text-nfw-blackberry/50">
                      {new Date(grant.submitted_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {grant.reviewed_at && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-sans text-sm font-medium text-nfw-blackberry">
                      Reviewed
                    </p>
                    <p className="font-sans text-xs text-nfw-blackberry/50">
                      {new Date(grant.reviewed_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              {grant.funded_at && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                  <div>
                    <p className="font-sans text-sm font-medium text-nfw-blackberry">
                      Payment Sent
                    </p>
                    <p className="font-sans text-xs text-nfw-blackberry/50">
                      {new Date(grant.funded_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Supporting Documents */}
        {documents && documents.length > 0 && (
          <GrantDocuments documents={documents} grantId={id} />
        )}

        {/* Status-specific Action Sections */}
        {grant.status === "approved" && !grant.stripe_connect_account_id && (
          <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] p-6 mt-6">
            <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
              Your Grant Has Been Approved!
            </h3>
            <p className="font-sans text-nfw-blackberry/70 mb-4">
              To receive your funds, please connect your bank account. This is a
              secure process handled by Stripe — NFW never sees your banking
              details.
            </p>
            <ConnectBankButton grantId={grant.id} />
          </div>
        )}

        {grant.status === "approved" && grant.stripe_connect_account_id && (
          <div className="bg-[#b2d1ee]/20 border border-[#b2d1ee] p-6 mt-6">
            <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
              Bank Account Connected
            </h3>
            <p className="font-sans text-nfw-blackberry/70">
              Your bank account is connected. Our team will process your payment
              shortly.
            </p>
          </div>
        )}

        {grant.status === "payment_pending" && (
          <div className="bg-nfw-citrine/20 border border-nfw-citrine p-6 mt-6">
            <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
              Payment Being Processed
            </h3>
            <p className="font-sans text-nfw-blackberry/70">
              Your grant payment is being processed and will arrive in your bank
              account within 1-3 business days.
            </p>
          </div>
        )}

        {grant.status === "payment_sent" && (
          <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] p-6 mt-6">
            <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
              Payment Sent!
            </h3>
            <p className="font-sans text-nfw-blackberry/70">
              Your grant payment
              {grant.amount_approved
                ? ` of $${grant.amount_approved.toLocaleString()}`
                : ""}{" "}
              has been sent to your bank account. Please allow 1-3 business days
              for it to appear.
            </p>
          </div>
        )}

        {grant.status === "not_approved" && (
          <div className="bg-red-50 border border-red-200 p-6 mt-6">
            <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry mb-2">
              Application Not Approved
            </h3>
            <p className="font-sans text-nfw-blackberry/70">
              Unfortunately, your application was not approved at this time. You
              may apply again in a future grant cycle.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
