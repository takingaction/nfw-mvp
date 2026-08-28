import { requireAdmin } from "@/middleware/adminCheck";
import SystemSettingsClient from "./SystemSettingsClient";

export const metadata = {
  title: "System Settings - NFW Admin",
  description: "Health checks and operational controls",
};

export default async function SystemSettingsPage() {
  await requireAdmin();

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
            System Settings
          </h1>
          <p className="text-nfw-blackberry/60">
            Health checks and operational controls for the Zero Dollar Store and integrations
          </p>
        </div>

        <SystemSettingsClient />
      </div>
    </main>
  );
}
