import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function MyApplicationsPage() {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/auth/login");
  }

  const { data: grants } = await supabaseAdmin
    .from("grants")
    .select(
      `
      *,
      grant_cycles (
        cycle_name,
        end_date,
        amount_per_grant
      )
    `,
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const statusCounts = {
    submitted: grants?.filter((g) => g.status === "submitted").length || 0,
    in_review: grants?.filter((g) => g.status === "in_review").length || 0,
    approved: grants?.filter((g) => g.status === "approved").length || 0,
    not_approved:
      grants?.filter((g) => g.status === "not_approved").length || 0,
    payment_pending:
      grants?.filter((g) => g.status === "payment_pending").length || 0,
    payment_sent:
      grants?.filter((g) => g.status === "payment_sent").length || 0,
  };

  const statusColors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-800",
    in_review: "bg-yellow-100 text-yellow-800",
    approved: "bg-[#d4f1ad]/40 text-[#2d1239]",
    not_approved: "bg-red-100 text-red-800",
    payment_pending: "bg-orange-100 text-orange-800",
    payment_sent: "bg-purple-100 text-purple-800",
  };

  const statusLabels: Record<string, string> = {
    submitted: "Submitted — Awaiting Review",
    in_review: "Being Reviewed",
    approved: "Approved",
    not_approved: "Not Approved",
    payment_pending: "Payment Being Processed",
    payment_sent: "Payment Sent",
  };

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-white pt-8 pb-6 border-b border-[#2d1239]/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2
                className="text-3xl sm:text-4xl font-bold text-[#2d1239] mb-2"
                style={{ fontFamily: "Montserrat, sans-serif" }}
              >
                My Grant Applications
              </h2>
              <p className="text-[#2d1239]/60">
                Track your microgrant applications and their status
              </p>
            </div>
            <Link
              href="/grants/apply"
              className="bg-[#2d1239] text-white px-5 py-2.5 rounded-xl hover:bg-[#2d1239]/90 font-bold transition-colors"
            >
              + New Application
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            {
              label: "Submitted",
              value: statusCounts.submitted,
              color: "text-blue-700",
            },
            {
              label: "In Review",
              value: statusCounts.in_review,
              color: "text-yellow-700",
            },
            {
              label: "Approved",
              value: statusCounts.approved,
              color: "text-green-600",
            },
            {
              label: "Not Approved",
              value: statusCounts.not_approved,
              color: "text-red-500",
            },
            {
              label: "Pmt Pending",
              value: statusCounts.payment_pending,
              color: "text-orange-600",
            },
            {
              label: "Pmt Sent",
              value: statusCounts.payment_sent,
              color: "text-purple-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[#f8f7fa] rounded-xl p-4 border border-[#2d1239]/5"
            >
              <div className={`text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="text-sm text-[#2d1239]/60">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Applications List */}
        {grants && grants.length > 0 ? (
          <div className="space-y-4">
            {grants.map((grant) => (
              <div
                key={grant.id}
                className="bg-white rounded-2xl border border-[#2d1239]/10 p-6 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3
                        className="text-lg font-black text-[#2d1239]"
                        style={{ fontFamily: "Montserrat, sans-serif" }}
                      >
                        {grant.grant_cycles?.cycle_name || "Grant Application"}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[grant.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {statusLabels[grant.status] || grant.status}
                      </span>
                      {grant.is_nominating && (
                        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#bcafcf]/20 text-[#2d1239]">
                          Nomination
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#2d1239]/50">
                      Deadline:{" "}
                      {grant.grant_cycles?.end_date
                        ? new Date(
                            grant.grant_cycles.end_date,
                          ).toLocaleDateString("en-US", {
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                          })
                        : "—"}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    {grant.amount_approved ? (
                      <>
                        <p
                          className="text-xl font-black text-[#2d1239]"
                          style={{ fontFamily: "Montserrat, sans-serif" }}
                        >
                          ${grant.amount_approved.toLocaleString()}
                        </p>
                        <p className="text-xs text-[#2d1239]/50">
                          Approved amount
                        </p>
                      </>
                    ) : grant.grant_cycles?.amount_per_grant ? (
                      <>
                        <p
                          className="text-xl font-black text-[#2d1239]"
                          style={{ fontFamily: "Montserrat, sans-serif" }}
                        >
                          $
                          {grant.grant_cycles.amount_per_grant.toLocaleString()}
                        </p>
                        <p className="text-xs text-[#2d1239]/50">
                          Grant amount
                        </p>
                      </>
                    ) : null}
                    <p className="text-xs text-[#2d1239]/40 mt-1">
                      {grant.submitted_at
                        ? `Submitted ${new Date(grant.submitted_at).toLocaleDateString()}`
                        : `Created ${new Date(grant.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                {/* Preview of application */}
                {grant.who_are_you && (
                  <p className="text-sm text-[#2d1239]/60 mb-4 line-clamp-2">
                    {grant.who_are_you}
                  </p>
                )}

                {/* Status-specific prompts */}
                {grant.status === "approved" &&
                  !grant.stripe_connect_account_id && (
                    <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] rounded-xl p-3 mb-4">
                      <p className="text-sm font-semibold text-[#2d1239]">
                        🎉 Approved! Connect your bank account to receive your
                        funds.
                      </p>
                    </div>
                  )}
                {grant.status === "payment_pending" && (
                  <div className="bg-[#fdf493]/20 border border-[#fdf493] rounded-xl p-3 mb-4">
                    <p className="text-sm font-semibold text-[#2d1239]">
                      💸 Your payment is being processed — arriving within 1-3
                      business days.
                    </p>
                  </div>
                )}
                {grant.status === "payment_sent" && (
                  <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] rounded-xl p-3 mb-4">
                    <p className="text-sm font-semibold text-[#2d1239]">
                      ✅ Payment sent! Check your bank account.
                    </p>
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-[#2d1239]/10">
                  <Link
                    href={`/grants/view/${grant.id}`}
                    className="text-[#2d1239] hover:text-[#2d1239]/70 text-sm font-semibold transition-colors"
                  >
                    View Details →
                  </Link>
                  {grant.status === "approved" &&
                    !grant.stripe_connect_account_id && (
                      <Link
                        href={`/grants/view/${grant.id}`}
                        className="text-green-600 hover:text-green-700 text-sm font-semibold transition-colors"
                      >
                        Connect Bank Account →
                      </Link>
                    )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#f8f7fa] rounded-2xl border border-[#2d1239]/10 p-12 text-center">
            <div className="text-5xl mb-4 opacity-30">📝</div>
            <h3
              className="text-xl font-black text-[#2d1239] mb-2"
              style={{ fontFamily: "Montserrat, sans-serif" }}
            >
              No Applications Yet
            </h3>
            <p className="text-[#2d1239]/60 mb-6 max-w-md mx-auto">
              You haven&apos;t submitted any grant applications. Start your
              first application to get support for your needs.
            </p>
            <Link
              href="/grants/apply"
              className="inline-block bg-[#2d1239] text-white px-6 py-3 rounded-xl hover:bg-[#2d1239]/90 font-bold transition-colors"
            >
              Apply for a Grant
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
