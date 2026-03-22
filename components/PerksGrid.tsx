"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

interface Offer {
  id: string;
  type: string;
  attributes: {
    offer_key: string;
    title: string;
    teaser: string;
    terms: string;
    offer_value: string;
    offer_type: string;
    redemption_method: string;
    start_date: string;
    end_date: string;
  };
  relationships?: {
    merchant?: {
      data: {
        id: string;
        type: string;
      };
    };
    categories?: {
      data: Array<{ id: string; type: string }>;
    };
  };
}

interface Category {
  id: string;
  attributes: {
    category_key: string;
    name: string;
    icon_url?: string;
  };
}

export default function PerksGrid() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [searchZip, setSearchZip] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/perks/categories");
        if (res.ok) {
          const data = await res.json();
          setCategories(data.categories);
        }
      } catch (err) {
        console.error("Failed to load categories");
      }
    }
    fetchCategories();
  }, []);

  useEffect(() => {
    async function fetchOffers() {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: page.toString(),
          per_page: "20",
        });
        if (searchZip) params.append("postal_code", searchZip);
        if (selectedCategory) params.append("category_key", selectedCategory);

        const res = await fetch(`/api/perks?${params.toString()}`);
        if (!res.ok) {
          if (res.status === 401)
            throw new Error("Please sign in to view perks");
          throw new Error("Failed to load offers");
        }
        const data = await res.json();
        setOffers(data.offers);
        if (data.user?.postal_code && !searchZip) {
          setPostalCode(data.user.postal_code);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchOffers();
  }, [page, searchZip, selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchZip(postalCode);
    setPage(1);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 mb-4">{error}</p>
        <a
          href="/auth/login"
          className="text-nfw-blackberry underline hover:text-nfw-blackberry/70 font-medium"
        >
          Sign in to continue
        </a>
      </div>
    );
  }

  return (
    <div>
      {/* Search Form */}
      <form onSubmit={handleSearch} className="mb-6 flex gap-2">
        <input
          type="text"
          placeholder="Enter ZIP code"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          className="border border-nfw-blackberry/20 px-4 py-2.5 w-40 text-nfw-blackberry placeholder-nfw-blackberry/40 focus:outline-none focus:ring-2 focus:ring-nfw-lilac focus:border-transparent"
          pattern="^\d{5}$"
        />
        <button
          type="submit"
          className="bg-nfw-blackberry text-white px-5 py-2.5 hover:bg-nfw-blackberry/90 font-medium transition-colors"
        >
          Search
        </button>
      </form>

      {/* Category Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <button
          onClick={() => {
            setSelectedCategory(null);
            setPage(1);
          }}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            !selectedCategory
              ? "bg-nfw-blackberry text-white"
              : "bg-white text-nfw-blackberry border border-nfw-blackberry/20 hover:bg-nfw-blackberry/5"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              setSelectedCategory(cat.attributes.category_key);
              setPage(1);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${
              selectedCategory === cat.attributes.category_key
                ? "bg-nfw-blackberry text-white"
                : "bg-white text-nfw-blackberry border border-nfw-blackberry/20 hover:bg-nfw-blackberry/5"
            }`}
          >
            {cat.attributes.name}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-nfw-lilac" />
          <span className="ml-3 text-nfw-blackberry/60">Loading offers...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* Offers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {offers.map((offer) => (
              <Link
                key={offer.id}
                href={`/perks/${offer.attributes.offer_key}`}
                className="border border-nfw-blackberry/10 p-5 bg-white hover:shadow-md transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs bg-nfw-citrine/40 text-nfw-blackberry px-2.5 py-1 font-medium">
                    {offer.attributes.offer_value}
                  </span>
                  <span className="text-xs text-nfw-blackberry/50">
                    {offer.attributes.offer_type}
                  </span>
                </div>
                <h3 className="font-semibold text-lg text-nfw-blackberry mb-2">
                  {offer.attributes.title}
                </h3>
                <p className="text-sm text-nfw-blackberry/60 mb-3 line-clamp-2">
                  {offer.attributes.teaser}
                </p>
                <div className="text-xs text-nfw-blackberry/40">
                  {offer.attributes.redemption_method}
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          <div className="flex justify-center gap-2 mt-10">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 border border-nfw-blackberry/20 text-nfw-blackberry disabled:opacity-40 disabled:cursor-not-allowed hover:bg-nfw-blackberry/5 font-medium transition-colors"
            >
              Previous
            </button>
            <span className="px-4 py-2 text-nfw-blackberry/60">Page {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              disabled={offers.length < 20}
              className="px-4 py-2 border border-nfw-blackberry/20 text-nfw-blackberry disabled:opacity-40 disabled:cursor-not-allowed hover:bg-nfw-blackberry/5 font-medium transition-colors"
            >
              Next
            </button>
          </div>
        </>
      )}

      {/* Empty State */}
      {!loading && offers.length === 0 && (
        <div className="text-center py-12 text-nfw-blackberry/50">
          No offers found for this location. Try a different ZIP code.
        </div>
      )}
    </div>
  );
}
