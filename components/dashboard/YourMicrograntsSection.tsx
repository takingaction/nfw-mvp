"use client";

import Link from "next/link";

const decodeHtml = (html: string): string => {
  if (typeof document === "undefined") return html || "";
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
};

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

interface GrantCycle {
  id: string;
  cycle_name: string;
  amount_per_grant: number;
  end_date: string;
  featured_image: string | null;
  status: string;
}

interface YourMicrograntsSectionProps {
  grants: Grant[];
  availableCycles: GrantCycle[];
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

export default function YourMicrograntsSection({ grants, availableCycles }: YourMicrograntsSectionProps) {
  return (
    <section className="bg-nfw-wisteria py-12 px-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
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

      <div className="grid md:grid-cols-3 gap-8">
        {/* Left Column - Your Applications (1/3) */}
        <div className="md:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white font-serif">
              Your Applications
            </h3>
          </div>

          {grants.length === 0 ? (
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <p className="text-white/70 font-serif mb-3">
                No grant applications yet
              </p>
              <p className="text-white/50 text-sm mb-4">
                Apply for microgrants to receive financial support
              </p>
              <Link
                href="/grants/apply"
                className="inline-block px-6 py-2 bg-nfw-citrine text-nfw-blackberry font-ui text-sm font-medium rounded-lg hover:bg-nfw-citrine/90 transition-colors"
              >
                Start Your First Application
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {grants.map((grant) => (
                <Link
                  key={grant.id}
                  href={`/grants/view/${grant.id}`}
                  className="block bg-white/10 hover:bg-white/15 rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="text-white font-serif font-semibold text-sm line-clamp-2 flex-1 [&_sup]:text-[0.6em] [&_sup]:align-super"
                      dangerouslySetInnerHTML={{ __html: decodeHtml(grant.grant_cycles?.cycle_name || "Grant Application") }}
                    />
                    <span
                      className={`ml-2 px-2 py-0.5 font-ui text-xs font-black tracking-[0.03em] uppercase rounded ${statusColors[grant.status] || "bg-gray-100 text-gray-600"}`}
                    >
                      {statusLabels[grant.status] || grant.status}
                    </span>
                  </div>
                  {grant.grant_cycles?.amount_per_grant && (
                    <p className="text-nfw-citrine font-ui text-lg font-bold mb-1">
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
          )}
        </div>

        {/* Right Column - Available Microgrants (2/3) */}
        <div className="md:col-span-2">
          <div className="mb-4">
            <h3 className="text-lg font-bold text-white font-serif">
              Available Microgrants
            </h3>
          </div>

          {availableCycles.length === 0 ? (
            <div className="bg-white/10 rounded-xl p-6 text-center">
              <p className="text-white/70 font-serif">
                No open grant cycles at this time
              </p>
              <p className="text-white/50 text-sm mt-2">
                Check back soon for new opportunities
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableCycles.map((cycle) => (
              <Link
                key={cycle.id}
                href="/grants/apply"
                className="bg-white/10 hover:bg-white/15 rounded-xl p-4 transition-colors flex flex-col"
              >
                  {cycle.featured_image && (
                    <div className="relative w-full h-32 rounded-lg overflow-hidden mb-3">
                      <img
                        src={cycle.featured_image}
                        alt={cycle.cycle_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <h4 className="text-white font-serif font-semibold text-sm line-clamp-2 mb-2 [&_sup]:text-[0.6em] [&_sup]:align-super"
                    dangerouslySetInnerHTML={{ __html: decodeHtml(cycle.cycle_name) }}
                  />
                  <p className="text-nfw-citrine font-ui text-xl font-bold mb-1">
                    ${cycle.amount_per_grant.toLocaleString()}
                  </p>
                  <p className="text-white/50 font-ui text-xs">
                    Deadline: {new Date(cycle.end_date).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}