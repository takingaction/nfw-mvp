"use client";

import { useState, useEffect } from "react";
import {
  Gift,
  ExternalLink,
  Phone,
  Copy,
  Check,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Filter,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Archive,
  ArchiveRestore,
} from "lucide-react";
import Link from "next/link";
import ExpiredLinkModal from "@/components/ui/ExpiredLinkModal";

interface Redemption {
  id: string;
  offer_key: string;
  offer_title: string;
  store_name: string | null;
  store_logo_url: string | null;
  location_name: string | null;
  redeem_type: string;
  coupon_code: string | null;
  phone_number: string | null;
  redemption_url: string | null;
  instructions: string | null;
  display_message: string | null;
  status: "active" | "used" | "expired" | "archived";
  redeemed_at: string;
  expires_at: string | null;
}

const ITEMS_PER_PAGE = 10;

export default function RedemptionHistoryPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [showExpiredModal, setShowExpiredModal] = useState(false);

  useEffect(() => {
    fetchRedemptions();
  }, [statusFilter, currentPage]);

  const fetchRedemptions = async () => {
    try {
      setLoading(true);

      const offset = (currentPage - 1) * ITEMS_PER_PAGE;

      // Build status parameter
      let statusParam = "";
      if (statusFilter === "archived") {
        // Only show archived
        statusParam = "&status=archived";
      } else if (statusFilter !== "all") {
        // Show specific status (active, used, expired)
        statusParam = `&status=${statusFilter}`;
      } else {
        // "All" means all EXCEPT archived
        statusParam = "&exclude_archived=true";
      }

      const url = `/api/access-perks/redemptions?limit=${ITEMS_PER_PAGE}&offset=${offset}${statusParam}`;

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error("Failed to fetch redemptions");
      }

      const data = await response.json();
      setRedemptions(data.redemptions || []);
      setTotalCount(data.total_count || 0);
    } catch (err: any) {
      console.error("Fetch redemptions error:", err);
      setError(err.message || "Failed to load redemptions");
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (
    id: string,
    newStatus: "active" | "used" | "archived",
  ) => {
    try {
      setUpdatingId(id);

      const response = await fetch(`/api/access-perks/redemptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setRedemptions((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r)),
      );
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const toggleUsedStatus = (id: string, currentStatus: string) => {
    const newStatus = currentStatus === "active" ? "used" : "active";
    updateStatus(id, newStatus as "active" | "used");
  };

  const archiveRedemption = (id: string) => {
    updateStatus(id, "archived");
  };

  const unarchiveRedemption = (id: string) => {
    updateStatus(id, "active");
  };

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleOpenFreshUrl = async (redemptionId: string, storedUrl: string | null) => {
    // Static URLs don't expire - open directly
    if (storedUrl && (storedUrl.includes('static-stage.accessdevelopment.com') || storedUrl.includes('static.accessdevelopment.com'))) {
      window.open(storedUrl, "_blank");
      return;
    }

    try {
      const response = await fetch(`/api/access-perks/redemptions/${redemptionId}/fresh-url`);
      const data = await response.json();

      if (!data.url) {
        setShowExpiredModal(true);
        return;
      }

      // Fetch the actual URL content and check for AccessDenied
      const urlResponse = await fetch(data.url, { signal: AbortSignal.timeout(10000) });
      const urlText = await urlResponse.text();

      if (!urlResponse.ok || urlText.includes("<Code>AccessDenied</Code>")) {
        setShowExpiredModal(true);
      } else {
        window.open(data.url, "_blank");
      }
    } catch {
      setShowExpiredModal(true);
    }
  };

  const isExpired = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    const formatted = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    if (date < new Date()) {
      return `Expired ${formatted}`;
    }
    return `Expires ${formatted}`;
  };

  const formatExpiryDate = (expiresAt: string | null) => {
    if (!expiresAt) return null;
    const date = new Date(expiresAt);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const decodeHtml = (html: string | null) => {
    if (!html) return "";
    if (typeof window === "undefined") return html;
    const textarea = document.createElement("textarea");
    textarea.innerHTML = html;
    return textarea.value;
  };

  const getRedemptionTypeLabel = (type: string) => {
    switch (type) {
      case "link":
        return "Online";
      case "instore":
        return "In-Store";
      case "instore_print":
        return "Print";
      case "call":
        return "Call";
      default:
        return type;
    }
  };

  const getRedemptionTypeColor = (type: string) => {
    switch (type) {
      case "link":
        return "bg-nfw-blackberry text-white";
      case "instore":
        return "bg-nfw-lilac text-nfw-blackberry";
      case "instore_print":
        return "bg-[#b2d1ee] text-nfw-blackberry";
      case "call":
        return "bg-[#d4f1ad] text-nfw-blackberry";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  const getStatusBadge = (status: string, expiresAt: string | null) => {
    // Check if actually expired based on status AND expires_at
    const isActuallyExpired = status === "active" && expiresAt && new Date(expiresAt) < new Date();

    if (isActuallyExpired) {
      return (
        <span className="text-xs px-2 py-0.5 bg-nfw-dove text-nfw-blackberry/60 font-medium border border-nfw-blackberry/10">
          Expired
        </span>
      );
    }

    switch (status) {
      case "active":
        return (
          <span className="text-xs px-2 py-0.5 bg-[#d4f1ad]/30 text-nfw-blackberry font-medium border border-[#d4f1ad]">
            Active
          </span>
        );
      case "used":
        return (
          <span className="text-xs px-2 py-0.5 bg-nfw-lilac/20 text-nfw-blackberry font-medium border border-nfw-lilac">
            Used
          </span>
        );
      case "archived":
        return (
          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 font-medium border border-gray-300">
            Archived
          </span>
        );
      default:
        return null;
    }
  };

  const handleFilterChange = (newFilter: string) => {
    setStatusFilter(newFilter);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);
  const startItem =
    totalCount === 0 ? 0 : (currentPage - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(currentPage * ITEMS_PER_PAGE, totalCount);

  return (
    <div className="min-h-screen bg-white">
      <div className="bg-white border-b border-nfw-blackberry/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-nfw-blackberry/60 hover:text-nfw-blackberry transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Dashboard
          </Link>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-serif text-4xl lg:text-6xl text-nfw-blackberry leading-tight">
                Redemption History
              </h1>
              <p className="text-nfw-blackberry/60 mt-1">
                View and manage your redeemed offers
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-nfw-dove border-b border-nfw-blackberry/10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-nfw-blackberry/60" />
            <span className="text-sm font-medium text-nfw-blackberry/60">
              Filter:
            </span>
            <div className="flex gap-2 flex-wrap">
              {["all", "active", "used", "expired"].map((status) => (
                <button
                  key={status}
                  onClick={() => handleFilterChange(status)}
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                    statusFilter === status
                      ? "bg-nfw-blackberry text-white"
                      : "bg-white text-nfw-blackberry hover:bg-nfw-blackberry/5 border border-nfw-blackberry/10"
                  }`}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}

              <button
                onClick={() => handleFilterChange("archived")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-colors ${
                  statusFilter === "archived"
                    ? "bg-gray-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
                }`}
              >
                <Archive className="w-3.5 h-3.5" />
                Archived
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-nfw-lilac" />
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 p-6">
            <div className="flex items-center gap-2 text-red-600 mb-2">
              <AlertCircle className="w-5 h-5" />
              <h3 className="font-semibold">Error Loading Redemptions</h3>
            </div>
            <p className="text-sm text-red-800">{error}</p>
          </div>
        ) : redemptions.length === 0 ? (
          <div className="text-center py-12">
            <Gift className="w-16 h-16 text-nfw-blackberry/20 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-nfw-blackberry mb-2">
              No Redemptions Found
            </h3>
            <p className="text-nfw-blackberry/60 mb-6">
              {statusFilter === "all"
                ? "You haven't redeemed any offers yet"
                : `No ${statusFilter} redemptions found`}
            </p>
            <Link
              href="/perks"
              className="inline-flex items-center gap-2 px-6 py-3 bg-nfw-blackberry text-white hover:bg-nfw-blackberry/90 transition-colors font-medium"
            >
              Browse Perks
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-nfw-blackberry/60">
                Showing {startItem}-{endItem} of {totalCount} redemption
                {totalCount !== 1 ? "s" : ""}
              </p>
            </div>

            <div className="space-y-4 mb-6">
              {redemptions.map((redemption) => (
                <div
                  key={redemption.id}
                  className="bg-white border border-nfw-blackberry/10 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {redemption.store_logo_url ? (
                        <img
                          src={redemption.store_logo_url}
                          alt={redemption.store_name || "Store logo"}
                          className="w-12 h-12 rounded-lg object-contain bg-white border border-nfw-blackberry/10"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-nfw-dove border border-nfw-blackberry/10 flex items-center justify-center">
                          <Gift className="w-6 h-6 text-nfw-blackberry" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          {redemption.store_name && (
                            <p
                              className="text-sm font-semibold text-nfw-blackberry mb-0.5 [&_sup]:text-[0.6em] [&_sup]:align-super"
                              dangerouslySetInnerHTML={{
                                __html: decodeHtml(redemption.store_name),
                              }}
                            />
                          )}
                          <h3
                            className="text-base font-medium text-nfw-blackberry/80 [&_sup]:text-[0.6em] [&_sup]:align-super"
                            dangerouslySetInnerHTML={{
                              __html: decodeHtml(redemption.offer_title),
                            }}
                          />
                          {redemption.location_name && (
                            <p className="text-xs text-nfw-blackberry/40 mt-0.5">
                              {redemption.location_name}
                            </p>
                          )}
                        </div>
                        {getStatusBadge(redemption.status, redemption.expires_at)}
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <span
                          className={`text-xs px-2 py-0.5 font-medium ${getRedemptionTypeColor(redemption.redeem_type)}`}
                        >
                          {getRedemptionTypeLabel(redemption.redeem_type)}
                        </span>
                        <span className="text-xs text-nfw-blackberry/40">
                          Redeemed {formatDate(redemption.redeemed_at)}
                        </span>
                        {redemption.expires_at && (
                          <span className={`text-xs font-medium ${
                            isExpired(redemption.expires_at)?.startsWith("Expired") ? "text-red-600" : "text-nfw-blackberry/40"
                          }`}>
                            {isExpired(redemption.expires_at)}
                          </span>
                        )}
                      </div>

                      {redemption.display_message && (
                        <div className="mb-3 p-3 bg-nfw-dove">
                          <p className="text-xs text-nfw-blackberry/70">
                            {redemption.display_message}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2">
                        {(redemption.status === "active" ||
                          redemption.status === "used") && (
                          <button
                            onClick={() =>
                              toggleUsedStatus(redemption.id, redemption.status)
                            }
                            disabled={updatingId === redemption.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 transition-colors text-xs font-medium disabled:opacity-50 ${
                              redemption.status === "active"
                                ? "bg-[#d4f1ad] text-nfw-blackberry hover:bg-[#d4f1ad]/80"
                                : "bg-nfw-lilac/20 text-nfw-blackberry hover:bg-nfw-lilac/30 border border-nfw-lilac"
                            }`}
                          >
                            {updatingId === redemption.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Updating...
                              </>
                            ) : redemption.status === "active" ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Mark as Used
                              </>
                            ) : (
                              <>
                                <AlertCircle className="w-3 h-3" />
                                Mark as Active
                              </>
                            )}
                          </button>
                        )}

                        {redemption.status === "archived" ? (
                          <button
                            onClick={() => unarchiveRedemption(redemption.id)}
                            disabled={updatingId === redemption.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-citrine/30 text-nfw-blackberry hover:bg-nfw-citrine/50 transition-colors text-xs font-medium disabled:opacity-50 border border-nfw-citrine"
                          >
                            {updatingId === redemption.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Updating...
                              </>
                            ) : (
                              <>
                                <ArchiveRestore className="w-3 h-3" />
                                Unarchive
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            onClick={() => archiveRedemption(redemption.id)}
                            disabled={updatingId === redemption.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            {updatingId === redemption.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Archiving...
                              </>
                            ) : (
                              <>
                                <Archive className="w-3 h-3" />
                                Archive
                              </>
                            )}
                          </button>
                        )}

                        {redemption.coupon_code && (
                          <button
                            onClick={() =>
                              copyCode(redemption.coupon_code!, redemption.id)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-blackberry text-white hover:bg-nfw-blackberry/90 transition-colors text-xs font-medium"
                          >
                            {copiedId === redemption.id ? (
                              <>
                                <Check className="w-3 h-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Code: {redemption.coupon_code}
                              </>
                            )}
                          </button>
                        )}

                        {redemption.phone_number && (
                          <a
                            href={`tel:${redemption.phone_number}`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#d4f1ad] text-nfw-blackberry hover:bg-[#d4f1ad]/80 transition-colors text-xs font-medium"
                          >
                            <Phone className="w-3 h-3" />
                            {redemption.phone_number}
                          </a>
                        )}

                        {redemption.redemption_url && (
                          <button
                            onClick={() => handleOpenFreshUrl(redemption.id, redemption.redemption_url)}
                            disabled={openingId === redemption.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-lilac/20 text-nfw-blackberry hover:bg-nfw-lilac/30 transition-colors text-xs font-medium disabled:opacity-50"
                          >
                            {openingId === redemption.id ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                Loading...
                              </>
                            ) : (
                              <>
                                <ExternalLink className="w-3 h-3" />
                                Open Offer
                              </>
                            )}
                          </button>
                        )}

                        <Link
                          href={`/perks/${redemption.offer_key}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-nfw-dove text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors text-xs font-medium border border-nfw-blackberry/10"
                        >
                          View Offer Details
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-nfw-blackberry/10 pt-6">
                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  disabled={currentPage === 1}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-nfw-blackberry hover:bg-nfw-dove disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-nfw-blackberry/10 font-medium text-sm"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Previous
                </button>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-nfw-blackberry/60">
                    Page {currentPage} of {totalPages}
                  </span>
                </div>

                <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-white text-nfw-blackberry hover:bg-nfw-dove disabled:opacity-50 disabled:cursor-not-allowed transition-colors border border-nfw-blackberry/10 font-medium text-sm"
                >
                  Next
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
      <ExpiredLinkModal
        isOpen={showExpiredModal}
        onClose={() => setShowExpiredModal(false)}
      />
    </div>
  );
}
