"use client";

import { useEffect, useState } from "react";
import { Mail, Loader2, X, Check } from "lucide-react";

interface Applicant {
  id: string;
  name: string;
  email: string;
  status?: string;
}

interface PreviewData {
  applicants: Applicant[];
  subjectPreview: string;
  adminEmail: string;
}

interface SendResult {
  success: boolean;
  sentTo?: string;
  applicantName?: string;
  subject?: string;
  error?: string;
}

interface Props {
  cycleId: string;
}

export default function SendRejectionPreviewButton({ cycleId }: Props) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [previewError, setPreviewError] = useState("");

  const [recipientEmail, setRecipientEmail] = useState("");
  const [applicantGrantId, setApplicantGrantId] = useState("");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);

  const openModal = async () => {
    setIsModalOpen(true);
    setSendResult(null);
    setPreviewError("");
    // Only fetch preview data once per modal-open. If already loaded, skip.
    if (previewData) return;

    setLoadingPreview(true);
    try {
      const res = await fetch(
        `/api/admin/grants/${cycleId}/preview-data`,
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Failed to load preview data");
      setPreviewData(data);
      setRecipientEmail(data.adminEmail || "");
      if (data.applicants.length > 0) {
        setApplicantGrantId(data.applicants[0].id);
      }
    } catch (err: any) {
      setPreviewError(err.message || "Failed to load preview data");
    } finally {
      setLoadingPreview(false);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSendResult(null);
    setPreviewError("");
  };

  const handleSend = async () => {
    if (!applicantGrantId) {
      setSendResult({ success: false, error: "Pick an applicant first" });
      return;
    }
    if (!recipientEmail || !recipientEmail.includes("@")) {
      setSendResult({ success: false, error: "Valid recipient email required" });
      return;
    }

    setSending(true);
    setSendResult(null);
    try {
      const res = await fetch(
        `/api/admin/grants/${cycleId}/send-rejection-preview`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ applicantGrantId, recipientEmail }),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setSendResult({
          success: false,
          error: data.error || "Failed to send",
          subject: data.subject,
        });
      } else {
        setSendResult({
          success: true,
          sentTo: data.sentTo,
          applicantName: data.applicantName,
          subject: data.subject,
        });
      }
    } catch (err: any) {
      setSendResult({ success: false, error: err.message });
    } finally {
      setSending(false);
    }
  };

  // Lock body scroll while modal is open.
  useEffect(() => {
    if (isModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isModalOpen]);

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="px-5 py-2.5 bg-nfw-wisteria text-white font-bold text-sm tracking-wide hover:bg-nfw-wisteria/90 transition-colors flex items-center gap-2"
      >
        <Mail className="w-4 h-4" />
        Send Grant: Not Approved Test Email
      </button>

      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
        >
          <div
            className="absolute inset-0 bg-nfw-blackberry/40"
            onClick={closeModal}
          />
          <div className="relative bg-white border border-nfw-blackberry/10 max-w-lg w-full p-6 shadow-2xl">
            <button
              type="button"
              onClick={closeModal}
              className="absolute top-3 right-3 text-nfw-blackberry/40 hover:text-nfw-blackberry"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-bold text-nfw-blackberry font-serif mb-1 pr-8">
              Send Test Rejection Email
            </h3>
            <p className="text-xs text-nfw-blackberry/50 mb-4 font-serif">
              Sends the Grant: Not Approved template with this cycle's actual
              rejection_message values. No DB mutations, no email to the real
              applicant.
            </p>

            {loadingPreview && (
              <div className="flex items-center gap-2 text-sm text-nfw-blackberry/60 font-serif py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
                Loading preview data...
              </div>
            )}

            {previewError && (
              <div className="bg-red-50 border border-red-200 p-3 mb-4">
                <p className="text-red-700 text-sm">{previewError}</p>
              </div>
            )}

            {previewData && !loadingPreview && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-nfw-blackberry mb-1.5">
                    Recipient Email
                  </label>
                  <input
                    type="email"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                    placeholder="admin@example.com"
                    className="w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all"
                  />
                  <p className="text-xs text-nfw-blackberry/50 mt-1">
                    Defaults to your email. Type a different address to send
                    there instead.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-nfw-blackberry mb-1.5">
                    Applicant
                  </label>
                  {previewData.applicants.length === 0 ? (
                    <div className="bg-nfw-dove border border-nfw-blackberry/10 p-3 text-sm text-nfw-blackberry/60 font-serif">
                      No submitted applicants on this cycle. Submit a test
                      application first, or change a rejected applicant's
                      status back to submitted.
                    </div>
                  ) : (
                    <select
                      value={applicantGrantId}
                      onChange={(e) => setApplicantGrantId(e.target.value)}
                      className="w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all"
                    >
                      {previewData.applicants.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                          {a.email ? ` (${a.email})` : ""}
                          {a.status ? ` — ${a.status}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-xs text-nfw-blackberry/50 mt-1">
                    Pick any applicant on this cycle — their name fills {"{{name}}"}. The email goes only to the address above; nothing is sent to them.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-nfw-blackberry mb-1.5">
                    Subject Preview
                  </label>
                  <div className="w-full px-4 py-3 bg-nfw-dove border border-nfw-blackberry/10 text-nfw-blackberry/80 font-serif text-sm">
                    {previewData.subjectPreview || "(no subject)"}
                  </div>
                </div>

                {sendResult && (
                  <div
                    className={`p-3 border ${
                      sendResult.success
                        ? "bg-[#d4f1ad]/20 border-[#d4f1ad]"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    {sendResult.success ? (
                      <div className="text-sm text-nfw-blackberry font-serif flex items-start gap-2">
                        <Check className="w-4 h-4 text-nfw-aubergine mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-semibold">
                            Email sent to {sendResult.sentTo}
                          </p>
                          <p className="text-xs mt-1">
                            Applicant: {sendResult.applicantName}
                          </p>
                          <p className="text-xs mt-1">
                            Subject: {sendResult.subject}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-red-700 text-sm">
                        {sendResult.error}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={
                      sending ||
                      previewData.applicants.length === 0 ||
                      !recipientEmail.includes("@") ||
                      !applicantGrantId
                    }
                    className="flex-1 py-3 bg-nfw-wisteria text-white font-bold text-sm tracking-wide hover:bg-nfw-wisteria/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                  >
                    {sending && <Loader2 className="w-4 h-4 animate-spin" />}
                    {sending ? "Sending..." : "Send"}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="px-6 py-3 border border-nfw-blackberry/20 text-nfw-blackberry font-medium hover:bg-nfw-blackberry/5 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
