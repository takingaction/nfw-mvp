"use client";

import { useState } from "react";

interface EmailRecord {
  email: string;
  created_at: string;
}

interface AdminComingSoonEmailsProps {
  initialEmails: EmailRecord[];
}

export default function AdminComingSoonEmails({
  initialEmails,
}: AdminComingSoonEmailsProps) {
  const [emails] = useState<EmailRecord[]>(initialEmails);
  const [downloading, setDownloading] = useState(false);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    try {
      const response = await fetch("/api/admin/coming-soon-emails", {
        headers: {
          Accept: "text/csv",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to download CSV");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "coming-soon-emails.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download error:", error);
      alert("Failed to download CSV");
    } finally {
      setDownloading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="min-h-screen bg-nfw-dove">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-serif text-nfw-blackberry">
              Coming Soon Emails
            </h1>
            <p className="text-nfw-aubergine font-ui mt-2">
              Total Subscribers: {emails.length}
            </p>
          </div>
          <button
            onClick={handleDownloadCsv}
            disabled={downloading || emails.length === 0}
            className="px-6 py-3 bg-nfw-aubergine text-white font-ui rounded-lg hover:bg-nfw-aubergine/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? "Downloading..." : "Download CSV"}
          </button>
        </div>

        {emails.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <p className="text-nfw-aubergine font-ui">
              No subscribers yet.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-nfw-aubergine/10">
                  <th className="px-6 py-4 text-left text-sm font-ui font-semibold text-nfw-blackberry">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-ui font-semibold text-nfw-blackberry">
                    Date Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {emails.map((record, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-nfw-aubergine font-ui">
                      {record.email}
                    </td>
                    <td className="px-6 py-4 text-nfw-aubergine font-ui text-sm">
                      {formatDate(record.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
