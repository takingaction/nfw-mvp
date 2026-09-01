import { requireAdmin } from "@/lib/adminCheck";
import AdminContactSubmissions from "./AdminContactSubmissions";

export default async function ContactSubmissionsPage() {
  await requireAdmin({ redirectOnFailure: true });

  return <AdminContactSubmissions />;
}