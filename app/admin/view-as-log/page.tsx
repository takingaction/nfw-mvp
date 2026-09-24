import { requireAdmin } from "@/middleware/adminCheck";
import AdminViewAsLogClient from "./AdminViewAsLogClient";

export const dynamic = "force-dynamic";

export default async function ViewAsLogPage() {
  await requireAdmin({ redirectOnFailure: true });
  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-nfw-blackberry font-serif">
            View As Member Log
          </h1>
          <p className="text-nfw-blackberry/60 text-lg">
            Immutable audit trail of every admin &ldquo;View as Member&rdquo; session.
            Records are retained for 7 years.
          </p>
        </div>
        <AdminViewAsLogClient />
      </div>
    </main>
  );
}
