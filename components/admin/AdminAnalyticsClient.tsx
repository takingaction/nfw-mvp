"use client";

import { useState, useMemo, useRef } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Download,
  FileText,
  Users,
  DollarSign,
  Gift,
  TrendingUp,
} from "lucide-react";

type Profile = {
  id: string;
  joined_at: string | null;
  subscription_status: string | null;
  state: string | null;
  city: string | null;
  household_income: string | null;
  age_range: string | null;
};

type Grant = {
  id: string;
  status: string | null;
  amount_requested: number | null;
  payout_amount: number | null;
  category: string | null;
  submitted_at: string | null;
  funded_at: string | null;
};

type Redemption = {
  id: string;
  offer_key: string | null;
  offer_title: string | null;
  store_name: string | null;
  redeem_type: string | null;
  created_at: string | null;
};

const COLORS = [
  "#2d1239",
  "#d4f1ad",
  "#b2d1ee",
  "#fdf493",
  "#bcafcf",
  "#4a1f5c",
];

const GRANT_CATEGORY_LABELS: Record<string, string> = {
  childcare_support: "Childcare",
  emergency_care: "Emergency",
  education_essentials: "Education",
  medical_medicine: "Medical",
  rent_transportation: "Rent/Transport",
  school_supplies: "School Supplies",
  food_essentials: "Food",
  car_repair: "Car Repair",
  small_business_starter: "Small Business",
  other: "Other",
};

