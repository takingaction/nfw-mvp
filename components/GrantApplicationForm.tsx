"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const decodeHtml = (html: string): string => {
  if (typeof document === "undefined") return html || "";
  const div = document.createElement("div");
  div.innerHTML = html || "";
  return div.textContent || "";
};

interface GrantCycle {
  id: string;
  cycle_name: string;
  description: string;
  end_date: string;
  amount_per_grant: number;
  grants_available: number;
}

export default function GrantApplicationForm({
  cycles,
}: {
  userId: string;
  cycles: GrantCycle[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [uploadingDocs, setUploadingDocs] = useState(false);
  const [documents, setDocuments] = useState<File[]>([]);
  const [fileInputKey, setFileInputKey] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitConsentChecked, setSubmitConsentChecked] = useState(false);
  const [showFileError, setShowFileError] = useState(false);
  const [fileErrorMessage, setFileErrorMessage] = useState("");
  const [certificationChecked, setCertificationChecked] = useState(false);

  const [formData, setFormData] = useState({
    cycle_id: cycles.length === 1 ? cycles[0].id : "",
    who_are_you: "",
    biggest_challenge: "",
    fund_usage: "",
  });

  const inputClass =
    "w-full px-4 py-3 border border-nfw-blackberry/20 text-nfw-blackberry placeholder-nfw-blackberry/30 bg-white focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent transition-all text-sm";
  const labelClass = "block text-sm font-serif text-nfw-blackberry mb-1.5";

  const handleOpenConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (
      !formData.cycle_id ||
      !formData.who_are_you ||
      !formData.biggest_challenge ||
      !formData.fund_usage
    ) {
      setError("Please fill in all required fields");
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    if (!submitConsentChecked) return;
    if (error) return;
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/grants/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          is_nominating: false,
          nominee_name: null,
          nominee_email: null,
          certification_consent: certificationChecked,
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const grantId = data.grantId;

      if (documents.length > 0) {
        setUploadingDocs(true);
        for (const file of documents) {
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

      router.push(`/grants/application-success?id=${grantId}`);
    } catch (err: any) {
      setError(err.message || "Failed to submit application");
      setLoading(false);
      setUploadingDocs(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newFiles = Array.from(files);

      // Validate files before adding
      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/gif",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      const maxSize = 10 * 1024 * 1024; // 10MB

      for (const file of newFiles) {
        if (!allowedTypes.includes(file.type)) {
          setFileErrorMessage(`"${file.name}" is not a supported file type. Please upload a PDF, image (JPEG, PNG, GIF), or Word document.`);
          setShowFileError(true);
          setFileInputKey((prev) => prev + 1);
          return;
        }
        if (file.size > maxSize) {
          const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
          setFileErrorMessage(`"${file.name}" is too large (${sizeMB}MB). Maximum file size is 10MB.`);
          setShowFileError(true);
          setFileInputKey((prev) => prev + 1);
          return;
        }
      }

      setDocuments((prev) => [...prev, ...newFiles]);
      setFileInputKey((prev) => prev + 1);
    }
  };

  const removeDocument = (index: number) => {
    setDocuments((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedCycle = cycles.find((c) => c.id === formData.cycle_id);

  return (
    <>
      <form onSubmit={handleOpenConfirm} className="space-y-8">
        <>
          <div className="bg-nfw-wisteria/20 border border-nfw-wisteria/30 p-5 mb-6">
            <p className="font-serif text-base font-bold text-nfw-blackberry mb-2">
              Quick reminder before you apply:
            </p>
            <ul className="font-ui text-sm text-nfw-blackberry/70 space-y-1 list-disc list-inside">
              <li>Applicants must be 18 or older and a U.S. citizen or permanent resident.</li>
              <li>Applicants may apply for up to 3 grants, but can only be awarded 1 grant per cycle.</li>
              <li>Applications cannot be edited after submission.</li>
              <li>Some grants require additional documentation, please read the grant descriptions carefully.</li>
              <li>There are no nominations this grant cycle. Keep an eye out for future nomination-only grants!</li>
            </ul>
          </div>
          <div className="bg-nfw-aubergine border border-nfw-aubergine p-5 mb-6">
            <p className="font-serif text-sm text-white">
              To keep microgrants fair and accessible to as many members as possible, members are not eligible to receive a grant two months in a row. For example, if you received a grant in August, you'll be eligible to receive another grant beginning in October. In the meantime, we encourage you to explore our other programs!
            </p>
          </div>
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
                      <p className="font-serif text-xl text-nfw-blackberry [&_sup]:text-[0.6em] [&_sup]:align-super"
                         dangerouslySetInnerHTML={{ __html: decodeHtml(cycle.cycle_name) }}
                        />
                      <p className="text-sm font-ui text-nfw-blackberry/50 mt-0.5">
                        Deadline:{" "}
                        {cycle.end_date ? (() => {
                          const datePart = cycle.end_date.split('T')[0];
                          const [y, m, d] = datePart.split('-');
                          const parsed = new Date(+y, +m - 1, +d);
                          return parsed.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                        })() : 'TBD'}
                      </p>
                      {cycle.description && (
                        <p className="text-sm font-serif text-nfw-blackberry/60 mt-1">
                          {decodeHtml(cycle.description)}
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
        </>

        {cycles.length === 1 && selectedCycle && (
          <div className="bg-nfw-wisteria/20 border border-nfw-wisteria/30 p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-serif text-xl text-nfw-blackberry [&_sup]:text-[0.6em] [&_sup]:align-super"
                   dangerouslySetInnerHTML={{ __html: decodeHtml(selectedCycle.cycle_name) }}
                 />
                 <p className="text-sm font-ui text-nfw-blackberry/60 mt-1">
                  Deadline:{" "}{" "}
                  {selectedCycle.end_date ? (() => {
                    const datePart = selectedCycle.end_date.split('T')[0];
                    const [y, m, d] = datePart.split('-');
                    return new Date(+y, +m - 1, +d).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
                  })() : 'TBD'}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-nfw-blackberry font-ui">
                  ${selectedCycle.amount_per_grant?.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}

        <div>
          <label className={labelClass}>
            Who are you? <span className="text-nfw-lilac">*</span>
          </label>
          <p className="text-sm font-serif text-nfw-blackberry/50 mb-2">
            Tell us a little about yourself — your situation, your life, what matters to you.
          </p>
          <textarea
            value={formData.who_are_you}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, who_are_you: e.target.value }))
            }
            rows={4}
            maxLength={500}
            placeholder="I'm a single mom living in Atlanta..."
            className={inputClass + " resize-none"}
            required
          />
          <p className="text-xs font-ui text-nfw-blackberry/40 mt-1 text-right">
            {formData.who_are_you.length}/500
          </p>
        </div>

        <div>
          <label className={labelClass}>
            What's the biggest challenge you're facing right now? <span className="text-nfw-lilac">*</span>
          </label>
          <p className="text-sm font-serif text-nfw-blackberry/50 mb-2">
            Be specific. The more we understand the situation, the better we
            can help.
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
            placeholder="My car broke down last month and I can't get to work without it..."
            className={inputClass + " resize-none"}
            required
          />
          <p className="text-xs font-ui text-nfw-blackberry/40 mt-1 text-right">
            {formData.biggest_challenge.length}/1000
          </p>
        </div>

        <div>
          <label className={labelClass}>
            What would you do with the microgrant funds? <span className="text-nfw-lilac">*</span>
          </label>
          <p className="text-sm font-serif text-nfw-blackberry/50 mb-2">
            Tell us exactly how you'd use the money and what difference it would make.
          </p>
          <textarea
            value={formData.fund_usage}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, fund_usage: e.target.value }))
            }
            rows={4}
            maxLength={500}
            placeholder="I would use the funds to repair my car so I can get back to work..."
            className={inputClass + " resize-none"}
            required
          />
          <p className="text-xs font-ui text-nfw-blackberry/40 mt-1 text-right">
            {formData.fund_usage.length}/500
          </p>
        </div>

        <div>
          <label className={labelClass}>
            Supporting Documents{" "}
            <span className="text-nfw-blackberry/40 font-normal">
              (Optional)
            </span>
          </label>
          <p className="text-sm font-serif text-nfw-blackberry/50 mb-3">
            Upload receipts, quotes, or other supporting documents. PDF, JPG,
            PNG, DOC accepted.
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
                : "Continue →"}
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

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-nfw-blackberry/40"
            onClick={() => !loading && setShowConfirm(false)}
          />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-serif text-nfw-blackberry mb-4">
              Ready to Submit
            </h3>
            <div className="mb-6">
              <p className="text-sm font-serif text-nfw-blackberry/80 mb-4">
                Before submitting, please read and consent to the following:
              </p>
              <div className="flex items-start gap-3 mb-2">
                <input
                  type="checkbox"
                  id="submit-certification"
                  checked={certificationChecked}
                  onChange={(e) => setCertificationChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-nfw-blackberry flex-shrink-0"
                />
                <label
                  htmlFor="submit-certification"
                  className="text-sm font-serif text-nfw-blackberry/70 leading-relaxed"
                >
                  I certify that the information provided is accurate and understand NFW may request supporting documentation.
                </label>
              </div>
              <div className="flex items-start gap-3 mb-2">
                <input
                  type="checkbox"
                  id="submit-consent"
                  checked={submitConsentChecked}
                  onChange={(e) => setSubmitConsentChecked(e.target.checked)}
                  className="mt-1 w-4 h-4 accent-nfw-blackberry flex-shrink-0"
                />
                <label
                  htmlFor="submit-consent"
                  className="text-sm font-serif text-nfw-blackberry/70 leading-relaxed"
                >
                  I have read and consent to National Fund for Women Foundation
                  collecting, storing, and using my personal information for the
                  purpose of reviewing and evaluating my grant application.
                </label>
              </div>
              <details className="mt-3 pl-7 text-xs font-serif text-nfw-blackberry/50">
                <summary className="cursor-pointer text-nfw-lilac hover:text-nfw-lilac/80 underline">
                  View full consent text
                </summary>
                <div className="mt-2 p-3 bg-nfw-dove/50 rounded-lg">
                  <p className="leading-relaxed">
                    By submitting this application, I consent to National Fund
                    for Women Foundation collecting, storing, and using the
                    personal information I have provided, including any details I
                    have voluntarily shared about my circumstances, for the purpose
                    of reviewing and evaluating my grant application. My
                    information will be accessed by National Fund for Women
                    Foundation staff involved in the grant review process and will
                    not be sold or shared with third parties. I may request
                    deletion of my information by contacting National Fund for
                    Women Foundation directly.
                  </p>
                </div>
              </details>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={!submitConsentChecked || !certificationChecked || loading || uploadingDocs}
                className="flex-1 bg-nfw-blackberry text-white px-6 py-3 hover:bg-nfw-blackberry/90 disabled:opacity-50 disabled:cursor-not-allowed font-ui transition-colors flex items-center justify-center gap-2"
              >
                {(loading || uploadingDocs) && (
                  <Loader2 className="w-4 h-4 animate-spin" />
                )}
                {uploadingDocs
                  ? "Uploading..."
                  : loading
                    ? "Submitting..."
                    : "Confirm & Submit"}
              </button>
              <button
                type="button"
                onClick={() => !loading && setShowConfirm(false)}
                disabled={loading || uploadingDocs}
                className="px-6 py-3 border border-nfw-blackberry/20 text-nfw-blackberry hover:bg-nfw-blackberry/5 font-ui transition-colors disabled:opacity-50"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {showFileError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-nfw-blackberry/40" />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-serif text-nfw-blackberry mb-4">
              File Not Attached
            </h3>
            <p className="text-sm font-serif text-nfw-blackberry/80 mb-6">
              {fileErrorMessage}
            </p>
            <button
              onClick={() => setShowFileError(false)}
              className="w-full bg-nfw-aubergine text-white px-6 py-3 font-ui font-bold text-sm tracking-wide hover:bg-nfw-aubergine/90 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </>
  );
}