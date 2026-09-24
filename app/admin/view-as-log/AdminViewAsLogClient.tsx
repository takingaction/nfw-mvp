"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, Download, Loader2 } from "lucide-react";

interface ViewAsRow {
  id: string;
  admin_user_id: string;
  target_user_id: string;
  started_at: string;
  ended_at: string | null;
  end_reason: string | null;
  reason: string;
  initial_page: string | null;
  ip_address: string | null;
  user_agent: string | null;
  admin: { email?: string | null; full_name?: string | null } | null;
  target: { email?: string | null; full_name?: string | null } | null;
}

interface ApiResponse {
  rows: ViewAsRow[];
  total: number;
  page: number;
  pageSize: number;
}

type Status = "all" | "active" | "ended";

const PAGE_SIZE = 50;

const formatTs = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    const parts = d.toLocaleDateString("en-US", {
      timeZone: "America/New_York",
      month: "short",
      day: "numeric",
      year: "numeric",
    }).split(" ");
    const time = d.toLocaleTimeString("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    });
    return `${parts[0]} ${parts[1].replace(",", "")}, ${parts[2]} ${time} ET`;
  } catch {
    return iso;
  }
};

export default function AdminViewAsLogClient() {
  const [status, setStatus] = useState<Status>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 200);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status]);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const url = new URL("/api/admin/view-as/log", window.location.origin);
        url.searchParams.set("page", String(page));
        url.searchParams.set("pageSize", String(PAGE_SIZE));
        url.searchParams.set("status", status);
        if (debouncedSearch) url.searchParams.set("search", debouncedSearch);
        const res = await fetch(url.toString(), { cache: "no-store" });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          if (!cancelled) setError(json?.error || "Failed to load audit log");
          return;
        }
        if (!cancelled) setData(json as ApiResponse);
      } catch {
        if (!cancelled) setError("Network error loading audit log");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [status, debouncedSearch, page]);

  const totalPages = useMemo(() => {
    if (!data) return 1;
    return Math.max(1, Math.ceil(data.total / PAGE_SIZE));
  }, [data]);

  const exportCsv = () => {
    if (!data || data.rows.length === 0) return;
    const header = [
      "started_at",
      "ended_at",
      "end_reason",
      "admin_email",
      "admin_name",
      "target_email",
      "target_name",
      "reason",
      "initial_page",
      "ip_address",
    ];
    const escapeCsv = (val: unknown) => {
      const s = (val ?? "").toString();
      if (s.includes(",") || s.includes('"') || s.includes("\n")) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };
    const rows = data.rows.map((r) =>
      [
        r.started_at,
        r.ended_at || "",
        r.end_reason || "",
        r.admin?.email || "",
        r.admin?.full_name || "",
        r.target?.email || "",
        r.target?.full_name || "",
        r.reason,
        r.initial_page || "",
        r.ip_address || "",
      ]
        .map(escapeCsv)
        .join(","),
    );
    const csv = [header.map(escapeCsv).join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `view-as-log-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white border border-nfw-blackberry/10">
      {/* Toolbar */}
      <div className="p-4 border-b border-nfw-blackberry/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {(["all", "active", "ended"] as Status[]).map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                status === s
                  ? "bg-nfw-blackberry text-white"
                  : "bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30"
              }`}
            >
              {s === "all" ? "All" : s === "active" ? "Active" : "Ended"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:flex-initial sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nfw-blackberry/30" />
            <input
              type="text"
              placeholder="Search reason, admin, or target..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry transition-colors"
            />
          </div>
          <button
            onClick={exportCsv}
            disabled={!data || data.rows.length === 0}
            className="px-3 py-2 bg-nfw-aubergine/10 text-nfw-aubergine hover:bg-nfw-aubergine/20 text-sm font-medium flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-nfw-dove border-b border-nfw-blackberry/10">
              <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                Started At
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                Admin
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                Target
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                Initial Page
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
                Reason
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-nfw-blackberry/5">
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-nfw-blackberry/40">
                  <Loader2 className="inline w-5 h-5 animate-spin mr-2" />
                  Loading...
                </td>
              </tr>
            )}
            {!loading && data?.rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-nfw-blackberry/40">
                  No sessions match your filters.
                </td>
              </tr>
            )}
            {!loading &&
              data?.rows.map((row) => {
                const isOpen = !!expanded[row.id];
                return (
                  <tr
                    key={row.id}
                    className="hover:bg-nfw-dove/50 transition-colors cursor-pointer"
                    onClick={() =>
                      setExpanded((m) => ({ ...m, [row.id]: !m[row.id] }))
                    }
                  >
                    <td className="px-4 py-3 text-nfw-blackberry/80 text-xs whitespace-nowrap">
                      {formatTs(row.started_at)}
                    </td>
                    <td className="px-4 py-3 text-nfw-blackberry text-xs">
                      <div className="font-semibold">{row.admin?.full_name || "—"}</div>
                      <div className="text-nfw-blackberry/50 truncate max-w-[200px]">
                        {row.admin?.email || row.admin_user_id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-nfw-blackberry text-xs">
                      <div className="font-semibold">{row.target?.full_name || "—"}</div>
                      <div className="text-nfw-blackberry/50 truncate max-w-[200px]">
                        {row.target?.email || row.target_user_id}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-nfw-blackberry/70 text-xs">
                      {row.initial_page || "—"}
                    </td>
                    <td className="px-4 py-3 text-nfw-blackberry/70 text-xs max-w-md">
                      <div className={isOpen ? "whitespace-normal" : "line-clamp-2"}>
                        {row.reason}
                      </div>
                      {isOpen && (
                        <div className="mt-2 pt-2 border-t border-nfw-blackberry/5 text-xs text-nfw-blackberry/60">
                          {row.ip_address && (
                            <div>
                              <strong>IP:</strong> {row.ip_address}
                            </div>
                          )}
                          {row.user_agent && (
                            <div className="truncate">
                              <strong>User-Agent:</strong> {row.user_agent}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && (
        <div className="p-4 border-t border-nfw-blackberry/5 flex items-center justify-between">
          <p className="text-xs text-nfw-blackberry/50 font-medium">
            Showing {data.rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}-
            {Math.min(page * PAGE_SIZE, data.total)} of {data.total} sessions
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="px-3 py-1 text-xs bg-nfw-aubergine/10 text-nfw-aubergine hover:bg-nfw-aubergine/20 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <span className="text-xs text-nfw-blackberry/50">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1 text-xs bg-nfw-aubergine/10 text-nfw-aubergine hover:bg-nfw-aubergine/20 font-medium disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
