"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  FileImage,
  FileSpreadsheet,
  FileText,
  Loader2,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import ConfirmModal from "@/components/admin/ConfirmModal";
import { formatFileSize, uploadWithSignedUrl } from "@/lib/admin-upload";

interface AdminDocument {
  id: string;
  file_name: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  file_size: number;
  created_at: string;
  uploaded_by: string | null;
  uploaded_by_name: string | null;
}

const ACCEPT =
  ".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt";
const MAX_BYTES = 25 * 1024 * 1024;

function typeIcon(mime: string) {
  if (mime.startsWith("image/")) return <FileImage className="w-5 h-5" />;
  if (mime.includes("spreadsheet") || mime.includes("excel") || mime === "text/csv") {
    return <FileSpreadsheet className="w-5 h-5" />;
  }
  return <FileText className="w-5 h-5" />;
}

function typeLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime.startsWith("image/")) return mime.split("/")[1].toUpperCase();
  if (mime.includes("wordprocessingml") || mime === "application/msword") return "Word";
  if (mime.includes("spreadsheetml") || mime === "application/vnd.ms-excel") return "Excel";
  if (mime.includes("presentationml") || mime === "application/vnd.ms-powerpoint") return "PowerPoint";
  if (mime === "text/csv") return "CSV";
  if (mime === "text/plain") return "Text";
  return mime;
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function AdminDocumentsClient() {
  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState("");

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/admin/documents?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load documents");
      setDocuments(data.documents || []);
      setTotal(data.total || 0);
      setPageSize(data.pageSize || 50);
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setLoading(false);
    }
  }, [page, debouncedSearch]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleFiles = async (files: FileList | File[]) => {
    const list = Array.from(files);
    if (list.length === 0) return;
    setError("");
    setUploading(true);

    const failures: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      setUploadProgress(
        list.length > 1 ? `Uploading ${i + 1} of ${list.length}: ${file.name}` : `Uploading ${file.name}…`,
      );
      if (file.size > MAX_BYTES) {
        failures.push(`${file.name}: larger than 25 MB`);
        continue;
      }
      try {
        const doc = await uploadWithSignedUrl<AdminDocument>({
          prepareUrl: "/api/admin/documents/prepare",
          finalizeUrl: "/api/admin/documents/finalize",
          bucket: "admin-documents",
          file,
        });
        // Show immediately if we're on the first page with no search
        if (page === 1 && !debouncedSearch) {
          setDocuments((prev) => [doc, ...prev]);
          setTotal((t) => t + 1);
        }
      } catch (e) {
        failures.push(`${file.name}: ${errMsg(e)}`);
      }
    }

    setUploading(false);
    setUploadProgress("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (failures.length > 0) setError(failures.join(" · "));
    // Re-sync with server if we couldn't optimistically insert
    if (page !== 1 || debouncedSearch) fetchDocuments();
  };

  const copyLink = async (doc: AdminDocument) => {
    try {
      await navigator.clipboard.writeText(doc.public_url);
      setCopiedId(doc.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      setError("Could not copy to clipboard");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/documents/${deleteTarget.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setDocuments((prev) => prev.filter((d) => d.id !== deleteTarget.id));
      setTotal((t) => Math.max(0, t - 1));
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Upload zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!uploading) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragActive(false);
          if (!uploading && e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
        }}
        className={`bg-white border-2 border-dashed p-8 text-center transition-colors ${
          dragActive ? "border-nfw-aubergine bg-nfw-aubergine/5" : "border-nfw-blackberry/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
        {uploading ? (
          <div className="flex flex-col items-center gap-3 text-nfw-blackberry/70">
            <Loader2 className="w-8 h-8 animate-spin text-nfw-aubergine" />
            <p className="text-sm font-ui">{uploadProgress}</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3">
            <Upload className="w-8 h-8 text-nfw-aubergine" />
            <p className="text-sm text-nfw-blackberry/70 font-serif">
              Drag and drop files here, or
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 bg-nfw-aubergine text-white font-ui font-bold text-xs tracking-[0.06em] uppercase hover:bg-nfw-aubergine/90 transition-colors"
            >
              Choose Files
            </button>
            <p className="text-xs text-nfw-blackberry/40 font-ui">
              PDF, images, Word, Excel, PowerPoint, CSV, TXT · up to 25 MB each
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-start justify-between gap-3 bg-red-50 border border-red-200 text-red-700 text-sm p-3">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-700/60 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search + count */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-nfw-blackberry/40" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by file name…"
            className="w-full pl-9 pr-9 py-2 text-sm border border-nfw-blackberry/20 bg-white focus:outline-none focus:border-nfw-aubergine"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-nfw-blackberry/40 hover:text-nfw-blackberry"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-xs font-ui text-nfw-blackberry/50">
          {total.toLocaleString("en-US")} document{total === 1 ? "" : "s"}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white overflow-x-auto">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-[44%]" />
            <col className="w-[10%]" />
            <col className="w-[10%]" />
            <col className="w-[14%]" />
            <col className="w-[10%]" />
            <col className="w-[12%]" />
          </colgroup>
          <thead>
            <tr className="text-left text-xs font-ui font-semibold uppercase tracking-wider text-nfw-blackberry/50 border-b border-nfw-blackberry/10">
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Uploaded by</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-nfw-blackberry/50">
                  <Loader2 className="w-5 h-5 animate-spin inline-block mr-2" />
                  Loading…
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-nfw-blackberry/50">
                  {debouncedSearch ? `No documents match "${debouncedSearch}"` : "No documents uploaded yet"}
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr
                  key={doc.id}
                  className="border-b border-nfw-blackberry/5 hover:bg-nfw-dove/40 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-nfw-aubergine flex-shrink-0">{typeIcon(doc.mime_type)}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-nfw-blackberry truncate" title={doc.file_name}>
                          {doc.file_name}
                        </p>
                        <p
                          className="text-xs text-nfw-blackberry/40 font-mono truncate"
                          title={doc.public_url}
                        >
                          {doc.public_url}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-nfw-blackberry/70">{typeLabel(doc.mime_type)}</td>
                  <td className="px-4 py-3 text-nfw-blackberry/70 whitespace-nowrap">
                    {formatFileSize(doc.file_size)}
                  </td>
                  <td className="px-4 py-3 text-nfw-blackberry/70 truncate" title={doc.uploaded_by_name || ""}>
                    {doc.uploaded_by_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-nfw-blackberry/70 whitespace-nowrap">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => copyLink(doc)}
                        title={copiedId === doc.id ? "Copied!" : "Copy link"}
                        className={`p-2 transition-colors ${
                          copiedId === doc.id
                            ? "text-green-600"
                            : "text-nfw-blackberry/50 hover:text-nfw-aubergine hover:bg-nfw-aubergine/10"
                        }`}
                      >
                        {copiedId === doc.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <a
                        href={doc.public_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open in new tab"
                        className="p-2 text-nfw-blackberry/50 hover:text-nfw-aubergine hover:bg-nfw-aubergine/10 transition-colors"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        title="Delete"
                        className="p-2 text-nfw-blackberry/50 hover:text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
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
        <div className="flex items-center justify-between text-sm font-ui">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-4 py-2 border border-nfw-blackberry/20 bg-white disabled:opacity-40 hover:bg-nfw-dove transition-colors"
          >
            Previous
          </button>
          <span className="text-nfw-blackberry/60">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            className="px-4 py-2 border border-nfw-blackberry/20 bg-white disabled:opacity-40 hover:bg-nfw-dove transition-colors"
          >
            Next
          </button>
        </div>
      )}

      <ConfirmModal
        isOpen={!!deleteTarget}
        title="Delete document?"
        message={
          deleteTarget
            ? `"${deleteTarget.file_name}" will be permanently deleted. Any hyperlinks pointing to this file (in pages, emails, or elsewhere) will break.`
            : ""
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => !deleting && setDeleteTarget(null)}
      />
    </div>
  );
}
