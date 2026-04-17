import { requireAdmin } from "@/lib/adminCheck";
import ShopifyAdminClient from "./ShopifyAdminClient";

export const metadata = {
  title: "Manage Zero Dollar Store - Admin",
  description: "Manage Shopify products and Zero Dollar Store settings",
};

export default async function AdminShopifyPage() {
  await requireAdmin();

  return <ShopifyAdminClient />;
}
