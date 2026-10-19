"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Search, X } from "lucide-react";

type DeliveryStatus =
  | "sent"
  | "delivered"
  | "delivery_delayed"
  | "bounced"
  | "complained"
  | "failed"
  | "suppressed";

interface ApprovalEmail {
  status: DeliveryStatus;
  bounce_type: string | null;
  bounce_subtype: string | null;
  error_message: string | null;
  updated_at: string;
}

interface WaitlistMember {
  id: string;
  full_name: string | null;
  email: string;
  waitlist_joined_at: string | null;
  waitlist_email_sent_at: string | null;
  waitlist_acceptance_sent_at: string | null;
  is_approved_free_member: boolean;
  membership_level: string;
  joined_at: string;
  approval_email: ApprovalEmail | null;
}

const APPROVAL_WINDOW_DAYS = 30;
const PAGE_SIZE = 100;
const SEARCH_STORAGE_KEY = "waitlistSearch";

type Filter = "all" | "not_approved" | "pending" | "expired" | "delivery_issue";

const FILTER_LABELS: Record<Filter, string> = {
  all: "All",
  not_approved: "Not approved",
  pending: "Approval pending",
  expired: "Approval expired",
  delivery_issue: "Delivery issue",
};

const DELIVERY_ISSUE_STATUSES: DeliveryStatus[] = ["bounced", "failed", "suppressed", "complained"];

function hasDeliveryIssue(m: WaitlistMember): boolean {
  return !!m.approval_email && DELIVERY_ISSUE_STATUSES.includes(m.approval_email.status);
}

function matchesFilter(m: WaitlistMember, filter: Filter): boolean {
  const pending = !m.is_approved_free_member && !!m.waitlist_acceptance_sent_at;
  switch (filter) {
    case "all":
      return true;
    case "not_approved":
      return !m.is_approved_free_member && !m.waitlist_acceptance_sent_at;
    case "pending":
      return pending && daysUntilExpiry(m.waitlist_acceptance_sent_at) > 0;
    case "expired":
      return pending && daysUntilExpiry(m.waitlist_acceptance_sent_at) <= 0;
    case "delivery_issue":
      return pending && hasDeliveryIssue(m);
  }
}

function DeliveryBadge({ email }: { email: ApprovalEmail | null }) {
  if (!email) return null;

  const base = "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-ui";
  const detail = [email.bounce_type, email.bounce_subtype, email.error_message]
    .filter(Boolean)
    .join(" · ");

  switch (email.status) {
    case "delivered":
      return <span className={`${base} bg-green-50 text-green-700`}>Delivered</span>;
    case "sent":
      return <span className={`${base} bg-gray-100 text-gray-600`}>Sent to Resend</span>;
    case "delivery_delayed":
      return (
        <span className={`${base} bg-amber-50 text-amber-700`} title={detail || undefined}>
          Delivery delayed
        </span>
      );
    case "bounced": {
      const soft = email.bounce_type === "Transient";
      return (
        <span className={`${base} bg-red-50 text-red-700`} title={detail || undefined}>
          {soft ? "Bounced (soft)" : "Bounced"}
        </span>
      );
    }
    case "suppressed":
      return (
        <span className={`${base} bg-red-50 text-red-700`} title={detail || undefined}>
          Suppressed
        </span>
      );
    case "complained":
      return (
        <span className={`${base} bg-red-50 text-red-700`} title={detail || undefined}>
          Marked as spam
        </span>
      );
    case "failed":
      return (
        <span className={`${base} bg-red-50 text-red-700`} title={detail || undefined}>
          Send failed
        </span>
      );
  }
}

/**
 * Calculate the number of days remaining for a waitlist acceptance email.
 * Returns:
 *   - positive integer: days until expiry
 *   - 0: expiring today
 *   - negative integer: expired N days ago
 */
function daysUntilExpiry(sentAt: string | null): number {
  if (!sentAt) return 0;
  const ms = Date.now() - new Date(sentAt).getTime();
  const days = Math.floor(ms / (24 * 60 * 60 * 1000));
  return APPROVAL_WINDOW_DAYS - days;
}

interface Stats {
  total: number;
  emailsSent: number;
  emailsPending: number;
}

