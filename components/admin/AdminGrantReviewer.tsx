"use client";

import { useRef, useState } from "react";
import {
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Mail,
  Plus,
  Trash2,
  User,
  X,
} from "lucide-react";
import AiBadge from "./AiBadge";
import ConfirmModal from "./ConfirmModal";
import { uploadWithSignedUrl } from "@/lib/admin-upload";
import { formatESTDisplay } from "@/lib/dates";

// Must match GRANT_DOCS_ALLOWED_TYPES in lib/admin-documents.ts
const GRANT_DOC_ACCEPT = ".pdf,.jpg,.jpeg,.png,.gif,.doc,.docx";
const GRANT_DOC_MAX_BYTES = 10 * 1024 * 1024;

const decodeHtml = (html: string): string => {
  if (typeof document === "undefined") return html || "";
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
};

const STATUS_OPTIONS = [
  {
    value: "submitted",
    label: "Submitted",
    color: "bg-blue-100 text-blue-700",
  },
  {
    value: "approved",
    label: "Approved",
    color: "bg-green-100 text-green-700",
  },
  {
    value: "not_approved",
    label: "Not Approved",
    color: "bg-red-100 text-red-700",
  },
  {
    value: "payment_pending",
    label: "Payment Pending",
    color: "bg-orange-100 text-orange-700",
  },
  {
    value: "payment_sent",
    label: "Payment Sent",
    color: "bg-purple-100 text-purple-700",
  },
];

