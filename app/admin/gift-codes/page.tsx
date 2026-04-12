import { requireAdmin } from "@/lib/adminCheck";
import AdminGiftCodes from "./AdminGiftCodes";

export const metadata = {
  title: "Gift Codes - Admin",
  description: "Manage gift membership codes",
};

export default async function GiftCodesAdminPage() {
  await requireAdmin();

  return <AdminGiftCodes />;
}