export default function AdminWaitlistClient() {
  const [members, setMembers] = useState<WaitlistMember[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, emailsSent: 0, emailsPending: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; message: string } | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  // Restore search from sessionStorage after mount (matches /admin/members)
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(SEARCH_STORAGE_KEY);
      if (stored) setSearch(stored);
    } catch {
      // sessionStorage unavailable — ignore
    }
  }, []);

  const updateSearch = (value: string) => {
    setSearch(value);
    setPage(1);
    try {
      if (value) sessionStorage.setItem(SEARCH_STORAGE_KEY, value);
      else sessionStorage.removeItem(SEARCH_STORAGE_KEY);
    } catch {
      // ignore
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return members.filter(
      (m) =>
        matchesFilter(m, filter) &&
        (!q ||
          (m.full_name?.toLowerCase() || "").includes(q) ||
          (m.email?.toLowerCase() || "").includes(q) ||
          m.id.toLowerCase().includes(q)),
    );
  }, [members, search, filter]);

  const filterCounts = useMemo(() => {
    const counts = {} as Record<Filter, number>;
    (Object.keys(FILTER_LABELS) as Filter[]).forEach((f) => {
      counts[f] = members.filter((m) => matchesFilter(m, f)).length;
    });
    return counts;
  }, [members]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageOffset = (currentPage - 1) * PAGE_SIZE;
  const pageMembers = filtered.slice(pageOffset, pageOffset + PAGE_SIZE);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/bulk/waitlist");
      const data = await response.json();
      setMembers(data.members || []);
      setStats(data.stats || { total: 0, emailsSent: 0, emailsPending: 0 });
    } catch (error) {
      console.error("Failed to fetch waitlist:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSendAll = async () => {
    if (!confirm("Are you sure you want to send emails to all " + stats.emailsPending + " pending members?")) {
      return;
    }

    setSending(true);
    setSendProgress(0);
    setSendResult(null);

    try {
      const response = await fetch("/api/admin/bulk/waitlist", {
        method: "POST",
      });
      const data = await response.json();
      setSendResult(data);
      await fetchMembers(); // Refresh the list
    } catch (error) {
      console.error("Failed to send emails:", error);
      setSendResult({ sent: 0, failed: 0, message: "Failed to send emails" });
    } finally {
      setSending(false);
      setSendProgress(100);
    }
  };

  const handleSendSingle = async (memberId: string) => {
    try {
      const response = await fetch(`/api/admin/bulk/waitlist?memberId=${memberId}`, {
        method: "PUT",
      });
      const data = await response.json();
      if (data.success) {
        await fetchMembers(); // Refresh the list
      } else {
        alert(data.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      alert("Failed to send email");
    }
  };

  const handleApprove = async (memberId: string) => {
    if (!confirm("Approve this member? They will receive the free membership welcome email.")) {
      return;
    }

    try {
      const response = await fetch("/api/admin/waitlist/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });

      const data = await response.json();
      if (response.ok) {
        setNotice({ ok: data.emailSent !== false, text: data.message });
        await fetchMembers(); // Refresh the list
      } else {
        alert(data.error || "Failed to approve member");
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to approve member");
    }
  };

  const handleResend = async (member: WaitlistMember) => {
    if (
      !confirm(
        `Send ${member.email} a new approval link?\n\nThe previous link will stop working and the 30-day window restarts.`,
      )
    ) {
      return;
    }

    setBusyId(member.id);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/waitlist/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      const data = await response.json();
      setNotice({
        ok: response.ok && data.success,
        text: data.message || data.error || "Failed to resend",
      });
      await fetchMembers();
    } catch (error) {
      console.error("Failed to resend:", error);
      setNotice({ ok: false, text: "Failed to resend approval email" });
    } finally {
      setBusyId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const utcDate = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    ));
    return utcDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      timeZone: "UTC",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const utcDate = new Date(Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes()
    ));
    return utcDate.toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    });
  };

  if (loading) {
    return (
      <div className="py-24 flex items-center justify-center">
        <div className="text-nfw-aubergine font-ui">Loading...</div>
      </div>
    );
  }

  return (
    <div>
      <div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 border border-nfw-aubergine/20">
            <div className="text-3xl font-serif text-nfw-aubergine">
              {stats.total}
            </div>
            <div className="text-sm font-ui text-nfw-aubergine/70 mt-1">
              Total Waitlist
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-nfw-aubergine/20">
            <div className="text-3xl font-serif text-green-600">
              {stats.emailsSent}
            </div>
            <div className="text-sm font-ui text-nfw-aubergine/70 mt-1">
              Emails Sent
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-nfw-aubergine/20">
            <div className="text-3xl font-serif text-nfw-wisteria">
              {stats.emailsPending}
            </div>
            <div className="text-sm font-ui text-nfw-aubergine/70 mt-1">
              Emails Pending
            </div>
          </div>
          <div className="bg-white rounded-lg p-6 border border-nfw-aubergine/20">
            <div className="text-3xl font-serif text-nfw-aubergine">
              {stats.total > 0 ? Math.round((stats.emailsSent / stats.total) * 100) : 0}%
            </div>
            <div className="text-sm font-ui text-nfw-aubergine/70 mt-1">
              Completion Rate
            </div>
          </div>
        </div>

        {/* Action Bar */}
        <div className="bg-white rounded-lg p-4 mb-6 flex items-center justify-between border border-nfw-aubergine/20">
          <div className="font-ui text-nfw-blackberry">
            {stats.emailsPending > 0 ? (
              <span>
                <strong>{stats.emailsPending}</strong> members waiting for welcome email
              </span>
            ) : (
              <span className="text-green-600">All waitlist members have received emails</span>
            )}
          </div>
          <button
            onClick={handleSendAll}
            disabled={sending || stats.emailsPending === 0}
            className="px-6 py-3 bg-nfw-aubergine text-white font-ui rounded-lg hover:bg-nfw-aubergine/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? "Sending..." : `Send All Unsent Emails (${stats.emailsPending})`}
          </button>
        </div>

        {/* Progress Bar */}
        {sending && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-nfw-aubergine/20">
            <div className="text-sm font-ui text-nfw-blackberry mb-2">
              Sending emails...
            </div>
            <div className="w-full bg-nfw-dove rounded-full h-2">
              <div
                className="bg-nfw-aubergine h-2 rounded-full transition-all duration-300"
                style={{ width: `${sendProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Result Message */}
        {sendResult && (
          <div className={`rounded-lg p-4 mb-6 ${sendResult.failed === 0 ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
            <div className="font-ui text-sm">
              {sendResult.failed === 0 ? (
                <span className="text-green-700">
                  Successfully sent {sendResult.sent} emails!
                </span>
              ) : (
                <span className="text-red-700">
                  Sent {sendResult.sent} emails, {sendResult.failed} failed. {sendResult.message}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Notice (approve / resend results) */}
        {notice && (
          <div
            className={`rounded-lg p-4 mb-6 flex items-start justify-between gap-4 ${
              notice.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
            }`}
          >
            <span className={`font-ui text-sm ${notice.ok ? "text-green-700" : "text-red-700"}`}>
              {notice.text}
            </span>
            <button
              onClick={() => setNotice(null)}
              className="text-nfw-blackberry/40 hover:text-nfw-blackberry"
              aria-label="Dismiss"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Members Table */}
        {members.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-nfw-aubergine/20">
            <p className="text-nfw-aubergine font-ui">No waitlist members yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-nfw-aubergine/20">
            {/* Toolbar: search + filters (matches /admin/members) */}
            <div className="p-4 border-b border-nfw-blackberry/5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <div className="relative flex-1 max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nfw-blackberry/30" />
                <input
                  type="text"
                  placeholder="Search by name, email, or ID..."
                  value={search}
                  onChange={(e) => updateSearch(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 text-sm border border-nfw-blackberry/20 focus:outline-none focus:border-nfw-blackberry transition-colors"
                />
                {search && (
                  <button
                    onClick={() => updateSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-nfw-blackberry/40 hover:text-nfw-blackberry"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(FILTER_LABELS) as Filter[]).map((f) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f);
                      setPage(1);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold transition-colors ${
                      filter === f
                        ? "bg-nfw-blackberry text-white"
                        : f === "delivery_issue" && filterCounts[f] > 0
                        ? "bg-red-50 text-red-700 hover:bg-red-100"
                        : "bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30"
                    }`}
                  >
                    {FILTER_LABELS[f]} ({filterCounts[f]})
                  </button>
                ))}
              </div>
            </div>

            {/* Results count + pagination */}
            <div className="px-4 py-2 bg-nfw-dove border-b border-nfw-blackberry/5 flex items-center justify-between">
              <p className="text-xs text-nfw-blackberry/50 font-medium">
                Showing {filtered.length === 0 ? 0 : pageOffset + 1}-
                {Math.min(pageOffset + PAGE_SIZE, filtered.length)} of {filtered.length} members
                {filtered.length !== members.length && ` (filtered from ${members.length} total)`}
              </p>
              <div className="flex items-center gap-2">
                {currentPage > 1 && (
                  <button
                    onClick={() => setPage(currentPage - 1)}
                    className="px-3 py-1 text-xs bg-nfw-aubergine/10 text-nfw-aubergine hover:bg-nfw-aubergine/20 font-medium"
                  >
                    ← Previous
                  </button>
                )}
                {currentPage < totalPages && (
                  <button
                    onClick={() => setPage(currentPage + 1)}
                    className="px-3 py-1 text-xs bg-nfw-aubergine/10 text-nfw-aubergine hover:bg-nfw-aubergine/20 font-medium"
                  >
                    Next →
                  </button>
                )}
              </div>
            </div>

            <table className="w-full">
              <thead>
                <tr className="bg-nfw-aubergine/10">
                  <th className="px-4 py-3 text-left text-sm font-ui font-semibold text-nfw-blackberry">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-ui font-semibold text-nfw-blackberry">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-ui font-semibold text-nfw-blackberry">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-ui font-semibold text-nfw-blackberry">
                    Email Status
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-ui font-semibold text-nfw-blackberry">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pageMembers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-sm font-ui text-nfw-aubergine/70">
                      No members match your search.
                    </td>
                  </tr>
                )}
                {pageMembers.map((member) => (
                  <tr
                    key={member.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-4 text-nfw-blackberry font-ui text-sm">
                      {member.full_name || "—"}
                    </td>
                    <td className="px-4 py-4 text-nfw-aubergine font-ui text-sm">
                      {member.email}
                    </td>
                    <td className="px-4 py-4 text-nfw-aubergine font-ui text-sm">
                      {formatDate(member.waitlist_joined_at)}
                    </td>
                    <td className="px-4 py-4">
                      {member.waitlist_email_sent_at ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-ui bg-green-100 text-green-700">
                          Sent {formatDateTime(member.waitlist_email_sent_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-ui bg-nfw-wisteria/20 text-nfw-wisteria">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {member.is_approved_free_member ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-ui bg-green-100 text-green-700">
                          Approved ({member.membership_level})
                        </span>
                      ) : member.waitlist_acceptance_sent_at ? (
                        (() => {
                          const daysLeft = daysUntilExpiry(member.waitlist_acceptance_sent_at);
                          const expired = daysLeft <= 0;
                          return (
                            <div className="flex flex-col items-start gap-1">
                              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-ui bg-nfw-citrine/30 text-nfw-blackberry">
                                {expired
                                  ? `Sent · expired ${Math.abs(daysLeft)}d ago`
                                  : daysLeft === 1
                                  ? `Sent · 1 day left`
                                  : `Sent · ${daysLeft} days left`}
                              </span>
                              <DeliveryBadge email={member.approval_email} />
                            </div>
                          );
                        })()
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-ui bg-nfw-wisteria/20 text-nfw-wisteria">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {!member.is_approved_free_member && (
                        <div className="flex gap-2">
                          {!member.waitlist_acceptance_sent_at && !member.waitlist_email_sent_at && (
                            <button
                              onClick={() => handleSendSingle(member.id)}
                              className="text-sm font-ui text-nfw-aubergine hover:text-nfw-aubergine/80 underline"
                            >
                              Send Email
                            </button>
                          )}
                          {!member.waitlist_acceptance_sent_at && (
                            <button
                              onClick={() => handleApprove(member.id)}
                              className="px-3 py-1 bg-green-600 text-white rounded text-xs font-ui hover:bg-green-700"
                            >
                              Approve
                            </button>
                          )}
                          {member.waitlist_acceptance_sent_at && (
                            <button
                              onClick={() => handleResend(member)}
                              disabled={busyId === member.id}
                              className={
                                hasDeliveryIssue(member)
                                  ? "px-3 py-1 bg-red-600 text-white rounded text-xs font-ui hover:bg-red-700 disabled:opacity-50"
                                  : "text-sm font-ui text-nfw-aubergine hover:text-nfw-aubergine/80 underline disabled:opacity-50"
                              }
                            >
                              {busyId === member.id ? "Sending…" : "Resend"}
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}