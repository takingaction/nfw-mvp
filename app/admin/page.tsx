import { requireGrantsAccess } from "@/lib/adminCheck";
import { redirect } from "next/navigation";
import AdminHubClient from "./AdminHubClient";

export const metadata = {
  title: "Admin Dashboard - National Fund for Women",
  description: "Admin hub for managing NFW membership site",
};

export default async function AdminPage() {
  const { isAdmin, isReviewer } = await requireGrantsAccess();

  // Reviewers should be redirected to /admin/grants
  if (!isAdmin && isReviewer) {
    redirect("/admin/grants");
  }

  return <AdminHubClient />;
}
