import { requireAdmin } from "@/lib/adminCheck";
import DashboardAdminClient from "./DashboardAdminClient";

export const metadata = {
  title: "Manage Dashboard - Admin",
  description: "Configure the member dashboard content",
};

export default async function AdminDashboardPage() {
  await requireAdmin();

  return <DashboardAdminClient />;
}
