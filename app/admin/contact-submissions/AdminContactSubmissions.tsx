"use client";

import { useState, useEffect } from "react";
import { Search, Download, RefreshCw, Eye, Check } from "lucide-react";
import { FreeMembershipApprovalModal } from "@/components/admin/FreeMembershipApprovalModal";

interface Submission {
  id: string;
  name: string;
  email: string;
  subject_label: string;
  message: string;
  freshdesk_status: string | null;
  freshdesk_ticket_id: string | null;
  freshdesk_response: string | null;
  created_at: string;
}

export default function AdminContactSubmissions() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Map of email -> isApprovedFreeMember for free membership requests
  const [approvalStatusMap, setApprovalStatusMap] = useState<Map<string, boolean>>(new Map());

  // Approval modal state
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvingSubmission, setApprovingSubmission] = useState<Submission | null>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSendError, setEmailSendError] = useState<string | null>(null);

  // Fetch approval statuses for free membership requests
  const fetchApprovalStatuses = async (subs: Submission[]) => {
    const freeRequestEmails = subs
      .filter((s) => isFreeMembershipRequest(s))
      .map((s) => s.email)
      .filter((email) => email); // Filter out empty emails

    if (freeRequestEmails.length === 0) return;

    // Dedupe emails
    const uniqueEmails = [...new Set(freeRequestEmails)];

    try {
      const res = await fetch(
        `/api/admin/contact-submissions/approval-statuses?emails=${uniqueEmails.join(",")}`
      );
      if (res.ok) {
        const data = await res.json();
        setApprovalStatusMap(new Map(data.statuses || []));
      }
    } catch (err) {
      console.error("Failed to fetch approval statuses:", err);
    }
  };

  const fetchSubmissions = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (status !== "all") params.set("status", status);
      if (search) params.set("q", search);
      params.set("page", page.toString());

      const res = await fetch(`/api/admin/contact-submissions?${params}`);
      const data = await res.json();
      setSubmissions(data.submissions || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

      // Fetch approval statuses for free membership requests
      await fetchApprovalStatuses(data.submissions || []);
    } catch (err) {
      console.error("Failed to fetch submissions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubmissions();
  }, [status, page]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSubmissions();
  };

  const handleApprove = async () => {
    if (!approvingSubmission) return;

    setSendingEmail(true);
    setEmailSendError(null);

    try {
      const res = await fetch("/api/admin/contact-submissions/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ submissionId: approvingSubmission.id }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to approve");
      }

      // Close modal and refresh
      setShowApprovalModal(false);
      setApprovingSubmission(null);
      fetchSubmissions();
    } catch (err: any) {
      setEmailSendError(err.message || "Failed to approve");
    } finally {
      setSendingEmail(false);
    }
  };

  const openApprovalModal = (submission: Submission) => {
    setApprovingSubmission(submission);
    setEmailSendError(null);
    setShowApprovalModal(true);
  };

  const exportCSV = () => {
    const headers = ["Date", "Name", "Email", "Subject", "Status", "Ticket ID", "Message"];
    const rows = submissions.map((s) => [
      new Date(s.created_at).toLocaleDateString(),
      s.name,
      s.email,
      s.subject_label,
      s.freshdesk_status || "pending",
      s.freshdesk_ticket_id || "",
      s.message.replace(/"/g, '""'),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join(
      "\n"
    );

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `contact-submissions-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  const getStatusBadge = (subStatus: string | null) => {
    switch (subStatus) {
      case "created":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Created
          </span>
        );
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            Rejected
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            Error
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
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

  const isFreeMembershipRequest = (sub: Submission) => {
    return sub.subject_label === "Free Membership Request";
  };

  const isFreeMemberApproved = (sub: Submission): boolean => {
    if (!isFreeMembershipRequest(sub)) return false;
    return approvalStatusMap.get(sub.email) === true;
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="font-ui text-2xl font-black tracking-[0.03em] text-nfw-blackberry uppercase">
            Contact Form Submissions
          </h1>
          <p className="font-sans text-nfw-blackberry/60 mt-1">
            {total} total submission{total !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          {/* Status tabs */}
          <div className="flex gap-2 flex-wrap">
            {["all", "created", "rejected", "error", "pending", "free"].map((s) => (
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
                {s === "free" ? "Free Request" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>

          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nfw-blackberry/40" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name, email, or message..."
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

          {/* Actions */}
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

        {/* Table */}
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
                    Subject
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Member
                  </th>
                  <th className="px-4 py-3 text-left font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/60">
                    Ticket ID
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
                    <tr
                      key={sub.id}
                      className={`hover:bg-nfw-dove/30 transition-colors ${
                        isFreeMembershipRequest(sub) ? "border-l-4 border-nfw-citrine" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry">
                        {new Date(sub.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry">
                        {sub.name}
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry">
                        {sub.email}
                      </td>
                      <td className="px-4 py-3 font-sans text-sm text-nfw-blackberry">
                        {sub.subject_label}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(sub.freshdesk_status)}</td>
                      <td className="px-4 py-3">
                        {isFreeMembershipRequest(sub) ? (
                          isFreeMemberApproved(sub) ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Approved
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                              Pending
                            </span>
                          )
                        ) : (
                          <span className="text-nfw-blackberry/30">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-nfw-blackberry/60">
                        {sub.freshdesk_ticket_id || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {isFreeMembershipRequest(sub) && (
                            isFreeMemberApproved(sub) ? (
                              <span
                                className="p-1.5 bg-green-100 text-green-800 cursor-default"
                                title="Already approved"
                              >
                                <Check className="w-4 h-4" />
                              </span>
                            ) : (
                              <button
                                onClick={() => openApprovalModal(sub)}
                                className="p-1.5 bg-nfw-citrine text-nfw-blackberry hover:bg-nfw-citrine/80 transition-colors"
                                title="Approve free membership"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )
                          )}
                          <button
                            onClick={() => setSelectedSubmission(sub)}
                            className="p-1.5 bg-nfw-aubergine/10 text-nfw-aubergine hover:bg-nfw-aubergine/20 transition-colors"
                            title="View details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
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

      {/* Detail Modal */}
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
              <div>
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                  Date
                </p>
                <p className="font-sans text-sm text-nfw-blackberry">
                  {new Date(selectedSubmission.created_at).toLocaleString()}
                </p>
              </div>
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
                  Subject
                </p>
                <p className="font-sans text-sm text-nfw-blackberry">
                  {selectedSubmission.subject_label}
                </p>
              </div>
              <div>
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                  Status
                </p>
                <div>{getStatusBadge(selectedSubmission.freshdesk_status)}</div>
              </div>
              <div>
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                  Ticket ID
                </p>
                <p className="font-mono text-sm text-nfw-blackberry">
                  {selectedSubmission.freshdesk_ticket_id || "—"}
                </p>
              </div>
              <div>
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                  Freshdesk Response
                </p>
                <p className="font-mono text-xs text-nfw-blackberry/60 bg-nfw-dove p-2">
                  {selectedSubmission.freshdesk_response || "—"}
                </p>
              </div>
              <div>
                <p className="font-ui text-xs font-black tracking-[0.06em] uppercase text-nfw-blackberry/40 mb-1">
                  Message
                </p>
                <p className="font-sans text-sm text-nfw-blackberry whitespace-pre-wrap">
                  {selectedSubmission.message}
                </p>
              </div>
              {isFreeMembershipRequest(selectedSubmission) && (
                <div className="pt-4 border-t border-nfw-blackberry/10">
                  {isFreeMemberApproved(selectedSubmission) ? (
                    <div className="py-3 bg-green-50 text-green-800 font-ui text-sm font-bold text-center flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      Member Already Approved
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setSelectedSubmission(null);
                        openApprovalModal(selectedSubmission);
                      }}
                      className="w-full py-3 bg-nfw-wisteria text-white font-bold text-sm hover:bg-nfw-wisteria/90 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      Approve Free Membership
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Approval Confirmation Modal */}
      <FreeMembershipApprovalModal
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setApprovingSubmission(null);
          setEmailSendError(null);
        }}
        onConfirm={handleApprove}
        memberName={approvingSubmission?.name}
        sendingEmail={sendingEmail}
        emailSendError={emailSendError}
      />
    </div>
  );
}
