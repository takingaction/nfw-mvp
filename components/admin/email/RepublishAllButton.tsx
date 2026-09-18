"use client";

import { useState } from "react";
import { RefreshCw, X } from "lucide-react";

interface RepublishResult {
  slug: string;
  success: boolean;
  error?: string;
}

interface Props {
  publishedCount: number;
  onComplete?: () => void;
}

export default function RepublishAllButton({ publishedCount, onComplete }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState<
    | {
        total: number;
        successCount: number;
        failedCount: number;
        results: RepublishResult[];
      }
    | null
  >(null);
  const [error, setError] = useState<string | null>(null);

  const open = () => {
    setIsOpen(true);
    setResult(null);
    setError(null);
  };

  const close = () => {
    if (working) return; // don't allow closing mid-run
    setIsOpen(false);
  };

  const handleRepublish = async () => {
    setWorking(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/emails/republish-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to republish templates");
        setWorking(false);
        return;
      }
      setResult({
        total: data.total,
        successCount: data.successCount,
        failedCount: data.failedCount,
        results: data.results || [],
      });
      setWorking(false);
      if (onComplete) onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
      setWorking(false);
    }
  };

  const disabled = publishedCount === 0;

  return (
    <>
      <button
        type="button"
        onClick={open}
        disabled={disabled}
        title={
          disabled
            ? "No published templates to republish"
            : "Regenerate full_email_html for every published template"
        }
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded border border-nfw-wisteria text-nfw-wisteria bg-white hover:bg-nfw-wisteria hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Republish All
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-nfw-blackberry/40">
          <div className="bg-white max-w-lg w-full rounded-xl shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h3 className="text-lg font-bold text-nfw-blackberry font-serif">
                Republish All Templates
              </h3>
              {!working && (
                <button
                  type="button"
                  onClick={close}
                  className="text-nfw-blackberry/40 hover:text-nfw-blackberry transition-colors"
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Body */}
            <div className="p-5">
              {!result && !error && (
                <>
                  <p className="text-sm text-nfw-blackberry/80 font-serif leading-relaxed">
                    This will regenerate <code>full_email_html</code> for every published email
                    template ({publishedCount} template{publishedCount === 1 ? "" : "s"}).
                    Existing markup translation will be applied to current template content.
                  </p>
                  <p className="text-sm text-nfw-blackberry/60 font-serif mt-3">
                    Use this after editing the email builder, or after deploying a markup
                    translation fix to clear raw markup from stored HTML.
                  </p>
                </>
              )}

              {working && (
                <div className="flex items-center gap-3 text-sm text-nfw-blackberry font-ui">
                  <RefreshCw className="w-4 h-4 animate-spin text-nfw-wisteria" />
                  <span>Republishing templates…</span>
                </div>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-800 font-ui">
                  {error}
                </div>
              )}

              {result && (
                <div className="space-y-3">
                  <div
                    className={`rounded p-3 text-sm font-ui ${
                      result.failedCount === 0
                        ? "bg-green-50 border border-green-200 text-green-800"
                        : "bg-amber-50 border border-amber-200 text-amber-800"
                    }`}
                  >
                    {result.failedCount === 0
                      ? `All ${result.total} templates republished successfully.`
                      : `${result.successCount} of ${result.total} templates republished. ${result.failedCount} failed.`}
                  </div>

                  {result.failedCount > 0 && (
                    <details className="text-xs">
                      <summary className="cursor-pointer text-nfw-blackberry/70 font-ui font-medium">
                        Show failures
                      </summary>
                      <ul className="mt-2 space-y-1 max-h-40 overflow-y-auto font-mono">
                        {result.results
                          .filter((r) => !r.success)
                          .map((r) => (
                            <li key={r.slug} className="text-red-700">
                              <strong>{r.slug}</strong>: {r.error}
                            </li>
                          ))}
                      </ul>
                    </details>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-2 justify-end p-4 border-t bg-nfw-dove/30">
              {!result ? (
                <>
                  <button
                    type="button"
                    onClick={close}
                    disabled={working}
                    className="px-4 py-2 text-sm font-ui font-medium text-nfw-blackberry/70 bg-white border border-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleRepublish}
                    disabled={working}
                    className="px-4 py-2 text-sm font-ui font-bold text-white bg-nfw-wisteria hover:bg-nfw-wisteria/90 disabled:opacity-50 transition-colors inline-flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${working ? "animate-spin" : ""}`} />
                    Republish All
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={close}
                  className="px-4 py-2 text-sm font-ui font-medium text-white bg-nfw-aubergine hover:bg-nfw-aubergine/90 transition-colors"
                >
                  Done
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
