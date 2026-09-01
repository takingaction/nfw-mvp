import { requireAdmin } from "@/middleware/adminCheck";
import AdminStorySubmissions from "./AdminStorySubmissions";

export default async function AdminStorySubmissionsPage() {
  await requireAdmin({ redirectOnFailure: true });

  return <AdminStorySubmissions />;
}