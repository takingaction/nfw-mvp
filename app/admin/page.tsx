import { requireAdmin } from "@/lib/adminCheck";
import AdminHubClient from "./AdminHubClient";

export const metadata = {
  title: "Admin Dashboard - National Fund for Women",
  description: "Admin hub for managing NFW membership site",
};

export default async function AdminPage() {
  await requireAdmin();

  return <AdminHubClient />;
}
