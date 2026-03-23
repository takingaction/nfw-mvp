"use client";

import { useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

type ClaimWithDetails = {
  id: string;
  item_id: string;
  member_id: string;
  claimed_at: string;
  shipping_address: any;
  selected_variant: any;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  tracking_number: string | null;
  notes: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  item: {
    id: string;
    name: string;
    image_url: string | null;
    category: { name: string } | null;
  };
  member: {
    id: string;
    full_name: string;
  };
  member_email: string;
  shopify_product_id?: string | null;
  shopify_variant_id?: string | null;
  shopify_checkout_id?: string | null;
  shopify_order_id?: string | null;
};

const STATUS_OPTIONS = [
  {
    value: "pending",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "processing",
    label: "Processing",
    color: "bg-blue-100 text-blue-800",
  },
  {
    value: "shipped",
    label: "Shipped",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "delivered",
    label: "Delivered",
    color: "bg-green-100 text-green-800",
  },
  { value: "cancelled", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

export default function AdminClaimsClient({
  claims,
}: {
  claims: ClaimWithDetails[];
}) {
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingClaim, setEditingClaim] = useState<ClaimWithDetails | null>(
    null,
  );
  const [trackingNumber, setTrackingNumber] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  // Filter claims
  const filteredClaims = useMemo(() => {
    let filtered = claims;

    if (selectedStatus) {
      filtered = filtered.filter((claim) => claim.status === selectedStatus);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (claim) =>
          claim.member.full_name.toLowerCase().includes(query) ||
          claim.member_email.toLowerCase().includes(query) ||
          claim.item.name.toLowerCase().includes(query) ||
          claim.tracking_number?.toLowerCase().includes(query),
      );
    }

    return filtered;
  }, [claims, selectedStatus, searchQuery]);

  // Status counts
  const statusCounts = useMemo(() => {
    return STATUS_OPTIONS.reduce(
      (acc, status) => {
        acc[status.value] = claims.filter(
          (c) => c.status === status.value,
        ).length;
        return acc;
      },
      {} as Record<string, number>,
    );
  }, [claims]);

  const handleEditClick = (claim: ClaimWithDetails) => {
    setEditingClaim(claim);
    setTrackingNumber(claim.tracking_number || "");
    setAdminNotes(claim.notes || "");
    setNewStatus(claim.status);
    setError(null);
  };

  const handleUpdateClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClaim) return;

    setLoading(true);
    setError(null);

    try {
      const updates: any = {
        status: newStatus,
        tracking_number: trackingNumber || null,
        notes: adminNotes || null,
      };

      // Set timestamps based on status
      if (newStatus === "shipped" && !editingClaim.shipped_at) {
        updates.shipped_at = new Date().toISOString();
      }
      if (newStatus === "delivered" && !editingClaim.delivered_at) {
        updates.delivered_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("zero_dollar_claims")
        .update(updates)
        .eq("id", editingClaim.id);

      if (error) throw error;

      setEditingClaim(null);
      router.refresh();
    } catch (error: any) {
      setError(error.message || "Failed to update claim");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Claim ID",
      "Date",
      "Member Name",
      "Member Email",
      "Item",
      "Status",
      "Tracking Number",
      "Address",
    ];
    const rows = filteredClaims.map((claim) => [
      claim.id,
      new Date(claim.claimed_at).toLocaleDateString(),
      claim.member.full_name,
      claim.member_email,
      claim.item.name,
      claim.status,
      claim.tracking_number || "",
      `${claim.shipping_address.address_line1}, ${claim.shipping_address.city}, ${claim.shipping_address.state} ${claim.shipping_address.zip}`,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `claims-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
  };

  return (
    <div>
      {/* Filters and Actions */}
      <div className="mb-6 space-y-4">
        {/* Search */}
        <div className="flex gap-4">
          <input
            type="text"
            placeholder="Search by member name, email, item, or tracking number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 px-4 py-2 border border-nfw-blackberry/20"
          />
          <button
            onClick={exportToCSV}
            className="bg-nfw-blackberry text-white px-6 py-2 font-medium hover:bg-nfw-blackberry/90"
          >
            Export CSV
          </button>
        </div>

        {/* Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          <button
            onClick={() => setSelectedStatus(null)}
            className={`px-4 py-2 whitespace-nowrap ${
              selectedStatus === null
                ? "bg-nfw-blackberry text-white"
                : "bg-white text-nfw-blackberry border border-nfw-blackberry/10 hover:bg-nfw-blackberry/5"
            }`}
          >
            All Claims ({claims.length})
          </button>
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status.value}
              onClick={() => setSelectedStatus(status.value)}
              className={`px-4 py-2 whitespace-nowrap ${
                selectedStatus === status.value
                  ? "bg-nfw-blackberry text-white"
                  : "bg-white text-nfw-blackberry border border-nfw-blackberry/10 hover:bg-nfw-blackberry/5"
              }`}
            >
              {status.label} ({statusCounts[status.value] || 0})
            </button>
          ))}
        </div>
      </div>

      {/* Claims Table */}
      {filteredClaims.length === 0 ? (
        <div className="text-center py-12 bg-white border border-nfw-blackberry/10">
          <p className="text-nfw-blackberry/60">
            No claims found matching your criteria.
          </p>
        </div>
      ) : (
        <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-nfw-dove border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase">
                    Item
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase">
                    Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase">
                    Tracking
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-nfw-blackberry/5">
                {filteredClaims.map((claim) => {
                  const statusInfo = STATUS_OPTIONS.find(
                    (s) => s.value === claim.status,
                  );
                  return (
                    <tr key={claim.id} className="hover:bg-nfw-dove/50">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {claim.item.image_url && (
                            <div className="relative w-12 h-12 overflow-hidden">
                              <Image
                                src={claim.item.image_url}
                                alt={claim.item.name}
                                fill
                                className="object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-nfw-blackberry">{claim.item.name}</div>
                            {claim.item.category && (
                              <div className="text-xs text-nfw-blackberry/50">
                                {claim.item.category.name}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-nfw-blackberry">
                          {claim.member.full_name}
                        </div>
                        <div className="text-sm text-nfw-blackberry/50">
                          {claim.member_email}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-nfw-blackberry/50">
                        {new Date(claim.claimed_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-block px-2 py-1 text-xs font-medium ${statusInfo?.color}`}
                        >
                          {statusInfo?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {claim.tracking_number || "-"}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-3">
                          {claim.shopify_order_id && (
                            <a
                              href={`https://nfw-checkout.myshopify.com/admin/orders/${claim.shopify_order_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-nfw-passion hover underline text-sm"
                            >
                              View Order
                            </a>
                          )}
                          <button
                            onClick={() => handleEditClick(claim)}
                            className="text-nfw-blackberry hover:text-nfw-blackberry/70 font-medium text-sm"
                          >
                            Manage
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingClaim && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto border border-nfw-blackberry/10">
            <h2 className="text-2xl font-bold mb-4 text-nfw-blackberry">Manage Claim</h2>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 text-sm mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleUpdateClaim} className="space-y-4">
              {/* Claim Details */}
              <div className="bg-nfw-dove p-4 space-y-2">
                <div>
                  <strong>Item:</strong> {editingClaim.item.name}
                </div>
                <div>
                  <strong>Member:</strong> {editingClaim.member.full_name} (
                  {editingClaim.member_email})
                </div>
                <div>
                  <strong>Claimed:</strong>{" "}
                  {new Date(editingClaim.claimed_at).toLocaleString()}
                </div>
                {editingClaim.selected_variant && (
                  <div>
                    <strong>Variant:</strong>{" "}
                    {JSON.stringify(editingClaim.selected_variant)}
                  </div>
                )}
              </div>

              {/* Shipping Address */}
              <div className="bg-nfw-dove p-4">
                <strong className="block mb-2 text-nfw-blackberry">Shipping Address:</strong>
                <div className="text-sm space-y-1">
                  <div>{editingClaim.shipping_address.full_name}</div>
                  <div>{editingClaim.shipping_address.address_line1}</div>
                  {editingClaim.shipping_address.address_line2 && (
                    <div>{editingClaim.shipping_address.address_line2}</div>
                  )}
                  <div>
                    {editingClaim.shipping_address.city},{" "}
                    {editingClaim.shipping_address.state}{" "}
                    {editingClaim.shipping_address.zip}
                  </div>
                  <div>Phone: {editingClaim.shipping_address.phone}</div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium mb-1 text-nfw-blackberry">
                  Status *
                </label>
                <select
                  required
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20"
                >
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Tracking Number */}
              <div>
                <label className="block text-sm font-medium mb-1 text-nfw-blackberry">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="Enter tracking number"
                  className="w-full px-3 py-2 border border-nfw-blackberry/20"
                />
              </div>

              {/* Admin Notes */}
              <div>
                <label className="block text-sm font-medium mb-1 text-nfw-blackberry">
                  Admin Notes
                </label>
                <textarea
                  value={adminNotes}
                  onChange={(e) => setAdminNotes(e.target.value)}
                  placeholder="Internal notes (not visible to member)"
                  rows={3}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20"
                />
              </div>

              {/* Shopify Info (read-only display) */}
              {(editingClaim.shopify_order_id || editingClaim.shopify_product_id || editingClaim.shopify_variant_id) && (
                <div className="bg-nfw-dove p-4">
                  <strong className="block mb-2 text-nfw-blackberry">Shopify Information:</strong>
                  <div className="text-sm space-y-1">
                    {editingClaim.shopify_order_id && (
                      <div>
                        <span className="text-nfw-blackberry/50">Order ID:</span>{" "}
                        <a
                          href={`https://nfw-checkout.myshopify.com/admin/orders/${editingClaim.shopify_order_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-nfw-passion hover underline"
                        >
                          {editingClaim.shopify_order_id}
                        </a>
                      </div>
                    )}
                    {editingClaim.shopify_product_id && (
                      <div>
                        <span className="text-nfw-blackberry/50">Product ID:</span> {editingClaim.shopify_product_id}
                      </div>
                    )}
                    {editingClaim.shopify_variant_id && (
                      <div>
                        <span className="text-nfw-blackberry/50">Variant ID:</span> {editingClaim.shopify_variant_id}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setEditingClaim(null);
                    setError(null);
                  }}
                  className="flex-1 px-4 py-2 border border-nfw-blackberry/20 hover:bg-nfw-blackberry/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-nfw-blackberry text-white py-2 hover:bg-nfw-blackberry/90 disabled:opacity-50"
                >
                  {loading ? "Updating..." : "Update Claim"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
