"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, SlidersHorizontal, X } from "lucide-react";
import { useSearchParams } from "next/navigation";
import PerksSearch from "@/components/perks/PerksSearch";
import OfferCard from "@/components/perks/OfferCard";
import FilterSidebar from "@/components/perks/FilterSidebar";
import StoreCard from "@/components/perks/StoreCard";
import LocationCard from "@/components/perks/LocationCard";
import OfferDetailPanel from "@/components/perks/OfferDetailPanel";
import NfwPerkStoreCard from "@/components/perks/NfwPerkStoreCard";
import NfwPerkOfferCard from "@/components/perks/NfwPerkOfferCard";
import NfwPerkDetailPanel from "@/components/perks/NfwPerkDetailPanel";

type ViewType = "stores" | "offers" | "locations";
type NfwViewType = "partners" | "perks";

interface Facet {
  key: string;
  label: string;
  values: { key: string; label: string }[];
}

interface RollupGroup {
  key: string | number;
  name?: string;
  count: number;
  offers?: string[];
  logo_url?: string;
  description?: string;
  address?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  distance?: number;
  location?: any;
  store?: any;
}

const EXCLUDED_STORES = [
  "Williams Gun Works",
  "Medlock Range",
  "Miami Valley Shooting Grounds",
  "Learn 2 Shoot Handgun Training Academy",
  "Paladin Tactical Firearms Training",
  "Republic Arms",
  "Defender Shooting Sports",
  "New American Arms",
  "Hopkins Gun & Tackle",
  "Range Masters of Utah",
  "Original Bob's Shooting Range",
  "Impact Guns",
  "Personal Defense Depot",
  "Vegas Machine Gun Experience",
];

