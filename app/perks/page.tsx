"use client";

import { useState, useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import PerksSearch from "@/components/perks/PerksSearch";
import OfferCard from "@/components/perks/OfferCard";

export default function PerksPage() {
  const [offers, setOffers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInfo, setSearchInfo] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSearchParams, setCurrentSearchParams] = useState<any>({});

  useEffect(() => {
    fetchCategories();
    fetchOffers({});
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/access-perks/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  const deduplicateOffers = (offers: any[]) => {
    const seen = new Set<number>();
    const uniqueOffers: any[] = [];

    for (const offer of offers) {
      const groupKey = offer.offer_group_key;

      if (!groupKey) {
        uniqueOffers.push(offer);
        continue;
      }

      if (!seen.has(groupKey)) {
        seen.add(groupKey);
        uniqueOffers.push(offer);
      }
    }

    return uniqueOffers;
  };

  const fetchOffers = async (params: any) => {
    setLoading(true);
    setError(null);

    try {
      const isSearching = params.query || params.category_key;

      const queryParams = new URLSearchParams({
        ...params,
        per_page: isSearching ? "100" : "12",
        aggregations: "categories,stores",
      });

      const response = await fetch(
        `/api/access-perks/offers/search?${queryParams.toString()}`,
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 503 || errorData.error?.includes("503")) {
          throw new Error("SERVICE_UNAVAILABLE");
        }

        throw new Error(errorData.error || "Failed to fetch offers");
      }

      const data = await response.json();

      if (data.message === "No offers found.") {
        setOffers([]);
        setSearchInfo({ total_results: 0, total_pages: 0 });
      } else {
        const allOffers = data.offers || [];

        if (isSearching) {
          const uniqueOffers = deduplicateOffers(allOffers);
          const displayOffers = uniqueOffers.slice(0, 12);

          setOffers(displayOffers);

          const totalUnique = uniqueOffers.length;
          const totalPages = Math.ceil(totalUnique / 12);

          setSearchInfo({
            total_results: totalUnique,
            current_page: params.page || 1,
            total_pages: totalPages,
            results_per_page: 12,
          });
        } else {
          setOffers(allOffers);
          setSearchInfo(data.info || {});
        }
      }
    } catch (err: any) {
      console.error("Fetch offers error:", err);
      setError(err.message || "Failed to load offers");
      setOffers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (params: any) => {
    setCurrentSearchParams(params);
    setCurrentPage(1);
    fetchOffers({ ...params, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    fetchOffers({ ...currentSearchParams, page });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="bg-white pt-8 pb-6 border-b border-nfw-blackberry/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl lg:text-6xl leading-[1.1] text-nfw-aubergine mb-2">
            Member Perks
          </h2>
          <p className="font-sans text-nfw-blackberry/60">
            Exclusive discounts and offers for NFW members.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white p-4 mb-6 border border-nfw-blackberry/10">
          <PerksSearch onSearch={handleSearch} categories={categories} />
        </div>

        {searchInfo && !loading && !error && (
          <div className="mb-4 font-sans text-sm text-nfw-blackberry/50">
            {searchInfo.total_results > 0 ? (
              <span>
                Showing {offers.length} of {searchInfo.total_results} offers
                {searchInfo.total_pages > 1 &&
                  ` - Page ${currentPage} of ${searchInfo.total_pages}`}
              </span>
            ) : (
              <span>No offers found. Try adjusting your search filters.</span>
            )}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-nfw-lilac border-t-transparent rounded-full animate-spin" />
            <span className="font-sans text-nfw-blackberry/60 ml-3">Loading offers...</span>
          </div>
        )}

        {error === "SERVICE_UNAVAILABLE" && !loading && (
          <div className="bg-nfw-citrine/20 border border-nfw-citrine p-6 mt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-nfw-blackberry flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-sans font-semibold text-nfw-blackberry mb-1">
                  Service Temporarily Unavailable
                </h3>
                <p className="font-sans text-sm text-nfw-blackberry/70 mb-4">
                  The Access Perks service is currently experiencing issues.
                  Please try again shortly.
                </p>
                <button
                  onClick={() => fetchOffers(currentSearchParams)}
                  className="px-4 py-2 bg-nfw-aubergine text-white font-sans text-sm font-medium hover:bg-nfw-blackberry transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {error && error !== "SERVICE_UNAVAILABLE" && !loading && (
          <div className="bg-red-50 border border-red-200 p-6 mt-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h3 className="font-sans font-semibold text-red-900 mb-1">
                  Unable to Load Offers
                </h3>
                <p className="font-sans text-sm text-red-700 mb-4">{error}</p>
                <button
                  onClick={() => fetchOffers(currentSearchParams)}
                  className="px-4 py-2 bg-red-600 text-white font-sans text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {!loading && !error && offers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {offers.map((offer) => (
              <OfferCard key={offer.offer_key} offer={offer} />
            ))}
          </div>
        )}

        {!loading && !error && searchInfo && searchInfo.total_pages > 1 && (
          <div className="flex justify-center gap-2 mt-10">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-4 py-2 border border-nfw-blackberry/20 font-sans text-sm font-medium text-nfw-blackberry disabled:opacity-40 disabled:cursor-not-allowed hover:bg-nfw-blackberry/5 transition-colors"
            >
              Previous
            </button>

            {Array.from(
              { length: Math.min(5, searchInfo.total_pages) },
              (_: unknown, i: number) => {
                let pageNum;
                if (searchInfo.total_pages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= searchInfo.total_pages - 2) {
                  pageNum = searchInfo.total_pages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`px-4 py-2 font-sans text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? "bg-nfw-aubergine text-white"
                        : "border border-nfw-blackberry/20 text-nfw-blackberry hover:bg-nfw-blackberry/5"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              },
            )}

            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === searchInfo.total_pages}
              className="px-4 py-2 border border-nfw-blackberry/20 font-sans text-sm font-medium text-nfw-blackberry disabled:opacity-40 disabled:cursor-not-allowed hover:bg-nfw-blackberry/5 transition-colors"
            >
              Next
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          offers.length === 0 &&
          searchInfo?.total_results === 0 && (
            <div className="text-center py-16">
              <h3 className="font-sans text-lg font-semibold text-nfw-blackberry mb-2">
                No offers found
              </h3>
              <p className="font-sans text-nfw-blackberry/60 mb-6">
                Try adjusting your search filters or browse all offers.
              </p>
              <button
                onClick={() => handleSearch({})}
                className="px-6 py-2.5 bg-nfw-aubergine text-white font-sans text-sm font-medium hover:bg-nfw-blackberry transition-colors"
              >
                Browse All Offers
              </button>
            </div>
          )}
      </div>
    </main>
  );
}