export default function AdminAnalyticsClient({
  profiles,
  grants,
  redemptions,
}: {
  profiles: Profile[];
  grants: Grant[];
  redemptions: Redemption[];
}) {
  const [tab, setTab] = useState<"members" | "grants" | "perks">("members");
  const [days, setDays] = useState(30);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const now = new Date();
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  // ── MEMBERS ──────────────────────────────────────────────
  const filteredProfiles = useMemo(
    () =>
      profiles.filter((p) => p.joined_at && new Date(p.joined_at) >= cutoff),
    [profiles, days],
  );

  const membersByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredProfiles.forEach((p) => {
      const d = p.joined_at!.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [filteredProfiles]);

  const membersByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      const s = p.subscription_status || "free";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [profiles]);

  const membersByState = useMemo(() => {
    const map: Record<string, number> = {};
    profiles.forEach((p) => {
      if (p.state) map[p.state] = (map[p.state] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([state, count]) => ({ state, count }));
  }, [profiles]);

  const estimatedMRR = useMemo(() => {
    const active = profiles.filter(
      (p) => p.subscription_status === "active",
    ).length;
    return Math.round((active * 15) / 12);
  }, [profiles]);

  // ── GRANTS ───────────────────────────────────────────────
  const filteredGrants = useMemo(
    () =>
      grants.filter(
        (g) => g.submitted_at && new Date(g.submitted_at) >= cutoff,
      ),
    [grants, days],
  );

  const grantsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGrants.forEach((g) => {
      const d = g.submitted_at!.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [filteredGrants]);

  const grantsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGrants.forEach((g) => {
      const s = g.status || "unknown";
      map[s] = (map[s] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredGrants]);

  const grantsByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    filteredGrants.forEach((g) => {
      const c = g.category || "other";
      map[c] = (map[c] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([cat, count]) => ({
        category: GRANT_CATEGORY_LABELS[cat] || cat,
        count,
      }));
  }, [filteredGrants]);

  const totalFunded = useMemo(
    () =>
      grants
        .filter((g) => g.status === "funded")
        .reduce((sum, g) => sum + (g.payout_amount || 0), 0),
    [grants],
  );

  const approvalRate = useMemo(() => {
    const submitted = filteredGrants.filter((g) => g.status !== "draft").length;
    const approved = filteredGrants.filter((g) =>
      ["approved", "funded"].includes(g.status || ""),
    ).length;
    return submitted > 0 ? Math.round((approved / submitted) * 100) : 0;
  }, [filteredGrants]);

  // ── PERKS ────────────────────────────────────────────────
  const filteredRedemptions = useMemo(
    () =>
      redemptions.filter(
        (r) => r.created_at && new Date(r.created_at) >= cutoff,
      ),
    [redemptions, days],
  );

  const redemptionsByDay = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRedemptions.forEach((r) => {
      const d = r.created_at!.slice(0, 10);
      map[d] = (map[d] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, count]) => ({ date: date.slice(5), count }));
  }, [filteredRedemptions]);

  const topOffers = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRedemptions.forEach((r) => {
      const key = r.offer_title || r.offer_key || "Unknown";
      map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([offer, count]) => ({
        offer: offer.length > 30 ? offer.slice(0, 30) + "…" : offer,
        count,
      }));
  }, [filteredRedemptions]);

  const redemptionsByType = useMemo(() => {
    const map: Record<string, number> = {};
    filteredRedemptions.forEach((r) => {
      const t = r.redeem_type || "unknown";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredRedemptions]);

  // ── EXPORT CSV ───────────────────────────────────────────
  const exportCSV = () => {
    let rows: string[][] = [];
    let filename = "";

    if (tab === "members") {
      filename = "nfw-members-analytics.csv";
      rows = [
        ["Date", "New Members"],
        ...membersByDay.map((r) => [r.date, String(r.count)]),
        [],
        ["Status", "Count"],
        ...membersByStatus.map((r) => [r.name, String(r.value)]),
        [],
        ["State", "Members"],
        ...membersByState.map((r) => [r.state, String(r.count)]),
      ];
    } else if (tab === "grants") {
      filename = "nfw-grants-analytics.csv";
      rows = [
        ["Date", "Applications"],
        ...grantsByDay.map((r) => [r.date, String(r.count)]),
        [],
        ["Status", "Count"],
        ...grantsByStatus.map((r) => [r.name, String(r.value)]),
        [],
        ["Category", "Count"],
        ...grantsByCategory.map((r) => [r.category, String(r.count)]),
      ];
    } else {
      filename = "nfw-perks-analytics.csv";
      rows = [
        ["Date", "Redemptions"],
        ...redemptionsByDay.map((r) => [r.date, String(r.count)]),
        [],
        ["Offer", "Redemptions"],
        ...topOffers.map((r) => [r.offer, String(r.count)]),
      ];
    }

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── EXPORT PDF ───────────────────────────────────────────
  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: html2canvas } = await import("html2canvas");
    if (!dashboardRef.current) return;
    const canvas = await html2canvas(dashboardRef.current, {
      scale: 1.5,
      useCORS: true,
    });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "px",
      format: [canvas.width / 1.5, canvas.height / 1.5],
    });
    pdf.addImage(imgData, "PNG", 0, 0, canvas.width / 1.5, canvas.height / 1.5);
    pdf.save(`nfw-analytics-${tab}-${days}days.pdf`);
  };

  const statCards =
    tab === "members"
      ? [
          {
            label: "New Members",
            value: filteredProfiles.length,
            icon: Users,
            color: "bg-[#2d1239]",
            text: "text-white",
          },
          {
            label: "Total Members",
            value: profiles.length,
            icon: Users,
            color: "bg-[#bcafcf]/30",
            text: "text-[#2d1239]",
          },
          {
            label: "Active Paid",
            value: profiles.filter((p) => p.subscription_status === "active")
              .length,
            icon: TrendingUp,
            color: "bg-[#d4f1ad]",
            text: "text-[#2d1239]",
          },
          {
            label: "Est. MRR",
            value: `$${estimatedMRR}`,
            icon: DollarSign,
            color: "bg-[#fdf493]",
            text: "text-[#2d1239]",
          },
        ]
      : tab === "grants"
        ? [
            {
              label: "Applications",
              value: filteredGrants.length,
              icon: FileText,
              color: "bg-[#2d1239]",
              text: "text-white",
            },
            {
              label: "Approval Rate",
              value: `${approvalRate}%`,
              icon: TrendingUp,
              color: "bg-[#d4f1ad]",
              text: "text-[#2d1239]",
            },
            {
              label: "Total Funded",
              value: `$${totalFunded.toLocaleString()}`,
              icon: DollarSign,
              color: "bg-[#fdf493]",
              text: "text-[#2d1239]",
            },
            {
              label: "Funded Grants",
              value: grants.filter((g) => g.status === "funded").length,
              icon: Gift,
              color: "bg-[#b2d1ee]",
              text: "text-[#2d1239]",
            },
          ]
        : [
            {
              label: "Redemptions",
              value: filteredRedemptions.length,
              icon: Gift,
              color: "bg-[#2d1239]",
              text: "text-white",
            },
            {
              label: "Total All Time",
              value: redemptions.length,
              icon: Gift,
              color: "bg-[#bcafcf]/30",
              text: "text-[#2d1239]",
            },
            {
              label: "Unique Offers",
              value: new Set(filteredRedemptions.map((r) => r.offer_key)).size,
              icon: TrendingUp,
              color: "bg-[#d4f1ad]",
              text: "text-[#2d1239]",
            },
            {
              label: "Redeem Types",
              value: new Set(filteredRedemptions.map((r) => r.redeem_type))
                .size,
              icon: FileText,
              color: "bg-[#fdf493]",
              text: "text-[#2d1239]",
            },
          ];

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        {/* Tabs */}
        <div className="flex gap-2">
          {(["members", "grants", "perks"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold capitalize transition-colors ${
                tab === t
                  ? "bg-[#2d1239] text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex gap-3 items-center">
          {/* Date Range */}
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#2d1239] bg-white"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
            <option value={180}>Last 6 months</option>
            <option value={365}>Last 12 months</option>
          </select>

          {/* Export CSV */}
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            CSV
          </button>

          {/* Export PDF */}
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-[#2d1239] text-white rounded-lg text-sm font-semibold hover:bg-[#2d1239]/90 transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Dashboard content captured for PDF */}
      <div ref={dashboardRef}>
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {statCards.map((card) => (
            <div key={card.label} className={`${card.color} rounded-2xl p-5`}>
              <div className={`text-2xl font-black mb-1 ${card.text}`}>
                {card.value}
              </div>
              <div className={`text-xs font-semibold ${card.text} opacity-70`}>
                {card.label}
              </div>
            </div>
          ))}
        </div>

        {/* MEMBERS TAB */}
        {tab === "members" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-black text-[#2d1239] mb-4">
                New Members Over Time
              </h3>
              {membersByDay.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No new members in this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={membersByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2d1239"
                      strokeWidth={2}
                      dot={false}
                      name="New Members"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-black text-[#2d1239] mb-4">
                  Membership Status Breakdown
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={membersByStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {membersByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-black text-[#2d1239] mb-4">
                  Top 10 States
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={membersByState} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="state"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={30}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#2d1239"
                      radius={[0, 4, 4, 0]}
                      name="Members"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* GRANTS TAB */}
        {tab === "grants" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-black text-[#2d1239] mb-4">
                Grant Applications Over Time
              </h3>
              {grantsByDay.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No applications in this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={grantsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2d1239"
                      strokeWidth={2}
                      dot={false}
                      name="Applications"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-black text-[#2d1239] mb-4">
                  Applications by Status
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={grantsByStatus}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {grantsByStatus.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-black text-[#2d1239] mb-4">
                  Applications by Category
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={grantsByCategory} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="category"
                      type="category"
                      tick={{ fontSize: 11 }}
                      width={90}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#d4f1ad"
                      radius={[0, 4, 4, 0]}
                      name="Applications"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* PERKS TAB */}
        {tab === "perks" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h3 className="font-black text-[#2d1239] mb-4">
                Redemptions Over Time
              </h3>
              {redemptionsByDay.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">
                  No redemptions in this period.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={redemptionsByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#2d1239"
                      strokeWidth={2}
                      dot={false}
                      name="Redemptions"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-black text-[#2d1239] mb-4">
                  Top Offers Redeemed
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={topOffers} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis
                      dataKey="offer"
                      type="category"
                      tick={{ fontSize: 10 }}
                      width={120}
                    />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      fill="#b2d1ee"
                      radius={[0, 4, 4, 0]}
                      name="Redemptions"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 p-6">
                <h3 className="font-black text-[#2d1239] mb-4">
                  Redemption Methods
                </h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={redemptionsByType}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={({ name, percent }) =>
                        `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                      }
                    >
                      {redemptionsByType.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
