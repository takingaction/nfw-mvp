import { requireAdmin } from "@/middleware/adminCheck";
import AdminFlodeskClient from "./AdminFlodeskClient";

export const metadata = {
  title: "Flodesk Sync - NFW Admin",
  description: "Sync member categories to Flodesk segments",
};

export default async function AdminFlodeskPage() {
  await requireAdmin({ redirectOnFailure: true });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">Flodesk Sync</h1>
          <p className="text-nfw-blackberry/60">
            Each rule maps a member category to a Flodesk segment. Every hour, members who have been in the
            category for the configured delay are added to the segment, and members who leave the category are
            removed. Build workflows in Flodesk that trigger on &ldquo;added to segment.&rdquo;
          </p>
        </div>

        <AdminFlodeskClient />
      </div>
    </main>
  );
}
