"use client";

import { useState, useEffect, useCallback } from "react";

interface WaitlistMember {
  id: string;
  full_name: string | null;
  email: string;
  waitlist_joined_at: string | null;
  waitlist_email_sent_at: string | null;
  is_approved_free_member: boolean;
  membership_level: string;
  joined_at: string;
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
  const [confirming, setConfirming] = useState(false);

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

      if (response.ok) {
        await fetchMembers(); // Refresh the list
      } else {
        const data = await response.json();
        alert(data.error || "Failed to approve member");
      }
    } catch (error) {
      console.error("Failed to approve:", error);
      alert("Failed to approve member");
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
      <div className="min-h-screen bg-nfw-dove flex items-center justify-center">
        <div className="text-nfw-aubergine font-ui">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-nfw-dove">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-serif text-nfw-blackberry">
            Waitlist Management
          </h1>
          <p className="text-nfw-aubergine/70 font-ui mt-2">
            Manage waitlist members and send welcome emails
          </p>
        </div>

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

        {/* Members Table */}
        {members.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center border border-nfw-aubergine/20">
            <p className="text-nfw-aubergine font-ui">No waitlist members yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden border border-nfw-aubergine/20">
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
                {members.map((member) => (
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
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-ui bg-nfw-wisteria/20 text-nfw-wisteria">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {!member.is_approved_free_member && (
                        <div className="flex gap-2">
                          {!member.waitlist_email_sent_at && (
                            <button
                              onClick={() => handleSendSingle(member.id)}
                              className="text-sm font-ui text-nfw-aubergine hover:text-nfw-aubergine/80 underline"
                            >
                              Send Email
                            </button>
                          )}
                          <button
                            onClick={() => handleApprove(member.id)}
                            className="px-3 py-1 bg-green-600 text-white rounded text-xs font-ui hover:bg-green-700"
                          >
                            Approve
                          </button>
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