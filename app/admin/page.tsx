import { getAdminAccess } from "@/lib/adminCheck";
import { scopedPages } from "@/lib/admin-scopes";
import { redirect } from "next/navigation";
import AdminHubClient from "./AdminHubClient";

export const metadata = {
  title: "Admin Dashboard - National Fund for Women",
  description: "Admin hub for managing NFW membership site",
};

export default async function AdminPage() {
  const access = await getAdminAccess();
  if (!access) redirect("/auth/login");

  if (access.isAdmin) return <AdminHubClient />;

  // Reviewers should be redirected to /admin/grants
  if (access.isReviewer) redirect("/admin/grants");

  // Scoped users (profiles.admin_scopes) see only their pages.
  if (access.scopes.length > 0) {
    return <AdminHubClient allowedHrefs={scopedPages(access.scopes)} />;
  }

  redirect("/");
}
