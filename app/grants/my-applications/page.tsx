import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function decodeHtml(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&#92;/g, "\\");
}

export default async function MyApplicationsPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  const supabase = await createServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    const nextUrl = searchParams?.next || "/grants/my-applications";
    redirect(`/auth/login?next=${encodeURIComponent(nextUrl)}`);
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
    approved: grants?.filter((g) => g.status === "approved").length || 0,
    not_approved:
      grants?.filter((g) => g.status === "not_approved").length || 0,
    payment_sent:
      grants?.filter((g) => g.status === "payment_sent").length || 0,
  };

  const statusColors: Record<string, string> = {
    submitted: "bg-blue-100 text-blue-800",
    approved: "bg-[#d4f1ad]/40 text-nfw-blackberry",
    not_approved: "bg-red-100 text-red-800",
    payment_sent: "bg-purple-100 text-purple-800",
  };

  const statusLabels: Record<string, string> = {
    submitted: "Submitted",
    approved: "Approved",
    not_approved: "Not Approved",
    payment_sent: "Payment Sent",
  };

  return (
    <main className="min-h-screen bg-nfw-dove">
      {/* Header */}
      <div className="bg-white pt-8 pb-6 border-b border-nfw-blackberry/10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-4xl lg:text-6xl leading-[1.1] text-nfw-aubergine mb-2">
                My Grant Applications
              </h2>
              <p className="font-serif text-nfw-blackberry/60">
                Track your microgrant applications and their status
              </p>
            </div>
            <Link
              href="/grants/apply"
              className="bg-nfw-aubergine text-nfw-dove px-5 py-2.5 font-ui text-sm font-black tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
            >
              + New Application
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Submitted",
              value: statusCounts.submitted,
              color: "text-blue-700",
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
              label: "Pmt Sent",
              value: statusCounts.payment_sent,
              color: "text-purple-600",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-white p-4 border border-nfw-blackberry/10"
            >
              <div className={`font-ui text-2xl font-bold ${stat.color}`}>
                {stat.value}
              </div>
              <div className="font-ui text-sm text-nfw-blackberry/60">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Applications List */}
        {grants && grants.length > 0 ? (
          <div className="space-y-4">
            {grants.map((grant) => (
              <div
                key={grant.id}
                className="bg-white border border-nfw-blackberry/10 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <h3 className="font-ui text-sm font-black tracking-[0.03em] uppercase text-nfw-blackberry [&_sup]:text-[0.6em] [&_sup]:align-super"
                        dangerouslySetInnerHTML={{ __html: decodeHtml(grant.grant_cycles?.cycle_name || "Grant Application") }}
                      />
                      <span
                        className={`px-3 py-1 font-ui text-xs font-black tracking-[0.03em] uppercase ${statusColors[grant.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {statusLabels[grant.status] || grant.status}
                      </span>
                      {grant.is_nominating && (
                        <span className="px-3 py-1 font-ui text-xs font-black tracking-[0.03em] uppercase bg-nfw-lilac/20 text-nfw-blackberry">
                          Nomination
                        </span>
                      )}
                    </div>
                    <p className="font-ui text-sm text-nfw-blackberry/50">
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
                        <p className="font-ui text-xl font-black tracking-[0.03em] uppercase text-nfw-blackberry">
                          ${grant.amount_approved.toLocaleString()}
                        </p>
                        <p className="font-ui text-xs text-nfw-blackberry/50">
                          Approved amount
                        </p>
                      </>
                    ) : grant.grant_cycles?.amount_per_grant ? (
                      <>
                        <p className="font-ui text-xl font-black tracking-[0.03em] uppercase text-nfw-blackberry">
                          $
                          {grant.grant_cycles.amount_per_grant.toLocaleString()}
                        </p>
                        <p className="font-ui text-xs text-nfw-blackberry/50">
                          Grant amount
                        </p>
                      </>
                    ) : null}
                    <p className="font-serif text-xs text-nfw-blackberry/40 mt-1">
                      {grant.submitted_at
                        ? `Submitted ${new Date(grant.submitted_at).toLocaleDateString()}`
                        : `Created ${new Date(grant.created_at).toLocaleDateString()}`}
                    </p>
                  </div>
                </div>

                {/* Preview of application */}
                {grant.who_are_you && (
                  <p className="font-serif text-sm text-nfw-blackberry/60 mb-4 line-clamp-2">
                    {decodeHtml(grant.who_are_you)}
                  </p>
                )}

                {/* Status-specific prompts */}
                {grant.status === "approved" &&
                  !grant.stripe_connect_account_id && (
                    <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] p-3 mb-4">
                      <p className="font-serif text-sm text-nfw-blackberry">
                        Approved! Connect your bank account to receive your funds.
                      </p>
                    </div>
                  )}
                {grant.status === "payment_pending" && (
                  <div className="bg-nfw-citrine/20 border border-nfw-citrine p-3 mb-4">
                    <p className="font-serif text-sm text-nfw-blackberry">
                      Your payment is being processed — arriving within 1-3 business days.
                    </p>
                  </div>
                )}
                {grant.status === "payment_sent" && (
                  <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] p-3 mb-4">
                    <p className="font-serif text-sm text-nfw-blackberry">
                      Payment sent! Check your bank account.
                    </p>
                  </div>
                )}

                <div className="flex gap-4 pt-4 border-t border-nfw-blackberry/10">
                  <Link
                    href={`/grants/view/${grant.id}`}
                    className="font-ui text-sm text-nfw-aubergine hover:text-nfw-blackberry transition-colors"
                  >
                    View Details
                  </Link>
                  {grant.status === "approved" &&
                    !grant.stripe_connect_account_id && (
                      <Link
                        href={`/grants/view/${grant.id}`}
                        className="font-ui text-sm text-green-600 hover:text-green-700 transition-colors"
                      >
                        Connect Bank Account
                      </Link>
                    )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-nfw-blackberry/10 p-12 text-center">
            <h3 className="font-serif text-xl text-nfw-aubergine mb-2">
              No Applications Yet
            </h3>
            <p className="font-serif text-nfw-blackberry/60 mb-6 max-w-md mx-auto">
              You haven&apos;t submitted any grant applications. Start your
              first application to get support for your needs.
            </p>
            <Link
              href="/grants/apply"
              className="inline-block bg-nfw-aubergine text-nfw-dove px-6 py-3 font-ui text-sm font-black tracking-[0.06em] uppercase hover:bg-nfw-blackberry transition-colors"
            >
              Apply for a Grant
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
