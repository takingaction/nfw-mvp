"use client";

import { useState, useEffect } from "react";
import { GripVertical, Save, Pencil, X } from "lucide-react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";

type ProductWithMapping = {
  shopifyProductId: string;
  shopifyVariantId: string;
  title: string;
  imageUrl: string;
  mvpVisibility: boolean;
  eligibilityTiers: string[];
  displayOrder: number;
  featuredOrder: number;
  cardDescription?: string;
  compareAtPrice?: number;
};

const TIERS = ["free", "contributing", "founding"];
const MAX_FEATURED = 3;

function SortableProductRow({
  product,
  isFeatured,
  featuredRank,
  onToggleVisibility,
  onToggleTier,
  onToggleFeatured,
  onEdit,
}: {
  product: ProductWithMapping;
  isFeatured: boolean;
  featuredRank: number | null;
  onToggleVisibility: () => void;
  onToggleTier: (tier: string) => void;
  onToggleFeatured: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: product.shopifyProductId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style} className={isFeatured ? "bg-nfw-aubergine/5" : ""}>
      <td className="px-6 py-4">
        <div className="flex items-center">
          <button
            {...attributes}
            {...listeners}
            className="p-1 mr-2 text-nfw-blackberry/30 hover:text-nfw-blackberry/60 cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="w-5 h-5" />
          </button>
          <div className="h-12 w-12 bg-nfw-stone/10 flex-shrink-0 overflow-hidden rounded">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="h-full w-full flex items-center justify-center text-nfw-stone/30 text-xs">
                No Img
              </div>
            )}
          </div>
          <div className="ml-4">
            <div className="font-medium text-nfw-blackberry">{product.title}</div>
            <div className="text-sm text-nfw-blackberry/50 truncate max-w-xs">{product.shopifyProductId}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <button
              onClick={onToggleVisibility}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                product.mvpVisibility ? "bg-[#d4f1ad]" : "bg-nfw-stone/30"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  product.mvpVisibility ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="ml-3 text-sm text-nfw-blackberry/60">
              {product.mvpVisibility ? "Visible" : "Hidden"}
            </span>
          </div>
          <button
            onClick={onToggleFeatured}
            className={`p-2 rounded transition-colors ${
              isFeatured
                ? "text-nfw-aubergine hover:bg-nfw-aubergine/10"
                : "text-nfw-blackberry/30 hover:text-nfw-blackberry/60 hover:bg-nfw-blackberry/5"
            }`}
            title={isFeatured ? "Remove from featured" : "Add to featured"}
          >
            <svg
              className={`w-5 h-5 ${isFeatured ? "fill-current" : ""}`}
              viewBox="0 0 24 24"
              fill={isFeatured ? "currentColor" : "none"}
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </button>
          {isFeatured && (
            <span className="text-xs text-nfw-aubergine font-black uppercase">
              #{featuredRank}
            </span>
          )}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          {TIERS.map((tier) => (
            <button
              key={tier}
              onClick={() => onToggleTier(tier)}
              className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                product.eligibilityTiers?.includes(tier)
                  ? "bg-nfw-blackberry text-white"
                  : "bg-nfw-stone/20 text-nfw-blackberry hover:bg-nfw-stone/30"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="p-2 text-nfw-blackberry/30 hover:text-nfw-aubergine hover:bg-nfw-aubergine/10 rounded transition-colors"
            title="Edit card description"
          >
            <Pencil className="w-5 h-5" />
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function ShopifyAdminClient() {
  const [products, setProducts] = useState<ProductWithMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroHeading, setHeroHeading] = useState("ZERO DOLLAR STORE");
  const [heroSubheading, setHeroSubheading] = useState("Browse our selection");
  const [savingHero, setSavingHero] = useState(false);
  const [heroSaved, setHeroSaved] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithMapping | null>(null);
  const [cardDescriptionInput, setCardDescriptionInput] = useState("");
  const [savingCardDescription, setSavingCardDescription] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const normalizeOrigin = (origin: string) => origin.replace(/^https:\/\/www\./, 'https://');
const SHOPIFY_AUTH_URL = `https://nfw-checkout.myshopify.com/admin/oauth/authorize?client_id=${process.env.NEXT_PUBLIC_SHOPIFY_CLIENT_ID}&scope=read_products,write_checkouts,read_checkouts&redirect_uri=${typeof window !== 'undefined' ? normalizeOrigin(window.location.origin) : ''}/api/shopify-callback`;

  const checkConnection = async () => {
    try {
      const res = await fetch("/api/shopify/products?check_connection=true");
      const data = await res.json();
      setIsConnected(data.connected === true);
    } catch {
      setIsConnected(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("connected") === "true") {
      setMessage({ type: "success", text: "Successfully connected to Shopify!" });
      setIsConnected(true);
      window.history.replaceState({}, "", "/admin/shopify");
    } else if (params.get("error")) {
      setMessage({ type: "error", text: `Connection failed: ${params.get("error")}` });
      window.history.replaceState({}, "", "/admin/shopify");
    }
    checkConnection();
  }, []);

  useEffect(() => {
    async function fetchHeroSettings() {
      try {
        const res = await fetch("/api/store/settings");
        const data = await res.json();
        if (data) {
          setHeroImageUrl(data.hero_image_url || "");
          setHeroHeading(data.hero_heading || "ZERO DOLLAR STORE");
          setHeroSubheading(data.hero_subheading || "Browse our selection");
        }
      } catch (error) {
        console.error("Error fetching hero settings:", error);
      }
    }
    fetchHeroSettings();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await fetch("/api/shopify/products?admin_view=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setProducts(data);
      } else {
        console.warn("API returned non-array:", data);
        setProducts([]);
      }
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/shopify/sync", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: `Synced ${data.count} products from Shopify` });
        fetchProducts();
      } else {
        setMessage({ type: "error", text: data.error || "Sync failed" });
      }
    } catch {
      setMessage({ type: "error", text: "Sync failed" });
    } finally {
      setSyncing(false);
    }
  };

  const toggleVisibility = async (productId: string, currentVisibility: boolean) => {
    const res = await fetch("/api/admin/shopify/update-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopify_product_id: productId,
        updates: { mvp_visibility: !currentVisibility },
      }),
    });

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.shopifyProductId === productId ? { ...p, mvpVisibility: !currentVisibility } : p,
        ),
      );
    }
  };

  const toggleTier = async (productId: string, tier: string, currentTiers: string[]) => {
    const newTiers = currentTiers.includes(tier)
      ? currentTiers.filter((t) => t !== tier)
      : [...currentTiers, tier];

    const res = await fetch("/api/admin/shopify/update-product", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        shopify_product_id: productId,
        updates: { eligibility_tiers: newTiers },
      }),
    });

    if (res.ok) {
      setProducts((prev) =>
        prev.map((p) =>
          p.shopifyProductId === productId ? { ...p, eligibilityTiers: newTiers } : p,
        ),
      );
    }
  };

  const toggleFeatured = async (productId: string) => {
    const product = products.find((p) => p.shopifyProductId === productId);
    if (!product) return;

    const currentlyFeatured = product.featuredOrder < 999;
    const featuredCount = products.filter((p) => p.featuredOrder < 999).length;

    if (currentlyFeatured) {
      const res = await fetch("/api/admin/shopify/update-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopify_product_id: productId,
          updates: { featured_order: 999 },
        }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.shopifyProductId === productId ? { ...p, featuredOrder: 999 } : p,
          ),
        );
      }
    } else {
      if (featuredCount >= MAX_FEATURED) {
        setMessage({ type: "error", text: `Maximum ${MAX_FEATURED} featured products allowed` });
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      const newOrder = featuredCount;
      const res = await fetch("/api/admin/shopify/update-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopify_product_id: productId,
          updates: { featured_order: newOrder },
        }),
      });

      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.shopifyProductId === productId ? { ...p, featuredOrder: newOrder } : p,
          ),
        );
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = products.findIndex((p) => p.shopifyProductId === active.id);
    const newIndex = products.findIndex((p) => p.shopifyProductId === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(products, oldIndex, newIndex);

    setProducts(reordered);

    await Promise.all(
      reordered.map((p, i) =>
        fetch("/api/admin/shopify/update-product", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            shopify_product_id: p.shopifyProductId,
            updates: { display_order: i },
          }),
        })
      )
    );
  };

  const getFeaturedRank = (productId: string): number | null => {
    const featuredProducts = products
      .filter((p) => p.featuredOrder < 999)
      .sort((a, b) => a.featuredOrder - b.featuredOrder);
    const rankIndex = featuredProducts.findIndex((p) => p.shopifyProductId === productId);
    return rankIndex >= 0 ? rankIndex + 1 : null;
  };

  const handleSaveHero = async () => {
    setSavingHero(true);
    setHeroSaved(false);
    try {
      const res = await fetch("/api/store/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero_image_url: heroImageUrl || null,
          hero_heading: heroHeading,
          hero_subheading: heroSubheading,
        }),
      });
      if (res.ok) {
        setHeroSaved(true);
        setTimeout(() => setHeroSaved(false), 3000);
      } else {
        setMessage({ type: "error", text: "Failed to save hero settings" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save hero settings" });
    } finally {
      setSavingHero(false);
    }
  };

  const handleEditCardDescription = (product: ProductWithMapping) => {
    setEditingProduct(product);
    setCardDescriptionInput(product.cardDescription || "");
  };

  const handleSaveCardDescription = async () => {
    if (!editingProduct) return;
    setSavingCardDescription(true);
    try {
      const res = await fetch("/api/admin/shopify/update-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopify_product_id: editingProduct.shopifyProductId,
          updates: { card_description: cardDescriptionInput },
        }),
      });
      if (res.ok) {
        setProducts((prev) =>
          prev.map((p) =>
            p.shopifyProductId === editingProduct.shopifyProductId
              ? { ...p, cardDescription: cardDescriptionInput }
              : p,
          ),
        );
        setEditingProduct(null);
      } else {
        setMessage({ type: "error", text: "Failed to save card description" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save card description" });
    } finally {
      setSavingCardDescription(false);
    }
  };

  const handleCloseCardDescriptionModal = () => {
    setEditingProduct(null);
    setCardDescriptionInput("");
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-nfw-stone/20" />
          ))}
        </div>
      </div>
    );
  }

  const featuredCount = products.filter((p) => p.featuredOrder < 999).length;

  return (
    <div className="p-8 bg-nfw-dove min-h-screen">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-nfw-blackberry mb-2 font-ui">Manage Zero Dollar Store</h1>
          <p className="text-nfw-blackberry/60">
            Drag to reorder. Star to feature on homepage (max {MAX_FEATURED}).
          </p>
        </div>
        <div className="flex gap-3">
          {!isConnected ? (
            <a
              href={SHOPIFY_AUTH_URL}
              className="bg-nfw-aubergine text-white px-6 py-3 font-medium hover:bg-nfw-aubergine/90 inline-block"
            >
              Connect to Shopify
            </a>
          ) : (
            <>
              <a
                href="/store"
                target="_blank"
                className="bg-nfw-dove text-nfw-blackberry px-6 py-3 font-medium hover:bg-nfw-dove/80 inline-block"
              >
                View Store
              </a>
              <button
                onClick={handleSync}
                disabled={syncing}
                className="bg-nfw-blackberry text-white px-6 py-3 font-medium hover:bg-nfw-blackberry/90 disabled:opacity-50"
              >
                {syncing ? "Syncing..." : "Sync from Shopify"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-nfw-blackberry/10">
          <h2 className="text-lg font-bold text-nfw-blackberry font-ui mb-4">Hero Image</h2>
          <p className="text-nfw-blackberry/50 text-sm mb-4">
            Configure the hero banner at the top of the Zero Dollar Store page.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-nfw-blackberry mb-2">
                Background Image
              </label>
              <div className="border border-nfw-blackberry/20 p-4 bg-nfw-dove/50">
                {heroImageUrl ? (
                  <div className="relative">
                    <img
                      src={heroImageUrl}
                      alt="Hero preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <button
                      onClick={() => setMediaLibraryOpen(true)}
                      className="mt-2 text-sm text-nfw-aubergine hover:underline"
                    >
                      Change Image
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setMediaLibraryOpen(true)}
                    className="w-full py-8 border-2 border-dashed border-nfw-blackberry/20 hover:border-nfw-aubergine text-nfw-blackberry/40 hover:text-nfw-aubergine transition-colors text-sm"
                  >
                    + Select Image from Media Library
                  </button>
                )}
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-2">
                  Heading Text
                </label>
                <input
                  type="text"
                  value={heroHeading}
                  onChange={(e) => setHeroHeading(e.target.value)}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nfw-blackberry mb-2">
                  Subheading Text
                </label>
                <input
                  type="text"
                  value={heroSubheading}
                  onChange={(e) => setHeroSubheading(e.target.value)}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
                />
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleSaveHero}
              disabled={savingHero}
              className="flex items-center gap-2 px-4 py-2 bg-nfw-blackberry text-white text-sm font-medium hover:bg-nfw-blackberry/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingHero ? "Saving..." : "Save Hero Settings"}
            </button>
            {heroSaved && (
              <span className="text-sm text-green-600 font-medium">Saved!</span>
            )}
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`mb-6 p-4 ${
            message.type === "success" ? "bg-[#d4f1ad] text-nfw-blackberry" : "bg-red-50 text-red-800"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
        <div className="px-6 py-3 bg-nfw-dove border-b border-nfw-blackberry/10">
          <p className="text-nfw-blackberry/60 text-sm">
            <span className="font-medium">Featured:</span> {featuredCount} of {MAX_FEATURED} | Drag rows to reorder
          </p>
        </div>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="min-w-full divide-y divide-nfw-blackberry/5">
            <thead className="bg-nfw-dove">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                  Visibility / Featured
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                  Eligibility
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-nfw-blackberry/50 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-nfw-blackberry/5">
              <SortableContext
                items={products.map((p) => p.shopifyProductId)}
                strategy={verticalListSortingStrategy}
              >
                {products.map((product) => {
                  const isFeatured = product.featuredOrder < 999;
                  const featuredRank = getFeaturedRank(product.shopifyProductId);

                  return (
                    <SortableProductRow
                      key={product.shopifyProductId}
                      product={product}
                      isFeatured={isFeatured}
                      featuredRank={featuredRank}
                      onToggleVisibility={() => toggleVisibility(product.shopifyProductId, product.mvpVisibility)}
                      onToggleTier={(tier) => toggleTier(product.shopifyProductId, tier, product.eligibilityTiers ?? [])}
                      onToggleFeatured={() => toggleFeatured(product.shopifyProductId)}
                      onEdit={() => handleEditCardDescription(product)}
                    />
                  );
                })}
              </SortableContext>
            </tbody>
          </table>
        </DndContext>
      </div>

      {editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-nfw-blackberry/50">
          <div className="bg-white w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-nfw-blackberry/10">
              <h3 className="text-lg font-bold text-nfw-blackberry font-ui">Edit Card Description</h3>
              <button
                onClick={handleCloseCardDescriptionModal}
                className="p-1 text-nfw-blackberry/50 hover:text-nfw-blackberry"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              <p className="text-sm text-nfw-blackberry/60 mb-4 font-sans">
                Editing: <span className="font-medium">{editingProduct.title}</span>
              </p>
              <div className="mb-4">
                <label className="block text-sm font-medium text-nfw-blackberry mb-2 font-sans">
                  Card Description <span className="text-nfw-blackberry/40">(shown on store cards, max 150 chars)</span>
                </label>
                <textarea
                  value={cardDescriptionInput}
                  onChange={(e) => setCardDescriptionInput(e.target.value.slice(0, 150))}
                  maxLength={150}
                  rows={4}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry resize-none font-sans"
                  placeholder="Enter a short description for the store card..."
                />
                <p className="text-xs text-nfw-blackberry/40 mt-1 text-right font-sans">
                  {cardDescriptionInput.length}/150
                </p>
              </div>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={handleCloseCardDescriptionModal}
                  className="px-4 py-2 text-sm font-medium text-nfw-blackberry/60 hover:text-nfw-blackberry font-ui"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveCardDescription}
                  disabled={savingCardDescription}
                  className="px-4 py-2 bg-nfw-aubergine text-white text-sm font-medium hover:bg-nfw-aubergine/90 disabled:opacity-50 font-ui"
                >
                  {savingCardDescription ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <MediaLibraryModal
        isOpen={mediaLibraryOpen}
        onClose={() => setMediaLibraryOpen(false)}
        onSelect={(url) => {
          setHeroImageUrl(url);
          setMediaLibraryOpen(false);
        }}
        bucket="page-builder"
      />
    </div>
  );
}
