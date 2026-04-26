"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, User, Users } from "lucide-react";
import ReauthModal from "@/components/auth/ReauthModal";

interface GrantCycle {
  id: string;
  cycle_name: string;
  description: string;
  end_date: string;
  amount_per_grant: number;
  grants_available: number;
}

export default function GrantApplicationForm({
  userId,
  cycles,
}: {
  userId: string;
  cycles: GrantCycle[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [isNominating, setIsNominating] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [nomineeName, setNomineeName] = useState("");
  const [nomineeEmail, setNomineeEmail] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const pendingFormData = useRef<{
    formData: typeof formData;
    isNominating: boolean;
    nomineeName: string;
    nomineeEmail: string;
    consentChecked: boolean;
    documents: File[];
  } | null>(null);

  const [formData, setFormData] = useState({
    cycle_id: cycles.length === 1 ? cycles[0].id : "",
    who_are_you: "",
    biggest_challenge: "",
    fund_usage: "",
  });

  const inputClass =
    "w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all text-sm";
  const labelClass = "block text-sm font-serif text-nfw-blackberry mb-1.5";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      if (
        !formData.cycle_id ||
        !formData.who_are_you ||
        !formData.biggest_challenge ||
        !formData.fund_usage
      ) {
        throw new Error("Please fill in all required fields");
      }

      if (isNominating) {
        if (!nomineeName.trim()) {
          throw new Error("Please enter the nominee's name");
        }
        if (!nomineeEmail.trim()) {
          throw new Error("Please enter the nominee's email");
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(nomineeEmail.trim())) {
          throw new Error("Please enter a valid email address for the nominee");
        }
        if (!consentChecked) {
          throw new Error("Please confirm the nominee has consented to being nominated");
        }
      }

      setShowConfirmDialog(true);
    } catch (err: any) {
      setError(err.message || "Validation failed");
    }
  };

  const handleConfirmSubmit = () => {
    pendingFormData.current = {
      formData,
      isNominating,
      nomineeName,
      nomineeEmail,
      consentChecked,
      documents,
    };
    setShowConfirmDialog(false);
    setShowReauthModal(true);
  };

  const handleReauthSuccess = async () => {
    if (!pendingFormData.current) return;

    const { formData: finalFormData, isNominating: finalIsNominating, nomineeName: finalNomineeName, nomineeEmail: finalNomineeEmail, documents: finalDocuments } = pendingFormData.current;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/grants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...finalFormData,
          is_nominating: finalIsNominating,
          nominee_name: finalIsNominating ? finalNomineeName.trim() : null,
          nominee_email: finalIsNominating ? finalNomineeEmail.trim() : null,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const grantId = data.grantId;

      if (finalDocuments.length > 0) {
        setUploadingDocs(true);
        for (const file of finalDocuments) {
          const fd = new FormData();
          fd.append("file", file);
          fd.append("grantId", grantId);
          const uploadRes = await fetch("/api/grants/upload-document", {
            method: "POST",
            body: fd,
          });
          const uploadData = await uploadRes.json();
          if (!uploadRes.ok) {
            console.error("Upload failed:", uploadData.error);
            throw new Error(
              `Failed to upload ${file.name}: ${uploadData.error}`,
            );
          }
        }
      }

      pendingFormData.current = null;
      router.push(`/grants/application-success?id=${grantId}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit application");
      setLoading(false);
      setUploadingDocs(false);
      pendingFormData.current = null;
    }
  };

  const handleReauthClose = () => {
    setShowReauthModal(false);
    pendingFormData.current = null;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);
      setDocuments((prev) => [...prev, ...newFiles]);
      // Reset input by changing key so same file can be selected again
      setFileInputKey((prev) => prev + 1);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedCycle = cycles.find((c) => c.id === formData.cycle_id);

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Grant Cycle Selection — multiple cycles */}
      {cycles.length > 1 && (
        <div>
          <p className={labelClass}>
            Which grant are you applying for?{" "}
            <span className="text-nfw-lilac">*</span>
          </p>
          <div className="space-y-2">
            {cycles.map((cycle) => (
              <div
                key={cycle.id}
                onClick={() =>
                  setFormData((prev) => ({ ...prev, cycle_id: cycle.id }))
                }
                className={`flex items-start justify-between gap-4 p-4 border-2 cursor-pointer transition-all ${
                  formData.cycle_id === cycle.id
                    ? "border-nfw-blackberry bg-nfw-blackberry/5"
                    : "border-nfw-blackberry/10 hover:border-nfw-blackberry/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-4 h-4 border-2 mt-1 flex-shrink-0 flex items-center justify-center ${
                      formData.cycle_id === cycle.id
                        ? "border-nfw-blackberry"
                        : "border-nfw-blackberry/30"
                    }`}
                  >
                    {formData.cycle_id === cycle.id && (
                      <div className="w-2 h-2 bg-nfw-blackberry" />
                    )}
                  </div>
                  <div>
                    <p className="font-serif text-lg text-nfw-blackberry">
                      {cycle.cycle_name}
                    </p>
                    <p className="text-xs font-ui text-nfw-blackberry/50 mt-0.5">
                      Deadline: 
                      {new Date(cycle.end_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    {cycle.description && (
                      <p className="text-xs font-serif text-nfw-blackberry/60 mt-1">
                        {cycle.description}
                      </p>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-nfw-blackberry font-ui">
                    ${cycle.amount_per_grant?.toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Single cycle info card */}
      {cycles.length === 1 && selectedCycle && (
        <div className="bg-[#d4f1ad]/20 border border-[#d4f1ad] p-5">
          <div className="flex items-start justify-between">
            <div>
              <h3
                className="font-serif text-xl text-nfw-blackberry"
              >
                {selectedCycle.cycle_name}
              </h3>
              <p className="text-sm font-ui text-nfw-blackberry/60 mt-1">
                Deadline:{" "}
                {new Date(selectedCycle.end_date).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
            <div className="text-right">
              <p
                className="text-2xl font-black text-nfw-blackberry font-ui"
              >
                ${selectedCycle.amount_per_grant?.toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Nominating Toggle */}
      <div>
        <p className={labelClass}>
          Who is this application for? <span className="text-nfw-lilac">*</span>
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setIsNominating(false)}
            className={`flex items-center gap-3 p-4 border-2 transition-all ${
              !isNominating
                ? "border-nfw-blackberry bg-nfw-blackberry/5"
                : "border-nfw-blackberry/10 hover:border-nfw-blackberry/30"
            }`}
          >
            <div
              className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${!isNominating ? "bg-nfw-blackberry" : "bg-nfw-blackberry/10"}`}
            >
              <User
                className={`w-4 h-4 ${!isNominating ? "text-white" : "text-nfw-blackberry"}`}
              />
            </div>
            <div className="text-left">
              <p className="font-ui text-nfw-blackberry text-sm">Myself</p>
              <p className="text-xs font-serif text-nfw-blackberry/50">I'm applying for me</p>
            </div>
          </button>
          <button
            type="button"
            onClick={() => setIsNominating(true)}
            className={`flex items-center gap-3 p-4 border-2 transition-all ${
              isNominating
                ? "border-nfw-blackberry bg-nfw-blackberry/5"
                : "border-nfw-blackberry/10 hover:border-nfw-blackberry/30"
            }`}
          >
            <div
              className={`w-8 h-8 flex items-center justify-center flex-shrink-0 ${isNominating ? "bg-nfw-blackberry" : "bg-nfw-blackberry/10"}`}
            >
              <Users
                className={`w-4 h-4 ${isNominating ? "text-white" : "text-nfw-blackberry"}`}
              />
            </div>
            <div className="text-left">
              <p className="font-ui text-nfw-blackberry text-sm">Someone else</p>
              <p className="text-xs font-serif text-nfw-blackberry/50">
                I'm nominating someone
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Nominee Information - shown when nominating */}
      {isNominating && (
        <div className="bg-nfw-dove/50 border border-nfw-blackberry/10 p-6 space-y-4">
          <h4 className="font-serif text-lg text-nfw-blackberry">Nominee Information</h4>
          
          <div>
            <label className={labelClass}>
              Nominee's Name <span className="text-nfw-lilac">*</span>
            </label>
            <input
              type="text"
              value={nomineeName}
              onChange={(e) => setNomineeName(e.target.value)}
              placeholder="Maria Garcia"
              className={inputClass}
              required={isNominating}
            />
          </div>

          <div>
            <label className={labelClass}>
              Nominee's Email <span className="text-nfw-lilac">*</span>
            </label>
            <input
              type="email"
              value={nomineeEmail}
              onChange={(e) => setNomineeEmail(e.target.value)}
              placeholder="maria@example.com"
              className={inputClass}
              required={isNominating}
            />
            <p className="text-xs font-ui text-nfw-blackberry/50 mt-1">
              They will receive an email to create an account and add their bank info if approved.
            </p>
          </div>

          <div className="flex items-start gap-3 pt-2">
            <input
              type="checkbox"
              id="consent"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 w-4 h-4 accent-nfw-blackberry"
            />
            <label htmlFor="consent" className="text-sm font-serif text-nfw-blackberry/70">
              I confirm the nominated person has consented to being nominated and understands their information will be shared with National Fund for Women to facilitate this grant.
            </label>
          </div>
        </div>
      )}

      {/* Question 1 */}
      <div>
        <label className={labelClass}>
          {isNominating
            ? "Tell us about the person you're nominating."
            : "Who are you?"}{" "}
          <span className="text-nfw-lilac">*</span>
        </label>
        <p className="text-xs font-serif text-nfw-blackberry/50 mb-2">
          {isNominating
            ? "Share their name, background, and why you're nominating them."
            : "Tell us a little about yourself — your situation, your life, what matters to you."}
        </p>
        <textarea
          value={formData.who_are_you}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, who_are_you: e.target.value }))
          }
          rows={4}
          maxLength={500}
          placeholder={
            isNominating
              ? "Her name is Maria. She's a single mom of three..."
              : "I'm a single mom living in Atlanta..."
          }
          className={inputClass + " resize-none"}
          required
        />
        <p className="text-xs font-ui text-nfw-blackberry/40 mt-1 text-right">
          {formData.who_are_you.length}/500
        </p>
      </div>

      {/* Question 2 */}
      <div>
        <label className={labelClass}>
          {isNominating
            ? "What is their biggest challenge right now?"
            : "What's the biggest challenge you're facing right now?"}{" "}
          <span className="text-nfw-lilac">*</span>
        </label>
        <p className="text-xs font-serif text-nfw-blackberry/50 mb-2">
          Be specific. The more we understand the situation, the better we can
          help.
        </p>
        <textarea
          value={formData.biggest_challenge}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              biggest_challenge: e.target.value,
            }))
          }
          rows={5}
          maxLength={1000}
          placeholder={
            isNominating
              ? "She lost her job last month and her car needs repairs to get to interviews..."
              : "My car broke down last month and I can't get to work without it..."
          }
          className={inputClass + " resize-none"}
          required
        />
        <p className="text-xs font-ui text-nfw-blackberry/40 mt-1 text-right">
          {formData.biggest_challenge.length}/1000
        </p>
      </div>

      {/* Question 3 */}
      <div>
        <label className={labelClass}>
          {isNominating
            ? "How do you imagine they would use the microgrant funds?"
            : "What would you do with the microgrant funds?"}{" "}
          <span className="text-nfw-lilac">*</span>
        </label>
        <p className="text-xs font-serif text-nfw-blackberry/50 mb-2">
          {isNominating
            ? "Describe how you think the funds would make a difference for them."
            : "Tell us exactly how you'd use the money and what difference it would make."}
        </p>
        <textarea
          value={formData.fund_usage}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, fund_usage: e.target.value }))
          }
          rows={4}
          maxLength={500}
          placeholder={
            isNominating
              ? "The funds would cover her car repair so she can get back to work..."
              : "I would use the funds to repair my car so I can get back to work..."
          }
          className={inputClass + " resize-none"}
          required
        />
        <p className="text-xs font-ui text-nfw-blackberry/40 mt-1 text-right">
          {formData.fund_usage.length}/500
        </p>
      </div>

      {/* Document Upload */}
      <div>
        <label className={labelClass}>
          Supporting Documents{" "}
          <span className="text-nfw-blackberry/40 font-normal">(Optional)</span>
        </label>
        <p className="text-xs font-ui text-nfw-blackberry/50 mb-3">
          Upload receipts, quotes, or other supporting documents. PDF, JPG, PNG,
          DOC accepted.
        </p>
        <input
          key={fileInputKey}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          onChange={handleFileChange}
          className="w-full text-sm text-nfw-blackberry/60 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-ui file:bg-nfw-blackberry file:text-white hover:file:bg-nfw-blackberry/90 file:cursor-pointer cursor-pointer border border-nfw-blackberry/20 p-2"
        />
        {documents.length > 0 && (
          <div className="mt-3 space-y-2">
            {documents.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between bg-nfw-dove px-3 py-2 border border-nfw-blackberry/10"
              >
                <span className="text-sm font-ui text-nfw-blackberry/70 truncate flex-1">
                  {file.name} ({(file.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  type="button"
                  onClick={() => removeDocument(index)}
                  className="ml-2 text-red-500 hover:text-red-700 text-sm font-ui"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50/50 border border-red-200 p-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Submit */}
      <div className="flex gap-4 pt-2">
        <button
          type="submit"
          disabled={loading || uploadingDocs || !formData.cycle_id}
          className="flex-1 bg-nfw-blackberry text-white px-6 py-4 hover:bg-nfw-blackberry/90 disabled:opacity-50 disabled:cursor-not-allowed font-ui transition-colors flex items-center justify-center gap-2"
        >
          {(loading || uploadingDocs) && (
            <Loader2 className="w-4 h-4 animate-spin" />
          )}
          {uploadingDocs
            ? "Uploading Documents..."
            : loading
              ? "Submitting..."
              : "Submit Application →"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/grants/my-applications")}
          className="px-6 py-4 border border-nfw-blackberry/20 text-nfw-blackberry hover:bg-nfw-blackberry/5 font-ui transition-colors"
        >
          Cancel
        </button>
      </div>

      <p className="text-xs font-serif text-nfw-blackberry/40 text-center">
        Your application will be reviewed by our team. You cannot edit it after
        submission.
      </p>
    </form>

    {/* Confirmation Dialog */}
    {showConfirmDialog && (
      <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/30" onClick={() => setShowConfirmDialog(false)} />
        <div className="relative bg-white w-full max-w-md rounded-xl shadow-2xl p-6">
          <h3 className="font-serif text-xl text-nfw-blackberry mb-2">Ready to Submit?</h3>
          <p className="font-serif text-nfw-blackberry/70 mb-4">
            You are about to submit your grant application. This action cannot be undone.
          </p>
          {selectedCycle && (
            <div className="bg-nfw-dove/50 border border-nfw-blackberry/10 p-4 mb-4">
              <p className="font-ui text-sm text-nfw-blackberry/60">
                Applying for: <span className="font-semibold">{selectedCycle.cycle_name}</span>
              </p>
              <p className="font-ui text-sm text-nfw-blackberry/60">
                Amount: <span className="font-semibold">${selectedCycle.amount_per_grant?.toLocaleString()}</span>
              </p>
            </div>
          )}
          <div className="flex gap-3 justify-end">
            <button
              onClick={() => setShowConfirmDialog(false)}
              className="px-4 py-2 border border-gray-300 text-nfw-blackberry text-sm font-medium rounded hover:bg-gray-50"
            >
              Go Back
            </button>
            <button
              onClick={handleConfirmSubmit}
              className="px-4 py-2 bg-nfw-blackberry text-white text-sm font-medium rounded hover:bg-nfw-blackberry/90"
            >
              Confirm & Submit
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Reauthentication Modal */}
    <ReauthModal
      isOpen={showReauthModal}
      onClose={handleReauthClose}
      onSuccess={handleReauthSuccess}
      title="Verify Your Identity"
      message="Enter the 8-digit code sent to your email to confirm your application."
    />
    </>
  );
}