export default function AdminGrantReviewer({
  grants,
  cycle,
  isAdmin = false,
}: {
  grants: any[];
  cycle: any;
  /** Admins can attach/remove supporting documents; reviewers are read-only. */
  isAdmin?: boolean;
}) {
  const [selected, setSelected] = useState<any>(null);
  const [filter, setFilter] = useState("all");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pendingStatus, setPendingStatus] = useState("");
  const [amountApproved, setAmountApproved] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [localGrants, setLocalGrants] = useState(grants);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Document attach/remove (admin only)
  const docInputRef = useRef<HTMLInputElement>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docError, setDocError] = useState("");
  const [viewingDocId, setViewingDocId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<any>(null);
  const [deletingDoc, setDeletingDoc] = useState(false);

  /** Replace the documents array on both `selected` and the matching `localGrants` entry. */
  const setGrantDocuments = (grantId: string, updater: (docs: any[]) => any[]) => {
    setSelected((prev: any) =>
      prev && prev.id === grantId ? { ...prev, documents: updater(prev.documents || []) } : prev,
    );
    setLocalGrants((prev) =>
      prev.map((g) => (g.id === grantId ? { ...g, documents: updater(g.documents || []) } : g)),
    );
  };

  const handleAttachDocument = async (file: File) => {
    if (!selected) return;
    setDocError("");
    if (file.size > GRANT_DOC_MAX_BYTES) {
      setDocError(`"${file.name}" is larger than 10 MB.`);
      return;
    }
    setUploadingDoc(true);
    const grantId = selected.id;
    try {
      const row = await uploadWithSignedUrl<any>({
        prepareUrl: "/api/admin/grants/documents/prepare",
        finalizeUrl: "/api/admin/grants/documents/finalize",
        bucket: "grant-documents",
        file,
        extra: { grantId },
      });
      setGrantDocuments(grantId, (docs) => [...docs, row]);
    } catch (err: any) {
      setDocError(err.message || "Upload failed");
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = "";
    }
  };

  const handleDeleteDocument = async () => {
    if (!docToDelete || !selected) return;
    setDeletingDoc(true);
    setDocError("");
    const grantId = selected.id;
    try {
      const res = await fetch(`/api/admin/grants/documents/${docToDelete.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to remove document");
      setGrantDocuments(grantId, (docs) => docs.filter((d) => d.id !== docToDelete.id));
    } catch (err: any) {
      setDocError(err.message || "Failed to remove document");
    } finally {
      setDeletingDoc(false);
      setDocToDelete(null);
    }
  };

  const handleViewDocument = async (doc: any) => {
    if (!selected) return;
    setViewingDocId(doc.id);
    setDocError("");
    try {
      const res = await fetch("/api/grants/document-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: doc.document_url, grantId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Could not open document");
      window.open(data.url, "_blank");
    } catch (err: any) {
      setDocError(err.message || "Could not open document");
    } finally {
      setViewingDocId(null);
    }
  };

  const handleSendBankInfoEmail = async () => {
    if (!selected) return;
    setSendingEmail(true);
    try {
      const res = await fetch("/api/admin/grants/send-bank-info-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grantId: selected.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send email");
      alert("Bank info request email sent successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to send email");
    } finally {
      setSendingEmail(false);
    }
  };

  const filtered =
    filter === "all"
      ? localGrants
      : localGrants.filter((g) => g.status === filter);

  const openGrant = (grant: any) => {
    setSelected(grant);
    setPendingStatus(grant.status);
    setAmountApproved(
      grant.amount_approved?.toString() ||
        cycle.amount_per_grant?.toString() ||
        "",
    );
    setAdminNotes(grant.admin_notes || "");
    setError("");
    setDocError("");
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/admin/grants/update-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          grantId: selected.id,
          status: pendingStatus,
          amount_approved: amountApproved
            ? parseFloat(amountApproved)
            : undefined,
          admin_notes: adminNotes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");

      setLocalGrants((prev) =>
        prev.map((g) =>
          g.id === selected.id
            ? {
                ...g,
                status: pendingStatus,
                amount_approved: amountApproved,
                admin_notes: adminNotes,
              }
            : g,
        ),
      );
      setSelected(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const getStatusStyle = (status: string) => {
    return (
      STATUS_OPTIONS.find((s) => s.value === status)?.color ||
      "bg-gray-100 text-gray-600"
    );
  };

  const getStatusLabel = (status: string) => {
    return STATUS_OPTIONS.find((s) => s.value === status)?.label || status;
  };

  return (
    <div className="flex gap-6">
      {/* Left — Application List */}
      <div className="flex-1 min-w-0">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-4">
          {["all", ...STATUS_OPTIONS.map((s) => s.value)].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold capitalize transition-colors ${
                filter === f
                  ? "bg-nfw-blackberry text-white"
                  : "bg-white text-nfw-blackberry border border-nfw-blackberry/10 hover:bg-nfw-blackberry/5"
              }`}
            >
              {f === "all"
                ? `All (${localGrants.length})`
                : `${getStatusLabel(f)} (${localGrants.filter((g) => g.status === f).length})`}
            </button>
          ))}
        </div>

        {/* Applications */}
        <div className="space-y-3">
          {filtered.length === 0 ? (
            <div className="bg-white border border-nfw-blackberry/10 p-12 text-center">
              <p className="text-nfw-blackberry/40">No applications in this category.</p>
            </div>
          ) : (
            filtered.map((grant) => (
              <div
                key={grant.id}
                onClick={() => openGrant(grant)}
                className={`bg-white border-2 p-5 cursor-pointer transition-all ${
                  selected?.id === grant.id
                    ? "border-nfw-blackberry"
                    : "border-nfw-blackberry/5 hover:border-nfw-blackberry/10"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-nfw-lilac/30 flex items-center justify-center text-sm font-black text-nfw-blackberry flex-shrink-0">
                      {(
                        grant.profiles?.full_name ||
                        "U"
                      )
                        .charAt(0)
                        .toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-nfw-blackberry">
                        {grant.profiles?.full_name || "Unknown"}
                      </p>
                      {grant.profiles?.email ? (
                        <a
                          href={`mailto:${grant.profiles.email}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-nfw-aubergine hover:underline block truncate max-w-[200px]"
                        >
                          {grant.profiles.email}
                        </a>
                      ) : (
                        <p className="text-xs text-nfw-blackberry/40">No email</p>
                      )}
                      {grant.profiles?.city && (
                        <p className="text-xs text-nfw-blackberry/40">
                          {grant.profiles.city}, {grant.profiles.state}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end gap-2">
                    <span
                      className={`text-xs px-2.5 py-1 font-semibold ${getStatusStyle(grant.status)}`}
                    >
                      {getStatusLabel(grant.status)}
                    </span>
                    {grant.status === "payment_pending" && (
                      <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 font-bold animate-pulse">
                        Ready to Pay!
                      </span>
                    )}
                    <AiBadge
                      ai_relevance={grant.ai_relevance}
                      ai_invalidated_at={grant.ai_invalidated_at}
                      compact
                    />
                    {grant.is_nominating && (
                      <span className="text-xs px-2 py-0.5 bg-nfw-lilac/20 text-nfw-blackberry font-medium">
                        Nomination
                      </span>
                    )}
                    <p className="text-xs text-nfw-blackberry/40">
                      {grant.submitted_at
                        ? formatESTDisplay(new Date(grant.submitted_at))
                        : "No date"}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-nfw-blackberry/60 mt-3 line-clamp-2">
                  {decodeHtml(grant.who_are_you)}
                </p>
                {grant.documents?.length > 0 && (
                  <p className="text-xs text-nfw-blackberry/50 mt-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" /> {grant.documents.length}{" "}
                    document{grant.documents.length !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right — Review Panel */}
      {selected && (
        <div className="w-[420px] flex-shrink-0">
          <div className="bg-white border border-nfw-blackberry/10 sticky top-24 max-h-[calc(100vh-8rem)] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-nfw-blackberry/5">
              <h2
                className="font-black text-nfw-blackberry font-ui"
              >
                Review Application
              </h2>
              <button
                onClick={() => setSelected(null)}
                className="p-1.5 hover:bg-nfw-blackberry/5 transition-colors"
              >
                <X className="w-4 h-4 text-nfw-blackberry/50" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {/* Applicant Info */}
              <div className="bg-nfw-dove p-4">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 bg-nfw-lilac/30 flex items-center justify-center text-lg font-black text-nfw-blackberry">
                    {(selected.profiles?.full_name || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-nfw-blackberry">
                      {selected.profiles?.full_name || "Unknown"}
                    </p>
                    {selected.profiles?.email ? (
                      <a
                        href={`mailto:${selected.profiles.email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-nfw-aubergine hover:underline"
                      >
                        {selected.profiles.email}
                      </a>
                    ) : (
                      <p className="text-xs text-nfw-blackberry/40">No email</p>
                    )}
                    {selected.profiles?.city && (
                      <p className="text-xs text-nfw-blackberry/50">
                        {selected.profiles.city}, {selected.profiles.state}
                      </p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {selected.profiles?.city && (
                    <div className="bg-white p-2 border border-nfw-blackberry/5">
                      <p className="text-nfw-blackberry/40">Location</p>
                      <p className="font-semibold text-nfw-blackberry">
                        {selected.profiles.city}, {selected.profiles.state}
                      </p>
                    </div>
                  )}
                  {selected.profiles?.date_of_birth && (
                    <div className="bg-white p-2 border border-nfw-blackberry/5">
                      <p className="text-nfw-blackberry/40">Date of Birth</p>
                      <p className="font-semibold text-nfw-blackberry">
                        {new Date(selected.profiles.date_of_birth).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                  {selected.profiles?.household_income && (
                    <div className="bg-white p-2 border border-nfw-blackberry/5 col-span-2">
                      <p className="text-nfw-blackberry/40">Household Income</p>
                      <p className="font-semibold text-nfw-blackberry">
                        {selected.profiles.household_income}
                      </p>
                    </div>
                  )}
                </div>
                {selected.is_nominating && (
                  <div className="mt-2 px-3 py-1.5 bg-nfw-lilac/20">
                    <p className="text-xs font-semibold text-nfw-blackberry mb-1">
                      Nomination
                    </p>
                    <p className="text-xs text-nfw-blackberry/70">
                      <span className="font-semibold">Nominee:</span> {decodeHtml(selected.nominee_name)}
                    </p>
                    <p className="text-xs text-nfw-blackberry/70">
                      <span className="font-semibold">Email:</span> {decodeHtml(selected.nominee_email)}
                    </p>
                  </div>
                )}
              </div>

              {/* AI Evaluation Callout (advisory) */}
              {selected.ai_relevance &&
                selected.ai_relevance !== "not_evaluated" &&
                selected.ai_relevance !== "relevant" && (
                  <div className="bg-nfw-citrine/15 border-l-4 border-nfw-citrine p-3">
                    <p className="text-xs font-bold text-nfw-blackberry uppercase tracking-wider mb-1">
                      AI Assessment:{" "}
                      {selected.ai_relevance === "irrelevant"
                        ? "Likely Irrelevant"
                        : "Cannot Determine"}
                    </p>
                    {selected.ai_reasoning && (
                      <p className="text-sm text-nfw-blackberry/80 font-serif">
                        {selected.ai_reasoning}
                      </p>
                    )}
                    <p className="text-xs text-nfw-blackberry/50 mt-2">
                      Advisory only — use your own judgment.
                    </p>
                  </div>
                )}

              {/* Application Answers */}
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider mb-1">
                    {selected.is_nominating
                      ? "About the nominee"
                      : "Who are you?"}
                  </p>
                  <p className="text-sm text-nfw-blackberry leading-relaxed">
                    {decodeHtml(selected.who_are_you)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider mb-1">
                    Biggest Challenge
                  </p>
                  <p className="text-sm text-nfw-blackberry leading-relaxed">
                    {decodeHtml(selected.biggest_challenge)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider mb-1">
                    Fund Usage
                  </p>
                  <p className="text-sm text-nfw-blackberry leading-relaxed">
                    {decodeHtml(selected.fund_usage)}
                  </p>
                </div>
              </div>

              {/* Documents */}
              {(isAdmin || selected.documents?.length > 0) && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider">
                      Documents{" "}
                      {selected.documents?.length > 0 && `(${selected.documents.length})`}
                    </p>
                    {isAdmin && (
                      <>
                        <input
                          ref={docInputRef}
                          type="file"
                          accept={GRANT_DOC_ACCEPT}
                          className="hidden"
                          disabled={uploadingDoc}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleAttachDocument(f);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => docInputRef.current?.click()}
                          disabled={uploadingDoc}
                          title="Attach a supporting document on the member's behalf"
                          className="inline-flex items-center gap-1 text-xs font-ui font-bold uppercase tracking-[0.06em] text-nfw-aubergine hover:text-nfw-aubergine/70 disabled:opacity-50 transition-colors"
                        >
                          {uploadingDoc ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Plus className="w-3.5 h-3.5" />
                          )}
                          {uploadingDoc ? "Uploading…" : "Add document"}
                        </button>
                      </>
                    )}
                  </div>

                  {docError && (
                    <p className="text-xs text-red-600 mb-2">{docError}</p>
                  )}

                  {selected.documents?.length > 0 ? (
                    <div className="space-y-2">
                      {selected.documents.map((doc: any) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between gap-3 bg-nfw-dove p-3"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-nfw-blackberry truncate">
                              {doc.file_name}
                            </p>
                            <p className="text-xs text-nfw-blackberry/40 flex items-center gap-2">
                              <span>{(doc.file_size / 1024).toFixed(1)} KB</span>
                              {doc.uploaded_by && (
                                <span className="inline-block px-1.5 py-0.5 bg-nfw-aubergine/10 text-nfw-aubergine font-ui font-semibold uppercase tracking-wider text-[10px]">
                                  Added by admin
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                              onClick={() => handleViewDocument(doc)}
                              disabled={viewingDocId === doc.id}
                              className="text-xs font-semibold text-nfw-blackberry hover:text-nfw-blackberry/70 disabled:opacity-50 transition-colors"
                            >
                              {viewingDocId === doc.id ? "Opening…" : "View"}
                            </button>
                            {isAdmin && doc.uploaded_by && (
                              <button
                                onClick={() => setDocToDelete(doc)}
                                title="Remove this admin-added document"
                                className="p-1 text-nfw-blackberry/40 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-nfw-blackberry/40 italic">
                      No supporting documents.
                    </p>
                  )}
                </div>
              )}

              {/* Status Update */}
              <div>
                <p className="text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider mb-2">
                  Update Status
                </p>
                <div className="space-y-2">
                  {STATUS_OPTIONS.map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-center gap-3 p-3 border-2 cursor-pointer transition-all ${
                        pendingStatus === option.value
                          ? "border-nfw-blackberry bg-nfw-blackberry/5"
                          : "border-nfw-blackberry/5 hover:border-nfw-blackberry/10"
                      }`}
                    >
                      <input
                        type="radio"
                        name="status"
                        value={option.value}
                        checked={pendingStatus === option.value}
                        onChange={() => setPendingStatus(option.value)}
                        className="accent-nfw-blackberry"
                      />
                      <span
                        className={`text-xs px-2 py-0.5 font-semibold ${option.color}`}
                      >
                        {option.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Amount Approved (shown when approving) */}
              {(pendingStatus === "approved" ||
                pendingStatus === "payment_pending" ||
                pendingStatus === "payment_sent") && (
                <div>
                  <label className="block text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider mb-2">
                    Amount Approved
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-nfw-blackberry/50 text-sm">
                      $
                    </span>
                    <input
                      type="number"
                      value={amountApproved}
                      onChange={(e) => setAmountApproved(e.target.value)}
                      className="w-full pl-7 pr-4 py-2.5 border border-nfw-blackberry/20 text-nfw-blackberry bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Admin Notes */}
              <div>
                <label className="block text-xs font-semibold text-nfw-blackberry/40 uppercase tracking-wider mb-2">
                  Internal Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  rows={3}
                  placeholder="Add internal notes (not visible to applicant)..."
                  className="w-full px-3 py-2.5 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac text-sm resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 p-3">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}

              {/* Send Bank Info Email Button */}
              <button
                onClick={handleSendBankInfoEmail}
                disabled={sendingEmail}
                className="w-full py-3 bg-nfw-aubergine text-white font-bold hover:bg-nfw-aubergine/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {sendingEmail ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    Send Bank Info Email
                  </>
                )}
              </button>

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full py-3 bg-nfw-blackberry text-white font-bold hover:bg-nfw-blackberry/90 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
              >
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? "Saving..." : "Save Changes"}
              </button>
              {/* Delete Button */}
              <button
                onClick={() => {
                  setTimeout(async () => {
                    if (
                      !confirm(
                        `Are you sure you want to permanently delete this application from ${selected.profiles?.full_name || "this applicant"}? This cannot be undone.`,
                      )
                    )
                      return;
                    setSaving(true);
                    try {
                      const res = await fetch("/api/admin/grants/delete", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ grantId: selected.id }),
                      });
                      const data = await res.json();
                      if (!res.ok)
                        throw new Error(data.error || "Failed to delete");
                      setLocalGrants((prev) =>
                        prev.filter((g) => g.id !== selected.id),
                      );
                      setSelected(null);
                    } catch (err: any) {
                      setError(err.message);
                    } finally {
                      setSaving(false);
                    }
                  }, 0);
                }}
                disabled={saving}
                className="w-full py-3 bg-red-50 text-red-600 border border-red-200 font-bold hover:bg-red-100 disabled:opacity-50 transition-colors text-sm"
              >
                Delete Application
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={!!docToDelete}
        title="Remove document?"
        message={
          docToDelete
            ? `"${docToDelete.file_name}" will be permanently removed from this application.`
            : ""
        }
        confirmLabel={deletingDoc ? "Removing…" : "Remove"}
        variant="danger"
        onConfirm={handleDeleteDocument}
        onCancel={() => !deletingDoc && setDocToDelete(null)}
      />
    </div>
  );
}
