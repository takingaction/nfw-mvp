"use client";

import Link from "next/link";

interface Grant {
  id: string;
  cycle_id: string;
  status: string;
  payout_amount: number | null;
  created_at: string;
  grant_cycles: {
    cycle_name: string;
    amount_per_grant: number;
    end_date: string;
    featured_image: string | null;
  } | null;
}

interface YourMicrograntsSectionProps {
  grants: Grant[];
}

const statusColors: Record<string, string> = {
  submitted: "bg-gray-100 text-gray-600",
  in_review: "bg-blue-100 text-blue-700",
  approved: "bg-green-100 text-green-700",
  not_approved: "bg-red-100 text-red-700",
  payment_pending: "bg-nfw-citrine text-nfw-blackberry",
  payment_sent: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  submitted: "Submitted",
  in_review: "In Review",
  approved: "Approved",
  not_approved: "Not Approved",
  payment_pending: "Payment Pending",
  payment_sent: "Paid!",
};

export default function YourMicrograntsSection({ grants }: YourMicrograntsSectionProps) {
  if (grants.length === 0) {
    return (
      <section className="bg-nfw-wisteria py-12 px-8">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-white font-serif">
            Your Microgrants
          </h2>
          <Link
            href="/grants/apply"
            className="px-4 py-2 bg-nfw-citrine text-nfw-blackberry font-ui text-sm font-medium rounded-lg hover:bg-nfw-citrine/90 transition-colors"
          >
            New Application
          </Link>
        </div>
        <div className="bg-white/10 rounded-xl p-8 text-center">
          <p className="text-white/70 font-serif mb-4">
            No grant applications yet
          </p>
          <p className="text-white/50 text-sm mb-6">
            Apply for microgrants to receive financial support for your initiatives
          </p>
          <Link
            href="/grants/apply"
            className="inline-block px-6 py-2 bg-nfw-citrine text-nfw-blackberry font-ui text-sm font-medium rounded-lg hover:bg-nfw-citrine/90 transition-colors"
          >
            Start Your First Application
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="bg-nfw-wisteria py-12 px-8">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-bold text-white font-serif">
          Your Microgrants
        </h2>
        <Link
          href="/grants/apply"
          className="px-4 py-2 bg-nfw-citrine text-nfw-blackberry font-ui text-sm font-medium rounded-lg hover:bg-nfw-citrine/90 transition-colors"
        >
          New Application
        </Link>
      </div>

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="flex gap-4 pb-4" style={{ minWidth: "max-content" }}>
          {grants.map((grant) => (
            <Link
              key={grant.id}
              href={`/grants/view/${grant.id}`}
              className="bg-white/10 hover:bg-white/15 rounded-xl p-4 w-64 flex-shrink-0 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="text-white font-serif font-semibold text-sm line-clamp-2 flex-1">
                  {grant.grant_cycles?.cycle_name || "Grant Application"}
                </h3>
                <span
                  className={`ml-2 px-2 py-0.5 font-ui text-xs font-black tracking-[0.03em] uppercase rounded ${statusColors[grant.status] || "bg-gray-100 text-gray-600"}`}
                >
                  {statusLabels[grant.status] || grant.status}
                </span>
              </div>
              {grant.grant_cycles?.amount_per_grant && (
                <p className="text-nfw-citrine font-ui text-lg font-bold mb-2">
                  ${grant.grant_cycles.amount_per_grant.toLocaleString()}
                </p>
              )}
              {grant.grant_cycles?.end_date && (
                <p className="text-white/50 font-ui text-xs">
                  Deadline: {new Date(grant.grant_cycles.end_date).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}