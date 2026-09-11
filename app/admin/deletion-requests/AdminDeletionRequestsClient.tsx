"use client";

import { useState, useEffect } from 'react';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const months = ['01','02','03','04','05','06','07','08','09','10','11','12'];
  const month = months[d.getMonth()];
  const day = String(d.getDate()).padStart(2, '0');
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${month}/${day}/${year} ${hours}:${minutes} ${ampm}`;
}

interface DeletionRequest {
  id: string;
  user_id: string;
  email: string;
  status: "pending" | "verified" | "processed" | "cancelled";
  created_at: string;
  verified_at?: string;
  processed_at?: string;
  cancelled_at?: string;
  profile?: {
    id: string;
    full_name: string;
    email: string;
    membership_level: string;
    subscription_status: string;
  };
}

interface LogEntry {
  id: string;
  action: string;
  table_name: string;
  details: any;
  performed_by: string;
  created_at: string;
}

export default function AdminDeletionRequestsClient() {
  const [requests, setRequests] = useState<DeletionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<DeletionRequest | null>(null);
  const [detailData, setDetailData] = useState<{
    logs: LogEntry[];
    pendingDocuments: any[];
    financialHold: any;
    pendingGrants: any[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "verified" | "processed">("all");
  const [processing, setProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/admin/deletion-requests");
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRequestDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/admin/deletion-requests/${id}`);
      const data = await res.json();
      setDetailData(data);
      setSelectedRequest(data.request);
    } catch (error) {
      console.error("Error fetching request details:", error);
    }
  };

  const handleVerify = async (id: string) => {
    setProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/deletion-requests/${id}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setActionMessage({ type: "error", text: data.error });
      } else {
        setActionMessage({ type: "success", text: "Request verified successfully" });
        fetchRequests();
        fetchRequestDetails(id);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "Failed to verify request" });
    } finally {
      setProcessing(false);
    }
  };

  const handleProcess = async (id: string) => {
    if (!confirm("Are you sure you want to process this deletion request? This action cannot be undone.")) {
      return;
    }
    setProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/deletion-requests/${id}/process`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setActionMessage({ type: "error", text: data.error });
      } else {
        setActionMessage({ type: "success", text: "Account anonymized successfully" });
        fetchRequests();
        fetchRequestDetails(id);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "Failed to process request" });
    } finally {
      setProcessing(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this deletion request?")) {
      return;
    }
    setProcessing(true);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/admin/deletion-requests/${id}/cancel`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setActionMessage({ type: "error", text: data.error });
      } else {
        setActionMessage({ type: "success", text: "Request cancelled successfully" });
        fetchRequests();
        fetchRequestDetails(id);
      }
    } catch (error) {
      setActionMessage({ type: "error", text: "Failed to cancel request" });
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (activeTab === "all") return true;
    return r.status === activeTab;
  });

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="px-2 py-1 text-xs font-semibold bg-yellow-100 text-yellow-800">Pending</span>;
      case "verified":
        return <span className="px-2 py-1 text-xs font-semibold bg-blue-100 text-blue-800">Verified</span>;
      case "processed":
        return <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-800">Processed</span>;
      case "cancelled":
        return <span className="px-2 py-1 text-xs font-semibold bg-gray-100 text-gray-800">Cancelled</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-nfw-blackberry">Deletion Requests</h1>
          <p className="text-sm text-gray-600 mt-1">
            Review and process member account deletion requests
          </p>
        </div>

        {actionMessage && (
          <div
            className={`mb-4 p-4 rounded-lg ${
              actionMessage.type === "success"
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            {actionMessage.text}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-4">
            {(["all", "pending", "verified", "processed"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-2 px-3 text-sm font-medium border-b-2 ${
                  activeTab === tab
                    ? "border-nfw-aubergine text-nfw-aubergine"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab !== "all" && (
                  <span className="ml-2 text-xs">
                    ({requests.filter((r) => r.status === tab).length})
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Requests List */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {loading ? (
                <div className="p-4 text-center text-gray-500">Loading...</div>
              ) : filteredRequests.length === 0 ? (
                <div className="p-4 text-center text-gray-500">No requests found</div>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {filteredRequests.map((request) => (
                    <li
                      key={request.id}
                      onClick={() => fetchRequestDetails(request.id)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 ${
                        selectedRequest?.id === request.id ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">
                          {request.profile?.full_name || "Unknown"}
                        </span>
                        {statusBadge(request.status)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {request.email || request.profile?.email || "No email"}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatDate(request.created_at)}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Request Details */}
          <div className="lg:col-span-2">
            {!selectedRequest ? (
              <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
                Select a request to view details
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-nfw-blackberry">
                      Request Details
                    </h2>
                    {statusBadge(selectedRequest.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Member:</span>
                      <p className="font-medium">
                        {selectedRequest.profile?.full_name || "Unknown"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Email:</span>
                      <p className="font-medium">{selectedRequest.email}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Membership:</span>
                      <p className="font-medium">
                        {selectedRequest.profile?.membership_level || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Subscription:</span>
                      <p className="font-medium">
                        {selectedRequest.profile?.subscription_status || "N/A"}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Created:</span>
                      <p className="font-medium">
                        {formatDate(selectedRequest.created_at)}
                      </p>
                    </div>
                    {selectedRequest.verified_at && (
                      <div>
                        <span className="text-gray-500">Verified:</span>
                        <p className="font-medium">
                          {formatDate(selectedRequest.verified_at)}
                        </p>
                      </div>
                    )}
                    {selectedRequest.processed_at && (
                      <div>
                        <span className="text-gray-500">Processed:</span>
                        <p className="font-medium">
                          {formatDate(selectedRequest.processed_at)}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Financial Hold Warning */}
                  {detailData?.financialHold && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">Financial Hold</span>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        {detailData.financialHold.message}
                      </p>
                    </div>
                  )}

                  {/* Pending Grants Warning */}
                  {detailData?.pendingGrants && detailData.pendingGrants.length > 0 && (
                    <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-800">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                        <span className="font-medium">Pending Grant Applications</span>
                      </div>
                      <p className="text-sm text-yellow-700 mt-1">
                        Member has {detailData.pendingGrants.length} pending grant application(s)
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="mt-6 flex gap-3">
                    {selectedRequest.status === "pending" && (
                      <button
                        onClick={() => handleVerify(selectedRequest.id)}
                        disabled={processing}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {processing ? "Verifying..." : "Verify Request"}
                      </button>
                    )}
                    {selectedRequest.status === "pending" && (
                      <button
                        onClick={() => handleCancel(selectedRequest.id)}
                        disabled={processing}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                      >
                        Cancel Request
                      </button>
                    )}
                    {selectedRequest.status === "verified" && (
                      <>
                        <button
                          onClick={() => handleProcess(selectedRequest.id)}
                          disabled={processing}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                        >
                          {processing ? "Processing..." : "Process Deletion"}
                        </button>
                        <button
                          onClick={() => handleCancel(selectedRequest.id)}
                          disabled={processing}
                          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                        >
                          Cancel Request
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Activity Log */}
                <div className="p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Activity Log</h3>
                  {detailData?.logs && detailData.logs.length > 0 ? (
                    <ul className="space-y-2">
                      {detailData.logs.map((log) => (
                        <li key={log.id} className="text-sm border-l-2 border-gray-200 pl-3">
                          <span className="font-medium">{log.action}</span> on{" "}
                          {log.table_name}
                          <span className="text-gray-500 ml-2">
                            {formatDate(log.created_at)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No activity yet</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
