"use client";

import { useState, useEffect, useCallback } from "react";

interface IncompleteMember {
  id: string;
  full_name: string | null;
  email: string;
  profile_completed: boolean | null;
  incomplete_email_sent_at: string | null;
  membership_level: string | null;
  joined_at: string;
}

interface Stats {
  total: number;
  emailsSent: number;
  emailsPending: number;
}

export default function AdminIncompleteMembersClient() {
  const [members, setMembers] = useState<IncompleteMember[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, emailsSent: 0, emailsPending: 0 });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);
  const [sendResult, setSendResult] = useState<{ sent: number; failed: number; message: string } | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState("");

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/bulk/incomplete-members");
      const data = await response.json();
      setMembers(data.members || []);
      setStats(data.stats || { total: 0, emailsSent: 0, emailsPending: 0 });
    } catch (error) {
      console.error("Failed to fetch incomplete members:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const handleSendAll = async () => {
    if (!confirm("Are you sure you want to send reengagement emails to all " + stats.emailsPending + " incomplete members?")) {
      return;
    }

    setSending(true);
    setSendProgress(0);
    setSendResult(null);

    try {
      const response = await fetch("/api/admin/bulk/incomplete-members", {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        setSending(false);
        setSendProgress(100);
        setErrorModalMessage(data.error || "Failed to send emails");
        setShowErrorModal(true);
        return;
      }

      setSendResult(data);
      await fetchMembers(); // Refresh the list
    } catch (error) {
      console.error("Failed to send emails:", error);
      setErrorModalMessage("Failed to send emails");
      setShowErrorModal(true);
    } finally {
      setSending(false);
      setSendProgress(100);
    }
  };

  const handleSendSingle = async (memberId: string) => {
    try {
      const response = await fetch(`/api/admin/bulk/incomplete-members?memberId=${memberId}`, {
        method: "PUT",
      });
      const data = await response.json();

      if (!response.ok) {
        setErrorModalMessage(data.error || "Failed to send email");
        setShowErrorModal(true);
        return;
      }

      if (data.success) {
        await fetchMembers(); // Refresh the list
      } else {
        setErrorModalMessage(data.error || "Failed to send email");
        setShowErrorModal(true);
      }
    } catch (error) {
      console.error("Failed to send email:", error);
      setErrorModalMessage("Failed to send email");
      setShowErrorModal(true);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  };

  const formatDateTime = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
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
            Incomplete Member Reengagement
          </h1>
          <p className="text-nfw-aubergine/70 font-ui mt-2">
            Send reengagement emails to members who haven&apos;t completed their signup
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg p-6 border border-nfw-aubergine/20">
            <div className="text-3xl font-serif text-nfw-aubergine">
              {stats.total}
            </div>
            <div className="text-sm font-ui text-nfw-aubergine/70 mt-1">
              Total Incomplete
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
                <strong>{stats.emailsPending}</strong> members waiting for reengagement email
              </span>
            ) : (
              <span className="text-green-600">All incomplete members have received emails</span>
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
            <p className="text-nfw-aubergine font-ui">No incomplete members found.</p>
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
                    Membership
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
                      {formatDate(member.joined_at)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-ui ${
                        member.membership_level === 'free' 
                          ? 'bg-nfw-lilac/20 text-nfw-aubergine' 
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {member.membership_level || 'NULL'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {member.incomplete_email_sent_at ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-ui bg-green-100 text-green-700">
                          Sent {formatDateTime(member.incomplete_email_sent_at)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-ui bg-nfw-wisteria/20 text-nfw-wisteria">
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {!member.incomplete_email_sent_at && (
                        <button
                          onClick={() => handleSendSingle(member.id)}
                          className="text-sm font-ui text-nfw-aubergine hover:text-nfw-aubergine/80 underline"
                        >
                          Send Email
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-ui font-semibold text-red-800">Cannot Send Email</h3>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-nfw-blackberry font-ui text-sm">{errorModalMessage}</p>
            </div>
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-100 flex justify-end">
              <button
                onClick={() => setShowErrorModal(false)}
                className="px-4 py-2 bg-nfw-aubergine text-white font-ui text-sm rounded hover:bg-nfw-aubergine/90 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}