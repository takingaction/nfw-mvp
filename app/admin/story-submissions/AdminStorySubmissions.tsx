"use client";

import { useState, useEffect } from "react";
import { Search, Download, RefreshCw, Eye, Trash2 } from "lucide-react";

interface StorySubmission {
  id: string;
  name: string;
  email: string;
  age: string;
  city: string | null;
  state: string | null;
  drawn_to_membership: string | null;
  programs_engaged: string | null;
  favorite_part: string | null;
  how_nfw_helped: string | null;
  why_join: string | null;
  permission_granted: boolean;
  prefer_anonymous: boolean;
  interested_video: boolean;
  status: string;
  created_at: string;
}

export default function AdminStorySubmissions() {
  const [submissions, setSubmissions] = useState<StorySubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<StorySubmission | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search) params.set("q", search);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);
      params.set("page", page.toString());

      const res = await fetch(`/api/admin/story-submissions?${params}`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [status, page, startDate, endDate]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/admin/story-submissions", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchSubmissions();
        if (selectedSubmission?.id === id) {
          setSelectedSubmission((prev) => prev ? { ...prev, status: newStatus } : null);
        }
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;
    try {
      const res = await fetch("/api/admin/story-submissions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        fetchSubmissions();
        if (selectedSubmission?.id === id) {
          setSelectedSubmission(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  const exportCSV = () => {
    const headers = ["Date", "Name", "Email", "Age", "Location", "Status", "Permission", "Anonymous", "Video"];
    const rows = submissions.map((s) => [
      new Date(s.created_at).toLocaleDateString(),
      s.name,
      s.email,
      s.age,
      `${s.city || ""}${s.city && s.state ? ", " : ""}${s.state || ""}`,
      s.status,
      s.permission_granted ? "Yes" : "No",
      s.prefer_anonymous ? "Yes" : "No",
      s.interested_video ? "Yes" : "No",
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `story-submissions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (subStatus: string | null) => {
    switch (subStatus) {
      case "approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Approved
          </span>
        );
      case "reviewed":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Reviewed
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
            Unknown
          </span>
        );
    }
  };

  const getLocation = (s: StorySubmission) => {
    const parts = [s.city, s.state].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "—";
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-ui text-2xl font-black tracking-[0.03em] text-nfw-blackberry uppercase">
            Story Submissions
          </h1>
          <p className="font-sans text-nfw-blackberry/60 mt-1">
            {total} total submission{total !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex gap-2">
            {["all", "pending", "reviewed", "approved"].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatus(s);
                  setPage(1);
                }}
                className={`px-4 py-2 font-ui text-xs font-black tracking-[0.06em] uppercase transition-colors ${
                  status === s
                    ? "bg-nfw-aubergine text-nfw-dove"
                    : "bg-nfw-dove text-nfw-blackberry hover:bg-nfw-dove/80"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nfw-blackberry/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 pr-4 py-2 border border-nfw-blackberry/20 font-sans text-sm text-nfw-blackberry placeholder-nfw-blackberry/30 focus:outline-none focus:border-nfw-aubergine transition-colors"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-nfw-aubergine text-nfw-dove font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-nfw-aubergine/90 transition-colors"
            >
              Search
            </button>
          </form>

          <div className="flex gap-2">
            <button
              onClick={() => fetchSubmissions()}
              className="p-2 bg-nfw-dove text-nfw-blackberry hover:bg-nfw-dove/80 transition-colors"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 bg-nfw-dove text-nfw-blackberry font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-nfw-dove/80 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 mb-6">
          <div className="flex items-center gap-2">
            <label className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
              From:
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
              To:
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine"
            />
          </div>
          {(startDate || endDate) && (
            <button
              onClick={() => {
                setStartDate("");
                setEndDate("");
                setPage(1);
              }}
              className="px-3 py-2 text-nfw-blackberry/60 font-sans text-xs hover:text-nfw-blackberry"
            >
              Clear dates
            </button>
          )}
        </div>

        <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-nfw-dove">
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Age
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Location
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nfw-blackberry/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center font-sans text-sm text-nfw-blackberry/60">
                      Loading...
                    </td>
                  </tr>
                ) : submissions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center font-sans text-sm text-nfw-blackberry/60">
                      No submissions found
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-nfw-dove/30 transition-colors">
                      <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry">
                        {new Date(sub.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry">
                        {sub.name}
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry">
                        {sub.email}
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry">
                        {sub.age}
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry">
                        {getLocation(sub)}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(sub.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="p-1.5 bg-nfw-aubergine/10 text-nfw-aubergine hover:bg-nfw-aubergine/20 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(sub.id)}
                            className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 bg-nfw-dove border-t border-nfw-blackberry/10">
              <span className="font-sans text-xs text-nfw-blackberry/60">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 bg-white border border-nfw-blackberry/20 font-ui text-xs font-black tracking-[0.06em] uppercase disabled:opacity-50 hover:bg-nfw-dove transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 bg-white border border-nfw-blackberry/20 font-ui text-xs font-black tracking-[0.06em] uppercase disabled:opacity-50 hover:bg-nfw-dove transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {selectedSubmission && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl">
            <div className="p-6 border-b border-nfw-blackberry/10 flex items-center justify-between">
              <h2 className="font-ui text-lg font-black tracking-[0.03em] uppercase text-nfw-blackberry">
                Submission Details
              </h2>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1 hover:bg-nfw-blackberry/10 transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                    Date
                  </p>
                  <p className="font-sans text-sm text-nfw-blackberry">
                    {new Date(selectedSubmission.created_at).toLocaleString()}
                  </p>
                </div>
                {getStatusBadge(selectedSubmission.status)}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                    Name
                  </p>
                  <p className="font-sans text-sm text-nfw-blackberry">{selectedSubmission.name}</p>
                </div>
                <div>
                  <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                    Email
                  </p>
                  <p className="font-sans text-sm text-nfw-blackberry">{selectedSubmission.email}</p>
                </div>
                <div>
                  <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                    Age
                  </p>
                  <input
                    type="number"
                    value={selectedSubmission.age}
                    onChange={(e) => setSelectedSubmission((prev) => prev ? { ...prev, age: e.target.value } : null)}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
                <div>
                  <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                    Location
                  </p>
                  <input
                    type="text"
                    value={`${selectedSubmission.city || ""}${selectedSubmission.city && selectedSubmission.state ? ", " : ""}${selectedSubmission.state || ""}`}
                    onChange={(e) => {
                      const val = e.target.value;
                      const parts = val.split(",").map((p) => p.trim());
                      setSelectedSubmission((prev) => prev ? {
                        ...prev,
                        city: parts[0] || "",
                        state: parts[1] || "",
                      } : null);
                    }}
                    className="w-full px-3 py-2 border border-nfw-blackberry/20 font-sans text-sm focus:outline-none focus:border-nfw-aubergine"
                  />
                </div>
              </div>

              <div className="border-t border-nfw-blackberry/10 pt-4">
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
                  Story Responses
                </p>
                {[
                  { label: "What drew you to becoming a National Fund for Women member?", value: selectedSubmission.drawn_to_membership },
                  { label: "Which NFW program(s) have you engaged with?", value: selectedSubmission.programs_engaged },
                  { label: "What is your favorite part about being an NFW member?", value: selectedSubmission.favorite_part },
                  { label: "How has NFW helped you?", value: selectedSubmission.how_nfw_helped },
                  { label: "Why should others join NFW?", value: selectedSubmission.why_join },
                ].map((field, i) => (
                  <div key={i} className="mb-3">
                    <p className="font-sans text-xs font-semibold text-nfw-blackberry/70 mb-1">{field.label}</p>
                    <p className="font-sans text-sm text-nfw-blackberry whitespace-pre-wrap bg-nfw-dove/50 p-2">
                      {field.value || "No response"}
                    </p>
                  </div>
                ))}
              </div>

              <div className="border-t border-nfw-blackberry/10 pt-4">
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-3">
                  Permissions
                </p>
                <div className="space-y-2">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSubmission.permission_granted}
                      onChange={(e) => setSelectedSubmission((prev) => prev ? { ...prev, permission_granted: e.target.checked } : null)}
                      className="w-4 h-4 accent-nfw-aubergine"
                    />
                    <span className="font-sans text-sm text-nfw-blackberry">
                      Permission to use quotes (external outreach)
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSubmission.prefer_anonymous}
                      onChange={(e) => setSelectedSubmission((prev) => prev ? { ...prev, prefer_anonymous: e.target.checked } : null)}
                      className="w-4 h-4 accent-nfw-aubergine"
                    />
                    <span className="font-sans text-sm text-nfw-blackberry">
                      Prefer anonymous
                    </span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedSubmission.interested_video}
                      onChange={(e) => setSelectedSubmission((prev) => prev ? { ...prev, interested_video: e.target.checked } : null)}
                      className="w-4 h-4 accent-nfw-aubergine"
                    />
                    <span className="font-sans text-sm text-nfw-blackberry">
                      Interested in video
                    </span>
                  </label>
                </div>
              </div>

              <div className="border-t border-nfw-blackberry/10 pt-4 flex gap-2">
                {selectedSubmission.status === "pending" && (
                  <button
                    onClick={() => handleStatusChange(selectedSubmission.id, "reviewed")}
                    className="px-4 py-2 bg-blue-600 text-white font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-blue-700 transition-colors"
                  >
                    Mark as Reviewed
                  </button>
                )}
                {selectedSubmission.status !== "approved" && (
                  <button
                    onClick={() => handleStatusChange(selectedSubmission.id, "approved")}
                    className="px-4 py-2 bg-green-600 text-white font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-green-700 transition-colors"
                  >
                    Mark as Approved
                  </button>
                )}
                {(selectedSubmission.status === "approved" || selectedSubmission.status === "reviewed") && (
                  <button
                    onClick={() => handleStatusChange(selectedSubmission.id, "pending")}
                    className="px-4 py-2 bg-yellow-600 text-white font-ui text-xs font-black tracking-[0.06em] uppercase hover:bg-yellow-700 transition-colors"
                  >
                    Revert to Pending
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}