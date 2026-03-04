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
    <div className="bg-white rounded-lg shadow p-8 mb-6">
      <h3 className="font-semibold mb-4">Supporting Documents</h3>
      <div className="space-y-3">
        {documents.map((doc) => (
          <div
            key={doc.id}
            className="flex items-center justify-between bg-gray-50 p-4 rounded-lg"
          >
            <div>
              <div className="font-medium">{doc.file_name}</div>
              <div className="text-sm text-gray-500">
                Uploaded {new Date(doc.uploaded_at).toLocaleDateString()} •{" "}
                {(doc.file_size / 1024).toFixed(1)} KB
              </div>
            </div>
            <button
              onClick={() => handleView(doc)}
              disabled={loadingId === doc.id}
              className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
            >
              {loadingId === doc.id ? "Loading..." : "View →"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
