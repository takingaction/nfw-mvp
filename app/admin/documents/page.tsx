import Link from "next/link";
import { requireAdmin } from "@/middleware/adminCheck";
import AdminDocumentsClient from "./AdminDocumentsClient";

export const metadata = {
  title: "Document Library - NFW Admin",
  description: "Upload documents and copy public links for use in hyperlinks",
};

export default async function AdminDocumentsPage() {
  await requireAdmin({ redirectOnFailure: true });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <Link
            href="/admin"
            className="text-sm font-ui text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors"
          >
            ← Admin Dashboard
          </Link>
          <h1 className="text-4xl font-bold text-nfw-blackberry mt-4 mb-2 font-serif">
            Document Library
          </h1>
          <p className="text-nfw-blackberry/60">
            Upload PDFs, images, and office documents to get a permanent public link you can use in
            page content, emails, or anywhere else. Files here are publicly reachable by anyone with
            the link — do not upload member documents or other private information. To attach a
            supporting document to a member&rsquo;s microgrant application, use the{" "}
            <span className="font-semibold">Add document</span> button on that application inside{" "}
            <Link href="/admin/grants" className="underline hover:text-nfw-blackberry">
              Manage Grants
            </Link>
            .
          </p>
        </div>

        <AdminDocumentsClient />
      </div>
    </main>
  );
}
