"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Search, Download, Gift, Check, X, ChevronLeft, ChevronRight } from "lucide-react";

interface GiftCode {
  id: string;
  code: string;
  created_at: string;
  redeemed_at: string | null;
  redeemed_by_email: string | null;
  purchase: {
    id: string;
    buyer_name: string;
    buyer_email: string;
    quantity: number;
    total_amount: number;
    created_at: string;
  };
}

interface Stats {
  totalCodes: number;
  redeemedCodes: number;
  unredeemedCodes: number;
  totalPurchases: number;
  totalRevenue: number;
}

export default function AdminGiftCodes() {
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "redeemed" | "unredeemed">("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchCodes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", status);
      if (search) params.set("search", search);
      params.set("page", page.toString());

      const res = await fetch(`/api/admin/gift-codes?${params}`);
      const data = await res.json();

      setCodes(data.codes || []);
      setStats(data.stats);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch codes:", err);
    } finally {
      setLoading(false);
    }
  }, [status, search, page]);

  useEffect(() => {
    fetchCodes();
  }, [fetchCodes]);

  const handleExport = async () => {
    const res = await fetch(`/api/admin/gift-codes?format=csv`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "gift-codes.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-nfw-dove">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-nfw-aubergine font-serif">
              Gift Membership Codes
            </h1>
            <p className="text-nfw-blackberry/60 text-sm mt-1">
              View and manage gift membership purchases and codes
            </p>
          </div>
          <button
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-aubergine text-white font-semibold text-sm hover:bg-nfw-aubergine/90 transition-colors rounded-lg"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-nfw-blackberry/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-nfw-lilac/20 rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-nfw-blackberry" />
                </div>
                <span className="text-sm text-nfw-blackberry/60">Total Codes</span>
              </div>
              <p className="text-2xl font-bold text-nfw-aubergine font-serif">
                {stats.totalCodes}
              </p>
            </div>

            <div className="bg-white border border-nfw-blackberry/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-[#d4f1ad]/30 rounded-full flex items-center justify-center">
                  <Check className="w-5 h-5 text-nfw-blackberry" />
                </div>
                <span className="text-sm text-nfw-blackberry/60">Redeemed</span>
              </div>
              <p className="text-2xl font-bold text-nfw-aubergine font-serif">
                {stats.redeemedCodes}
              </p>
            </div>

            <div className="bg-white border border-nfw-blackberry/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-nfw-citrine/30 rounded-full flex items-center justify-center">
                  <Gift className="w-5 h-5 text-nfw-blackberry" />
                </div>
                <span className="text-sm text-nfw-blackberry/60">Unredeemed</span>
              </div>
              <p className="text-2xl font-bold text-nfw-aubergine font-serif">
                {stats.unredeemedCodes}
              </p>
            </div>

            <div className="bg-white border border-nfw-blackberry/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-nfw-wisteria/20 rounded-full flex items-center justify-center">
                  <span className="text-nfw-wisteria font-bold">$</span>
                </div>
                <span className="text-sm text-nfw-blackberry/60">Revenue</span>
              </div>
              <p className="text-2xl font-bold text-nfw-aubergine font-serif">
                ${(stats.totalRevenue / 100).toLocaleString()}
              </p>
            </div>
          </div>
        )}

        <div className="bg-white border border-nfw-blackberry/10 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-nfw-blackberry/10 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nfw-blackberry/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="Search by code, buyer email, or recipient..."
                className="w-full pl-10 pr-4 py-2 border border-nfw-blackberry/10 text-nfw-blackberry placeholder-nfw-blackberry/30 focus:outline-none focus:ring-2 focus:ring-nfw-lilac text-sm"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setStatus("all"); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  status === "all"
                    ? "bg-nfw-aubergine text-white"
                    : "bg-nfw-blackberry/5 text-nfw-blackberry hover:bg-nfw-blackberry/10"
                }`}
              >
                All
              </button>
              <button
                onClick={() => { setStatus("redeemed"); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  status === "redeemed"
                    ? "bg-nfw-aubergine text-white"
                    : "bg-nfw-blackberry/5 text-nfw-blackberry hover:bg-nfw-blackberry/10"
                }`}
              >
                Redeemed
              </button>
              <button
                onClick={() => { setStatus("unredeemed"); setPage(1); }}
                className={`px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
                  status === "unredeemed"
                    ? "bg-nfw-aubergine text-white"
                    : "bg-nfw-blackberry/5 text-nfw-blackberry hover:bg-nfw-blackberry/10"
                }`}
              >
                Unredeemed
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-nfw-blackberry/5">
                  <th className="text-left px-6 py-3 text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider">
                    Redeemed By
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-nfw-blackberry/60 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nfw-blackberry/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-nfw-blackberry/50">
                      Loading...
                    </td>
                  </tr>
                ) : codes.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-nfw-blackberry/50">
                      No gift codes found
                    </td>
                  </tr>
                ) : (
                  codes.map((code) => (
                    <tr key={code.id} className="hover:bg-nfw-blackberry/5">
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono font-semibold text-nfw-aubergine">
                          {code.code}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <p className="text-sm font-medium text-nfw-blackberry">
                            {code.purchase?.buyer_name || "—"}
                          </p>
                          <p className="text-xs text-nfw-blackberry/50">
                            {code.purchase?.buyer_email || "—"}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-nfw-blackberry">
                        {code.purchase?.quantity || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-nfw-blackberry">
                        {code.purchase?.total_amount
                          ? `$${(code.purchase.total_amount / 100).toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4">
                        {code.redeemed_at ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-[#d4f1ad]/20 text-nfw-blackberry text-xs font-semibold rounded-full">
                            <Check className="w-3 h-3" />
                            Redeemed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-nfw-citrine/20 text-nfw-blackberry text-xs font-semibold rounded-full">
                            <Gift className="w-3 h-3" />
                            Unredeemed
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-nfw-blackberry/70">
                        {code.redeemed_by_email || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-nfw-blackberry/50">
                        {new Date(code.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="p-4 border-t border-nfw-blackberry/10 flex items-center justify-between">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-nfw-blackberry hover:bg-nfw-blackberry/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
              >
                <ChevronLeft className="w-4 h-4" />
                Previous
              </button>
              <span className="text-sm text-nfw-blackberry/60">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-nfw-blackberry hover:bg-nfw-blackberry/10 disabled:opacity-50 disabled:cursor-not-allowed transition-colors rounded-lg"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}