export default function PerksPage() {
  const searchParams = useSearchParams();
  const [offers, setOffers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [facets, setFacets] = useState<Facet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInfo, setSearchInfo] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentSearchParams, setCurrentSearchParams] = useState<any>({});
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [selectedFacets, setSelectedFacets] = useState<string[]>([]);
  const [selectedStore, setSelectedStore] = useState<number | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);
  const [selectedOfferTypes, setSelectedOfferTypes] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [searchPostalCode, setSearchPostalCode] = useState<string>("");
  const [searchDistance, setSearchDistance] = useState<string>("10mi");
  const [selectedOfferKey, setSelectedOfferKey] = useState<string | null>(null);
  const [detailPanelStoreKey, setDetailPanelStoreKey] = useState<number | null>(null);
  const [onlineOnly, setOnlineOnly] = useState<boolean>(false);
  const [savedFilters, setSavedFilters] = useState<{
    selectedCategories: number[];
    selectedFacets: string[];
    selectedOfferTypes: string[];
    searchQuery: string;
    searchPostalCode: string;
    searchDistance: string;
  } | null>(null);
  const [isOfferPanelOpen, setIsOfferPanelOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [likedStoreKeys, setLikedStoreKeys] = useState<number[]>([]);
  const [nfwOnly, setNfwOnly] = useState(false);
  const [nfwPerks, setNfwPerks] = useState<any[]>([]);
  const [nfwPerkRedeeming, setNfwPerkRedeeming] = useState<string | null>(null);
  const [nfwView, setNfwView] = useState<NfwViewType>("partners");
  const [selectedPartner, setSelectedPartner] = useState<string | null>(null);
  const [selectedNfwPerk, setSelectedNfwPerk] = useState<any>(null);
  const [isNfwDetailOpen, setIsNfwDetailOpen] = useState(false);
  const [nfwLikedPerks, setNfwLikedPerks] = useState<string[]>([]);
  const [nfwLikedPartners, setNfwLikedPartners] = useState<string[]>([]);
  const [showNfwExclusive, setShowNfwExclusive] = useState(false);
  const [collections, setCollections] = useState<any[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [collectionPerks, setCollectionPerks] = useState<any[]>([]);
  const [heroSettings, setHeroSettings] = useState<{
    hero_image_url: string | null;
    hero_heading: string;
    hero_subheading: string;
  } | null>(null);

  useEffect(() => {
    const storeParam = searchParams.get("store");
    if (storeParam) {
      const storeKey = parseInt(storeParam);
      if (!isNaN(storeKey)) {
        setSelectedStore(storeKey);
        setCurrentView("offers");
      }
    }

    const nfwPartnerParam = searchParams.get("nfw_partner");
    if (nfwPartnerParam) {
      setNfwOnly(true);
      setSelectedPartner(decodeURIComponent(nfwPartnerParam));
      setNfwView("perks");
    }
  }, [searchParams]);

  useEffect(() => {
    const supabase = createClient();
    
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      
      // Only check profile for logged-in users
      if (user) {
        try {
          const response = await fetch("/api/auth/profile");
          if (!response.ok) {
            window.location.href = "/auth/login";
            return;
          }
          const profileData = await response.json();

          if (!profileData?.profile_completed) {
            window.location.href = "/auth/sign-up?step=1";
            return;
          }
          // Free members need is_approved_free_member = true to access perks
          // Waitlist members also cannot access perks
          if ((profileData?.membership_level === "free" && profileData?.is_approved_free_member !== true) || profileData?.membership_level === "waitlist") {
            window.location.href = "/auth/sign-up?step=3";
            return;
          }
          // Only redirect if membership_level is explicitly set to a non-perk plan
          if (profileData?.membership_level && !["free", "contributing", "founding", "waitlist"].includes(profileData.membership_level)) {
            window.location.href = "/auth/sign-up?step=3";
            return;
          }

          setProfile(profileData);
        } catch (err) {
          console.error("Profile fetch error:", err);
          window.location.href = "/auth/login";
          return;
        }

        // Fetch liked stores
        fetchLikedStores();
      }

      setAuthChecked(true);
    };
    
    fetchUser();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (authChecked && user === null) {
      window.location.href = "/auth/login";
    }
  }, [authChecked, user]);

  useEffect(() => {
    if (user) {
      fetchLikedStores();
    }
  }, [user]);

  useEffect(() => {
    const fetchUserZip = async () => {
      try {
        const res = await fetch('/api/profile');
        const data = await res.json();
        if (data.zip) {
          setSearchPostalCode(data.zip);
        }
      } catch (err) {
        console.error("Failed to fetch profile ZIP:", err);
      }
    };
    fetchUserZip();
  }, []);

  const clearAllFilters = async () => {
    setSelectedCategories([]);
    setSelectedFacets([]);
    setSelectedOfferTypes([]);
    setSelectedStore(null);
    setSelectedLocation(null);
    setSearchQuery("");
    setOnlineOnly(false);
    setCurrentPage(1);
    setCurrentView("stores");
    setSavedFilters(null);

    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.zip) {
        setSearchPostalCode(data.zip);
        setSearchDistance("10mi");
      } else {
        setSearchPostalCode("");
        setSearchDistance("2500mi");
      }
    } catch (err) {
      console.error("Failed to fetch profile ZIP:", err);
      setSearchPostalCode("");
      setSearchDistance("2500mi");
    }
  };
  const [isFilterDrawerOpen, setIsFilterDrawerOpen] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>("stores");
  const [rollupGroups, setRollupGroups] = useState<RollupGroup[]>([]);
  const [viewCounts, setViewCounts] = useState({ stores: 0, offers: 0, locations: 0 });

  useEffect(() => {
    fetchCategories();
    fetchFacets();
    fetchSiteSettings();
    fetchCollections();
    fetchPerksSettings();
  }, []);

  const fetchSiteSettings = async () => {
    try {
      const res = await fetch("/api/site/settings");
      const data = await res.json();
      setShowNfwExclusive(data.show_nfw_exclusive_button || false);
    } catch (err) {
      console.error("Failed to fetch site settings:", err);
    }
  };

  const fetchPerksSettings = async () => {
    try {
      const res = await fetch("/api/perks/settings");
      const data = await res.json();
      if (data) {
        setHeroSettings(data);
      }
    } catch (err) {
      console.error("Failed to fetch perks settings:", err);
    }
  };

  const fetchCollections = async () => {
    try {
      const res = await fetch("/api/perk-collections");
      const data = await res.json();
      if (data.collections) {
        setCollections(data.collections);
      }
    } catch (err) {
      console.error("Failed to fetch collections:", err);
    }
  };

  useEffect(() => {
    // Skip if no postal code and not nationwide - wait for zip to be loaded
    if (!searchPostalCode && searchDistance !== "2500mi") {
      return;
    }
    fetchAllCounts(onlineOnly);
    fetchRollup(onlineOnly);
  }, [onlineOnly, selectedCategories, selectedFacets, selectedStore, selectedLocation, selectedOfferTypes, searchQuery, searchPostalCode, searchDistance, currentView, currentPage]);

  const fetchAllCounts = async (isOnlineOnly: boolean) => {
    try {
      const cacheBuster = Date.now();
      const nationwide = searchDistance === "2500mi";
      const onlineParam = isOnlineOnly ? "&online=only" : (nationwide ? "&online=include" : "");
      const nationalParam = nationwide ? "&national=include" : "";
      const geoParams = nationwide
        ? "&postal_code=50001&distance=6000mi"
        : (searchPostalCode ? `&postal_code=${searchPostalCode}&distance=${searchDistance}` : "");
      const categoryParam = selectedCategories.length > 0 ? `&category_key=${selectedCategories.join(",")}` : "";
      const [storesRes, offersRes, locationsRes] = await Promise.all([
        fetch(`/api/access-perks/rollup?rollup=stores${geoParams}${categoryParam}${nationalParam}${onlineParam}&cb=${cacheBuster}`),
        fetch(`/api/access-perks/offers/search?per_page=1${geoParams}${categoryParam}${nationalParam}${onlineParam}&cb=${cacheBuster}`),
        fetch(`/api/access-perks/rollup?rollup=locations${geoParams}${categoryParam}${nationalParam}${onlineParam}&cb=${cacheBuster}`),
      ]);

      const [storesData, offersData, locationsData] = await Promise.all([
        storesRes.json().catch(() => ({ info: { total_results: 0 } })),
        offersRes.json().catch(() => ({ info: { total_results: 0 } })),
        locationsRes.json().catch(() => ({ info: { total_results: 0 } })),
      ]);

      setViewCounts({
        stores: storesData.info?.total_stores || 0,
        offers: offersData.info?.total_results || 0,
        locations: locationsData.info?.total_locations || 0,
      });
    } catch (err) {
      console.error("Failed to fetch view counts:", err);
    }
  };

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

  const fetchFacets = async () => {
    try {
      const response = await fetch("/api/access-perks/facets");
      if (response.ok) {
        const data = await response.json();
        setFacets(data.facets || []);
      }
    } catch (err) {
      console.error("Failed to fetch facets:", err);
    }
  };

  const fetchLikedStores = async () => {
    try {
      const response = await fetch("/api/perks/liked-stores");
      if (response.ok) {
        const data = await response.json();
        const stores = data.stores || [];
        const keys: number[] = [];
        const nfwPartners: string[] = [];
        for (const s of stores) {
          const key = parseInt(String(s.store_key), 10);
          if (!isNaN(key)) {
            keys.push(key);
          } else {
            nfwPartners.push(s.store_name);
          }
        }
        setLikedStoreKeys(keys);
        setNfwLikedPartners(nfwPartners);
      } else {
        console.error("Failed to fetch liked stores:", response.status);
      }
    } catch (err) {
      console.error("Failed to fetch liked stores:", err);
    }
  };

  const handleToggleLike = async (storeKey: number, storeName: string, logoUrl: string | undefined, liked: boolean) => {
    try {
      if (liked) {
        const res = await fetch("/api/perks/liked-stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store_key: storeKey, store_name: storeName, logo_url: logoUrl }),
        });
        if (res.ok) {
          setLikedStoreKeys((prev) => [...prev, storeKey]);
        }
      } else {
        const res = await fetch(`/api/perks/liked-stores/${storeKey}`, {
          method: "DELETE",
        });
        if (res.ok) {
          setLikedStoreKeys((prev) => prev.filter((k) => k !== storeKey));
        }
      }
    } catch (err) {
      console.error("Failed to toggle like:", err);
    }
  };

  const handleNfwPartnerToggleLike = async (partnerName: string, logoUrl: string | null, liked: boolean) => {
    console.log("handleNfwPartnerToggleLike:", { partnerName, logoUrl, liked });
    try {
      if (liked) {
        const res = await fetch("/api/perks/liked-stores", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store_key: partnerName, store_name: partnerName, logo_url: logoUrl }),
        });
        console.log("Like response:", res.status);
        if (res.ok) {
          setNfwLikedPartners((prev) => [...prev, partnerName]);
        }
      } else {
        const res = await fetch("/api/perks/liked-stores", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ store_key: partnerName }),
        });
        if (res.ok) {
          setNfwLikedPartners((prev) => prev.filter((p) => p !== partnerName));
        }
      }
    } catch (err) {
      console.error("Failed to toggle NFW partner like:", err);
    }
  };

  const fetchNfwPerks = async () => {
    try {
      const response = await fetch("/api/nfw-perks");
      if (response.ok) {
        const data = await response.json();
        setNfwPerks(data.perks || []);
      }
    } catch (err) {
      console.error("Failed to fetch NFW perks:", err);
    }
  };

  const fetchCollectionPerks = async (collectionId: string) => {
    const collection = collections.find((c) => c.id === collectionId);
    if (!collection) return;

    const accessPerkItems = collection.items.filter((item: any) => item.item_type === "access_perk");
    const nfwPerkItems = collection.items.filter((item: any) => item.item_type === "nfw_perk");

    const accessPerksPromises = accessPerkItems.map(async (item: any) => {
      try {
        // Fetch the access perk directly by offer_key using the detail endpoint
        const response = await fetch(`/api/access-perks/offers/${encodeURIComponent(item.item_identifier)}`);
        if (response.ok) {
          const data = await response.json();
          // API returns { offers: [...] } - we need offers[0]
          if (data && data.offers && data.offers[0]) {
            return { ...data.offers[0], perkSource: "access" };
          } else if (data.error) {
            console.error("Access perk API error:", data.error, "for key:", item.item_identifier);
          }
        } else {
          console.error("Access perk fetch failed with status:", response.status, "for key:", item.item_identifier);
        }
      } catch (err) {
        console.error("Failed to fetch access perk:", item.item_identifier, err);
      }
      return null;
    });

    const nfwPerksPromises = nfwPerkItems.map(async (item: any) => {
      try {
        const response = await fetch(`/api/nfw-perks/slug/${item.item_identifier}${user ? `?userId=${user.id}` : ""}`);
        if (response.ok) {
          const data = await response.json();
          if (data && data.id) {
            return { ...data, perkSource: "nfw" };
          }
        }
      } catch {
        console.error("Failed to fetch NFW perk:", item.item_identifier);
      }
      return null;
    });

    try {
      const [accessPerks, nfwPerksResults] = await Promise.all([
        Promise.all(accessPerksPromises),
        Promise.all(nfwPerksPromises),
      ]);

      const combinedPerks = [
        ...accessPerks.filter(Boolean),
        ...nfwPerksResults.filter(Boolean),
      ].sort((a, b) => {
        // Get the original display_order from the items array
        // item_identifier is stored as string, but offer_key/slug may be number or string
        const aItem = collection.items.find((item: any) =>
          a.perkSource === "access"
            ? String(item.item_identifier) === String(a.offer_key)
            : String(item.item_identifier) === String(a.slug)
        );
        const bItem = collection.items.find((item: any) =>
          b.perkSource === "access"
            ? String(item.item_identifier) === String(b.offer_key)
            : String(item.item_identifier) === String(b.slug)
        );
        return (aItem?.display_order ?? 0) - (bItem?.display_order ?? 0);
      });

      setCollectionPerks(combinedPerks);
    } catch (err) {
      console.error("Failed to fetch collection perks:", err);
      setCollectionPerks([]);
    }
  };

  const handleNfwPerkRedeem = async (perk: any) => {
    if (!user) return;

    // If already redeemed landing page offer, just open URL (like Access Perks "View Again")
    if (perk.userHasRedeemed && perk.landing_page_url) {
      window.open(perk.landing_page_url, "_blank");
      return;
    }

    setNfwPerkRedeeming(perk.id);
    try {
      const response = await fetch(`/api/nfw-perks/${perk.id}/redeem`, {
        method: "POST",
      });
      if (response.ok) {
        const data = await response.json();
        if (data.landingPageUrl) {
          window.open(data.landingPageUrl, "_blank");
        }
        fetchNfwPerks();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to redeem perk");
      }
    } catch (err) {
      console.error("Failed to redeem NFW perk:", err);
      alert("Failed to redeem perk");
    } finally {
      setNfwPerkRedeeming(null);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNfwPerks();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCollectionId) {
      fetchCollectionPerks(selectedCollectionId);
    } else {
      setCollectionPerks([]);
    }
  }, [selectedCollectionId, collections]);

  const fetchRollup = async (isOnlineOnly: boolean) => {
    setLoading(true);
    setError(null);

    try {
      const perPage = 100;
      const page = currentPage;

      if (currentView === "offers") {
        const params: any = {
          per_page: perPage.toString(),
          page: page.toString(),
        };

        if (searchQuery) {
          params.query = searchQuery;
        }

        // Handle Nationwide or normal geolocation
        if (searchDistance === "2500mi") {
          // Nationwide: use postal_code=50001 + distance=6000mi as anchor
          params.postal_code = "50001";
          params.distance = "6000mi";
          params.national = "include";
          params.online = isOnlineOnly ? "only" : "include";
        } else if (searchPostalCode) {
          params.postal_code = searchPostalCode;
          params.distance = searchDistance;
          params.online = isOnlineOnly ? "only" : "include";
        }

        if (selectedCategories.length > 0) {
          params.category_key = selectedCategories.join(",");
        }

        if (selectedFacets.length > 0) {
          params.facet = selectedFacets.join(",");
        }

        if (selectedStore) {
          params.store_key = selectedStore.toString();
        }

        if (selectedLocation) {
          params.location_key = selectedLocation.toString();
        }

        if (selectedOfferTypes.length > 0) {
          params.offer_type = selectedOfferTypes.join(",");
        }

        if (isOnlineOnly && searchDistance !== "2500mi") {
          params.online = "only";
        }

        const queryParams = new URLSearchParams(params);
        const response = await fetch(
          `/api/access-perks/offers/search?${queryParams.toString()}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 401) {
            setError("Please sign in to view offers.");
            setLoading(false);
            return;
          }
          throw new Error(errorData.error || "Failed to fetch results");
        }

        const data = await response.json();

        setRollupGroups((data.offers || []).map((offer: any) => ({ ...offer, key: offer.offer_key })));
        setSearchInfo({
          total_results: data.info?.total_results || 0,
          total_pages: data.info?.total_pages || Math.ceil((data.offers?.length || 0) / perPage),
          current_page: data.info?.current_page || page,
        });

        if (selectedStore) {
          setViewCounts(prev => ({ ...prev, offers: data.info?.total_results || 0 }));
        }
      } else {
        const params: any = {
          rollup: currentView,
          per_page: perPage.toString(),
          page: page.toString(),
        };

        if (searchQuery) {
          params.query = searchQuery;
        }

        // Handle Nationwide or normal geolocation
        if (searchDistance === "2500mi") {
          // Nationwide: use postal_code=50001 + distance=6000mi as anchor
          params.postal_code = "50001";
          params.distance = "6000mi";
          params.national = "include";
          params.online = isOnlineOnly ? "only" : "include";
        } else if (searchPostalCode) {
          params.postal_code = searchPostalCode;
          params.distance = searchDistance;
        }

        if (selectedCategories.length > 0) {
          params.category_key = selectedCategories.join(",");
        }

        if (selectedFacets.length > 0) {
          params.facet = selectedFacets.join(",");
        }

        if (selectedOfferTypes.length > 0) {
          params.offer_types = selectedOfferTypes.join(",");
        }

        if (isOnlineOnly && searchDistance !== "2500mi") {
          params.online = "only";
        }

        const queryParams = new URLSearchParams(params);
        const response = await fetch(
          `/api/access-perks/rollup?${queryParams.toString()}`,
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 401) {
            setError("Please sign in to view offers.");
            setLoading(false);
            return;
          }
          throw new Error(errorData.error || "Failed to fetch results");
        }

        const data = await response.json();

        const totalStores = data.info?.total_stores || searchInfo?.total_stores || 0;
        const totalLocations = data.info?.total_locations || searchInfo?.total_locations || 0;
        const totalItems = currentView === "stores" 
          ? totalStores
          : currentView === "locations"
          ? totalLocations
          : (data.info?.total_results || searchInfo?.total_results || 0);

        setRollupGroups(data.groups || []);
        setSearchInfo((prev: any) => ({
          total_results: data.info?.total_results || prev?.total_results || 0,
          total_stores: totalStores || prev?.total_stores || 0,
          total_locations: totalLocations || prev?.total_locations || 0,
          total_pages: Math.ceil(totalItems / perPage) || 1,
          current_page: data.info?.current_page || page,
        }));

        if (data.info?.total_stores && currentView === "stores") {
          setViewCounts(prev => ({ ...prev, stores: data.info.total_stores }));
        }
        if (data.info?.total_locations && currentView === "locations") {
          setViewCounts(prev => ({ ...prev, locations: data.info.total_locations }));
        }
      }
    } catch (err: any) {
      console.error("Fetch rollup error:", err);
      setError(err.message || "Failed to load results");
      setRollupGroups([]);
    } finally {
      setLoading(false);
    }
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

        if (response.status === 401) {
          setError("Please sign in to view offers.");
          setLoading(false);
          return;
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
          const totalResults = data.info?.total_results || allOffers.length;
          const displayOffers = allOffers.slice(0, 12);

          setOffers(displayOffers);

          const totalUnique = totalResults;
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

  const handleCategoryFilterChange = (categoryKeys: number[]) => {
    setSelectedCategories(categoryKeys);
  };

  const handleFacetsChange = (facetKeys: string[]) => {
    setSelectedFacets(facetKeys);
  };

  const handleSearch = (params: any) => {
    if (params.query !== undefined) setSearchQuery(params.query);
    if (params.postal_code !== undefined) setSearchPostalCode(params.postal_code);
    if (params.distance !== undefined) setSearchDistance(params.distance);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleStoreClick = (storeKey: number) => {
    setSavedFilters({
      selectedCategories,
      selectedFacets,
      selectedOfferTypes,
      searchQuery,
      searchPostalCode,
      searchDistance,
    });
    setSelectedStore(storeKey);
    setSelectedCategories([]);
    setSelectedFacets([]);
    setSelectedOfferTypes([]);
    setSelectedLocation(null);
    setSearchQuery("");
    // Keep postal code and distance for proper API call
    setCurrentView("offers");
    setCurrentPage(1);
  };

  const handleBackToStores = () => {
    if (savedFilters) {
      setSelectedCategories(savedFilters.selectedCategories);
      setSelectedFacets(savedFilters.selectedFacets);
      setSelectedOfferTypes(savedFilters.selectedOfferTypes);
      setSearchQuery(savedFilters.searchQuery);
      setSearchPostalCode(savedFilters.searchPostalCode);
      setSearchDistance(savedFilters.searchDistance);
    }
    setSelectedStore(null);
    setCurrentView("stores");
    setCurrentPage(1);
  };

  const handleLocationClick = (locationKey: number) => {
    setSelectedLocation(locationKey);
    setSelectedCategories([]);
    setSelectedFacets([]);
    setSelectedOfferTypes([]);
    setSelectedStore(null);
    setSearchQuery("");
    setSearchPostalCode("");
    setCurrentView("offers");
    setCurrentPage(1);
  };

  return (
    <main className="min-h-screen bg-nfw-dove">
      <div className="bg-white pt-8 pb-6 border-b border-nfw-blackberry/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-serif text-4xl lg:text-6xl leading-[1.1] text-nfw-aubergine mb-2">
            Member Perks
          </h2>
          <p className="font-serif text-nfw-blackberry/60">
            Exclusive discounts and offers for NFW members.
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {heroSettings?.hero_image_url && (
          <div className="relative h-[150px] md:h-[200px] bg-cover bg-center bg-no-repeat rounded-lg overflow-hidden mb-6">
            <div
              className="absolute inset-0 bg-black/40"
            />
            <div className="relative z-10 flex flex-col items-center justify-center h-full text-center px-4">
              <h3 className="font-serif text-2xl md:text-3xl text-white mb-1">
                {heroSettings.hero_heading}
              </h3>
              <p className="font-ui text-sm text-white/80">
                {heroSettings.hero_subheading}
              </p>
            </div>
          </div>
        )}
        <div className="bg-white p-4 mb-6 border border-nfw-blackberry/10">
          <PerksSearch
            query={searchQuery}
            postalCode={searchPostalCode}
            distance={searchDistance}
            hasActiveFilters={selectedCategories.length > 0 || selectedFacets.length > 0 || selectedOfferTypes.length > 0 || selectedStore !== null || selectedLocation !== null}
            onQueryChange={setSearchQuery}
            onPostalCodeChange={setSearchPostalCode}
            onDistanceChange={(dist) => {
              if (dist === "2500mi") {
                setSearchPostalCode(""); // Clear zip when Nationwide is selected
              } else if (searchDistance === "2500mi") {
                // Switching FROM Nationwide TO a normal distance - restore user's zip
                const fetchUserZip = async () => {
                  try {
                    const res = await fetch('/api/profile');
                    const data = await res.json();
                    setSearchPostalCode(data.zip || "");
                  } catch {
                    setSearchPostalCode("");
                  }
                };
                fetchUserZip();
              }
              setSearchDistance(dist);
            }}
            onSearch={() => setCurrentPage(1)}
            onClear={clearAllFilters}
          />
        </div>

        <div className="flex gap-8">
          <FilterSidebar
            categories={categories}
            selectedCategories={selectedCategories}
            onCategoriesChange={handleCategoryFilterChange}
            facets={facets}
            selectedFacets={selectedFacets}
            onFacetsChange={handleFacetsChange}
            selectedOfferTypes={selectedOfferTypes}
            onOfferTypeChange={setSelectedOfferTypes}
            onlineOnly={onlineOnly}
            onOnlineOnlyChange={setOnlineOnly}
            isMobileOpen={isFilterDrawerOpen}
            onMobileClose={() => setIsFilterDrawerOpen(false)}
            nfwOnly={nfwOnly}
            onNfwOnlyChange={(value: boolean) => {
              setNfwOnly(value);
              if (value) {
                setCurrentView("stores");
                setNfwView("partners");
                setSelectedPartner(null);
                setSelectedCollectionId(null);
              }
            }}
            showNfwExclusive={showNfwExclusive}
            collections={collections}
            selectedCollectionId={selectedCollectionId}
            onCollectionChange={(collectionId: string | null) => {
              setSelectedCollectionId(collectionId);
              if (collectionId) {
                setNfwOnly(false);
                setCurrentView("stores");
                setNfwView("partners");
                setSelectedPartner(null);
              }
            }}
          />

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4 lg:hidden">
              <button
                onClick={() => setIsFilterDrawerOpen(true)}
                className="flex items-center gap-2 px-4 py-2 border border-nfw-blackberry/20 text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
              >
                <SlidersHorizontal className="w-4 h-4" />
                Filters
                {(selectedCategories.length > 0 || selectedFacets.length > 0 || selectedOfferTypes.length > 0 || selectedStore || selectedLocation) && (
                  <span className="px-1.5 py-0.5 bg-nfw-aubergine text-white text-xs rounded">
                    {selectedCategories.length + selectedFacets.length + selectedOfferTypes.length + (selectedStore ? 1 : 0) + (selectedLocation ? 1 : 0)}
                  </span>
                )}
              </button>

              {(selectedCategories.length > 0 || selectedFacets.length > 0 || selectedOfferTypes.length > 0 || selectedStore || selectedLocation || searchQuery || searchPostalCode) && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-nfw-blackberry/60 hover:text-nfw-blackberry flex items-center gap-1 transition-colors"
                >
                  <X className="w-4 h-4" />
                  Clear All
                </button>
              )}
            </div>

            {searchInfo && !loading && !error && !nfwOnly && !selectedCollectionId && (
              <div className="mb-4 font-serif text-sm text-nfw-blackberry/50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {selectedStore && currentView === "offers" && (
                    <button
                      onClick={handleBackToStores}
                      className="text-nfw-aubergine hover:underline flex items-center gap-1"
                    >
                      ← Back to stores results
                    </button>
                  )}
                  {rollupGroups.length === 0 ? (
                    <span className="text-nfw-blackberry/50">No Results</span>
                  ) : (
                    <span>
                      Showing {rollupGroups.length} of {(currentView === "stores" ? (searchInfo.total_stores || viewCounts.stores) : currentView === "locations" ? (searchInfo.total_locations || viewCounts.locations) : searchInfo.total_results)?.toLocaleString() || 0} {currentView}
                      {searchInfo.total_pages > 1 &&
                        ` - Page ${currentPage} of ${searchInfo.total_pages}`}
                    </span>
                  )}
                </div>
                {searchInfo.total_pages > 1 && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border border-nfw-blackberry/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nfw-blackberry/5"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage >= searchInfo.total_pages}
                      className="px-3 py-1 border border-nfw-blackberry/20 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-nfw-blackberry/5"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            )}

            {loading && (
              <div className="flex items-center justify-center py-16">
                <div className="w-6 h-6 border-2 border-nfw-lilac border-t-transparent rounded-full animate-spin" />
                <span className="font-serif text-nfw-blackberry/60 ml-3">Loading...</span>
              </div>
            )}

            {error === "SERVICE_UNAVAILABLE" && !loading && (
              <div className="bg-nfw-citrine/20 border border-nfw-citrine p-6 mt-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-nfw-blackberry flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="font-serif font-semibold text-nfw-blackberry mb-1">
                      Service Temporarily Unavailable
                    </h3>
                    <p className="font-serif text-sm text-nfw-blackberry/70 mb-4">
                      The Access Perks service is currently experiencing issues.
                      Please try again shortly.
                    </p>
                    <button
                      onClick={() => fetchRollup(onlineOnly)}
                      className="px-4 py-2 bg-nfw-aubergine text-white font-ui text-sm font-medium hover:bg-nfw-blackberry transition-colors"
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
                    <h3 className="font-serif font-semibold text-red-900 mb-1">
                      Unable to Load Results
                    </h3>
                    <p className="font-serif text-sm text-red-700 mb-4">{error}</p>
                    <button
                      onClick={() => fetchRollup(onlineOnly)}
                      className="px-4 py-2 bg-red-600 text-white font-ui text-sm font-medium hover:bg-red-700 transition-colors"
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              </div>
            )}

            {!loading && !error && (selectedCollectionId ? collectionPerks.length > 0 : rollupGroups.length > 0) && (
              <>
                {selectedCollectionId && (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <div>
                        <h2 className="font-serif text-xl font-bold text-nfw-blackberry">
                          {collections.find((c) => c.id === selectedCollectionId)?.name}
                        </h2>
                        {collections.find((c) => c.id === selectedCollectionId)?.description && (
                          <p className="font-serif text-sm text-nfw-blackberry/60 mt-1">
                            {collections.find((c) => c.id === selectedCollectionId)?.description}
                          </p>
                        )}
                      </div>
                      <p className="font-serif text-sm text-nfw-blackberry/50">
                        {collectionPerks.length} offer{collectionPerks.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {collectionPerks.map((perk: any) => {
                        if (perk.perkSource === "access") {
                          return (
                            <OfferCard
                              key={perk.offer_key}
                              offer={perk}
                              onClick={() => {
                                setSelectedOfferKey(perk.offer_key);
                                setDetailPanelStoreKey(perk.store_key);
                                setIsOfferPanelOpen(true);
                              }}
                            />
                          );
                        } else {
                          // NFW perk
                          return (
                            <NfwPerkOfferCard
                              key={perk.id}
                              perk={perk}
                              liked={nfwLikedPerks.includes(perk.id)}
                              onToggleLike={(perkId, liked) => {
                                if (liked) {
                                  setNfwLikedPerks((prev) => [...prev, perkId]);
                                } else {
                                  setNfwLikedPerks((prev) => prev.filter((id) => id !== perkId));
                                }
                              }}
                              onClick={() => {
                                setSelectedNfwPerk(perk);
                                setIsNfwDetailOpen(true);
                              }}
                            />
                          );
                        }
                      })}
                    </div>
                  </>
                )}

                {!selectedCollectionId && nfwOnly && nfwView === "partners" && (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <p className="font-serif text-sm text-nfw-blackberry/50">
                        Showing {nfwPerks.length} exclusive {nfwPerks.length === 1 ? "partner" : "partners"}
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {Object.entries(
                        nfwPerks
                          .filter((perk: any) => {
                            if (selectedCategories.length === 0) return true;
                            const perkCategories = perk.categories || [];
                            return perkCategories.some((cat: string) => {
                              const catIndex = categories.findIndex((c: any) => c.category_name === cat);
                              return catIndex !== -1 && selectedCategories.includes(categories[catIndex].category_key);
                            });
                          })
                          .reduce((acc: Record<string, any>, perk: any) => {
                            const partner = perk.partner_name || "Other";
                            if (!acc[partner]) {
                              acc[partner] = {
                                partner_name: partner,
                                partner_logo_url: perk.partner_logo_url,
                                perks: [],
                                total_value: 0,
                              };
                            }
                            acc[partner].perks.push(perk);
                            acc[partner].total_value += perk.estimated_value || 0;
                            return acc;
                          }, {})
                      ).map(([partnerName, partnerData]: [string, any]) => (
                        <NfwPerkStoreCard
                          key={partnerName}
                          partner={{
                            partner_name: partnerData.partner_name,
                            partner_logo_url: partnerData.partner_logo_url,
                          }}
                          liked={nfwLikedPartners.includes(partnerName)}
                          onToggleLike={handleNfwPartnerToggleLike}
                          onClick={() => {
                            setSelectedPartner(partnerName);
                            setNfwView("perks");
                          }}
                        />
                      ))}
                    </div>
                  </>
                )}

                {!selectedCollectionId && nfwOnly && nfwView === "perks" && selectedPartner && (
                  <>
                    <button
                      onClick={() => {
                        setNfwView("partners");
                        setSelectedPartner(null);
                      }}
                      className="mb-4 text-nfw-aubergine hover:underline flex items-center gap-1 font-serif text-sm"
                    >
                      ← Back to partners
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
                      {nfwPerks
                        .filter((p: any) => {
                          if (p.partner_name !== selectedPartner) return false;
                          if (selectedCategories.length === 0) return true;
                          const perkCategories = p.categories || [];
                          return perkCategories.some((cat: string) => {
                            const catIndex = categories.findIndex((c: any) => c.category_name === cat);
                            return catIndex !== -1 && selectedCategories.includes(categories[catIndex].category_key);
                          });
                        })
                        .map((perk: any) => (
                          <NfwPerkOfferCard
                            key={perk.id}
                            perk={perk}
                            liked={nfwLikedPerks.includes(perk.id)}
                            onToggleLike={(perkId, liked) => {
                              if (liked) {
                                setNfwLikedPerks((prev) => [...prev, perkId]);
                              } else {
                                setNfwLikedPerks((prev) => prev.filter((id) => id !== perkId));
                              }
                            }}
                            onClick={() => {
                              setSelectedNfwPerk(perk);
                              setIsNfwDetailOpen(true);
                            }}
                          />
                        ))}
                    </div>
                  </>
                )}

                {!selectedCollectionId && !nfwOnly && currentView === "stores" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {rollupGroups
                      .filter((group) => !EXCLUDED_STORES.includes(group.name || ""))
                      .map((group) => {
                        const storeKey = typeof group.key === 'number' ? group.key : parseInt(String(group.key)) || 0;
                        return (
                        <StoreCard
                          key={group.key}
                          store={{
                            key: storeKey,
                            name: group.name || "Unknown Store",
                            logo_url: group.logo_url,
                            description: group.description,
                            count: group.count,
                            offers: group.offers || [],
                            location: group.location,
                            distance: group.distance,
                          }}
                          liked={likedStoreKeys.includes(Number(storeKey))}
                          onToggleLike={handleToggleLike}
                          onClick={() => handleStoreClick(storeKey)}
                          isNationwide={searchDistance === "2500mi"}
                        />
                      );
                    })}
                  </div>
                )}

                {!selectedCollectionId && !nfwOnly && currentView === "locations" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                    {rollupGroups.map((group) => (
                      <LocationCard
                        key={group.key}
                        location={{
                          key: typeof group.key === 'number' ? group.key : parseInt(String(group.key)) || 0,
                          name: group.name || "Unknown Location",
                          address: group.address,
                          city: group.city,
                          state: group.state,
                          postal_code: group.postal_code,
                          distance: group.distance,
                          count: group.count,
                          offers: group.offers || [],
                          store: group.store,
                        }}
                        onClick={() => handleLocationClick(typeof group.key === 'number' ? group.key : parseInt(String(group.key)) || 0)}
                        isNationwide={searchDistance === "2500mi"}
                      />
                    ))}
                  </div>
                )}

                {!nfwOnly && currentView === "offers" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-5">
                    {rollupGroups.map((item: any, index: number) => (
                      <OfferCard
                        key={item.offer_key || item.key || index}
                        offer={item}
                        onClick={() => {
                          const storeKey = item.offer_store?.store_key;
                          if (storeKey) {
                            setDetailPanelStoreKey(storeKey);
                          } else {
                            setDetailPanelStoreKey(null);
                          }
                          setSelectedOfferKey(item.offer_key || item.key);
                          setIsOfferPanelOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}

                {!nfwOnly && selectedCategories.length > 0 && nfwPerks.length > 0 && (
                    <div className="mt-8 pt-8 border-t border-nfw-blackberry/10">
                    <h3 className="font-serif text-lg font-semibold text-nfw-blackberry mb-4">
                      NFW Exclusive Perks in Selected Categories
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                      {nfwPerks
                        .filter((perk: any) => {
                          if (selectedCategories.length === 0) return false;
                          const perkCategories = perk.categories || [];
                          return perkCategories.some((cat: string) => {
                            const catIndex = categories.findIndex((c: any) => c.category_name === cat);
                            return catIndex !== -1 && selectedCategories.includes(categories[catIndex].category_key);
                          });
                        })
                        .map((perk: any) => (
                          <NfwPerkOfferCard
                            key={perk.id}
                            perk={perk}
                            liked={nfwLikedPerks.includes(perk.id)}
                            onToggleLike={(perkId, liked) => {
                              if (liked) {
                                setNfwLikedPerks((prev) => [...prev, perkId]);
                              } else {
                                setNfwLikedPerks((prev) => prev.filter((id) => id !== perkId));
                              }
                            }}
                            onClick={() => {
                              setSelectedNfwPerk(perk);
                              setIsNfwDetailOpen(true);
                            }}
                          />
                        ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {nfwOnly && nfwPerks.length === 0 && !loading && (
              <div className="text-center py-16">
                <h3 className="font-serif text-lg font-semibold text-nfw-blackberry mb-2">
                  No NFW Exclusive Perks available
                </h3>
                <p className="font-serif text-nfw-blackberry/60 mb-6">
                  Check back soon for exclusive member deals.
                </p>
              </div>
            )}

            {!loading && !error && rollupGroups.length === 0 && searchInfo?.total_results === 0 && !nfwOnly && (
              <div className="text-center py-16">
                <h3 className="font-serif text-lg font-semibold text-nfw-blackberry mb-2">
                  No results found
                </h3>
                <p className="font-serif text-nfw-blackberry/60 mb-6">
                  Try adjusting your filters or browse all offers.
                </p>
                <button
                  onClick={clearAllFilters}
                  className="px-6 py-2.5 bg-nfw-aubergine text-white font-ui text-sm font-medium hover:bg-nfw-blackberry transition-colors"
                >
                  Browse All
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <OfferDetailPanel
        offerKey={selectedOfferKey}
        storeKey={detailPanelStoreKey}
        isOpen={isOfferPanelOpen}
        onClose={() => {
          setIsOfferPanelOpen(false);
          setDetailPanelStoreKey(null);
        }}
        likedStores={likedStoreKeys}
        onToggleLike={handleToggleLike}
        isAdmin={profile?.is_admin}
      />

      <NfwPerkDetailPanel
        perk={selectedNfwPerk}
        isOpen={isNfwDetailOpen}
        onClose={() => setIsNfwDetailOpen(false)}
        liked={selectedNfwPerk ? nfwLikedPartners.includes(selectedNfwPerk.partner_name || "") : false}
        onToggleLike={(partnerName, logoUrl, liked) => {
          if (selectedNfwPerk) {
            // Update local state first for immediate UI feedback
            if (liked) {
              setNfwLikedPartners((prev) => [...prev, partnerName]);
            } else {
              setNfwLikedPartners((prev) => prev.filter((p) => p !== partnerName));
            }
            // Also toggle perk ID in nfwLikedPerks for the offer card
            if (liked) {
              setNfwLikedPerks((prev) => [...prev, selectedNfwPerk.id]);
            } else {
              setNfwLikedPerks((prev) => prev.filter((id) => id !== selectedNfwPerk.id));
            }
            // Persist to database via handleNfwPartnerToggleLike
            handleNfwPartnerToggleLike(partnerName, logoUrl, liked);
          }
        }}
        isAdmin={profile?.is_admin}
        onRedeem={handleNfwPerkRedeem}
      />
    </main>
  );
}
