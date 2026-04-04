"use client";

import { useState } from "react";

interface Document {
  id: string;
  file_name: string;
  file_size: number;
  uploaded_at: string;
  document_url: string;
  grant_id: string;
}

export default function GrantDocuments({
  documents,
  grantId,
}: {
  documents: Document[];
  grantId: string;
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleView = async (doc: Document) => {
    setLoadingId(doc.id);
    try {
      const res = await fetch("/api/grants/document-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filePath: doc.document_url, grantId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to get URL");
      window.open(data.url, "_blank");
    } catch (err: any) {
      alert(err.message || "Failed to open document");
    } finally {
      setLoadingId(null);
    }
  };

  if (!documents || documents.length === 0) return null;

  return (
    <div className="bg-white border border-gray-200 p-8 mb-6">
      <h3 className="font-ui mb-4">Supporting Documents</h3>
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between bg-nfw-dove p-4"
          >
            <div>
              <div className="font-ui">{doc.file_name}</div>
              <div className="text-sm font-ui text-gray-500">
                Uploaded {new Date(doc.uploaded_at).toLocaleDateString()} •{" "}
                {(doc.file_size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              onClick={() => handleView(doc)}
              disabled={loadingId === doc.id}
              className="text-nfw-aubergine hover:text-nfw-aubergine/80 font-ui disabled:opacity-50"
            >
              {loadingId === doc.id ? "Loading..." : "View →"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
