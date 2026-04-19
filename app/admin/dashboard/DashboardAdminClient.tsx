"use client";

import { useState, useEffect } from "react";
import { Save, Plus, X, GripVertical } from "lucide-react";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";
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

type FeaturedItem = {
  id: string;
  type: "shopify_product" | "microgrant";
  title: string;
  image: string;
};

type DashboardSettings = {
  hero_image_url: string;
  featured_items: FeaturedItem[];
  square_image1_url: string;
  square_image1_link: string;
  square_image2_url: string;
  square_image2_link: string;
  square_image3_url: string;
  square_image3_link: string;
  badge_free_url: string;
  badge_contributing_url: string;
  badge_founding_url: string;
};

type ShopifyProduct = {
  shopifyProductId: string;
  title: string;
  imageUrl: string;
};

type GrantCycle = {
  id: string;
  cycle_name: string;
  featured_image: string;
};

function SortableFeaturedItem({
  item,
  onRemove,
}: {
  item: FeaturedItem;
  onRemove: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-white border border-nfw-blackberry/10 rounded-lg"
    >
      <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
        <GripVertical className="w-5 h-5 text-nfw-blackberry/30" />
      </button>
      <div className="w-12 h-12 bg-nfw-stone/10 flex-shrink-0 overflow-hidden rounded">
        {item.image ? (
          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-nfw-stone/30 text-xs">
            No Img
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-nfw-blackberry truncate">{item.title}</p>
        <p className="text-xs text-nfw-blackberry/50">{item.type === "shopify_product" ? "Zero Dollar Store" : "Microgrant"}</p>
      </div>
      <button onClick={onRemove} className="p-1 text-nfw-blackberry/30 hover:text-red-500">
        <X className="w-5 h-5" />
      </button>
    </div>
  );
}

export default function DashboardAdminClient() {
  const [settings, setSettings] = useState<DashboardSettings>({
    hero_image_url: "",
    featured_items: [],
    square_image1_url: "",
    square_image1_link: "",
    square_image2_url: "",
    square_image2_link: "",
    square_image3_url: "",
    square_image3_link: "",
    badge_free_url: "",
    badge_contributing_url: "",
    badge_founding_url: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [shopifyProducts, setShopifyProducts] = useState<ShopifyProduct[]>([]);
  const [grantCycles, setGrantCycles] = useState<GrantCycle[]>([]);

  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [grantsModalOpen, setGrantsModalOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    async function fetchData() {
      try {
        const [settingsRes, productsRes, grantsRes] = await Promise.all([
          fetch("/api/dashboard/settings"),
          fetch("/api/shopify/products?admin_view=true"),
          fetch("/api/admin/grants"),
        ]);

        const settingsData = await settingsRes.json();
        const productsData = await productsRes.json();
        const grantsData = await grantsRes.json();

        setSettings({
          hero_image_url: settingsData.hero_image_url || "",
          featured_items: settingsData.featured_items || [],
          square_image1_url: settingsData.square_image1_url || "",
          square_image1_link: settingsData.square_image1_link || "",
          square_image2_url: settingsData.square_image2_url || "",
          square_image2_link: settingsData.square_image2_link || "",
          square_image3_url: settingsData.square_image3_url || "",
          square_image3_link: settingsData.square_image3_link || "",
          badge_free_url: settingsData.badge_free_url || "",
          badge_contributing_url: settingsData.badge_contributing_url || "",
          badge_founding_url: settingsData.badge_founding_url || "",
        });

        if (Array.isArray(productsData)) {
          setShopifyProducts(productsData.slice(0, 20));
        }

        if (grantsData.cycles && Array.isArray(grantsData.cycles)) {
          setGrantCycles(grantsData.cycles);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/dashboard/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setMessage({ type: "success", text: "Settings saved successfully" });
      } else {
        setMessage({ type: "error", text: "Failed to save settings" });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to save settings" });
    } finally {
      setSaving(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = settings.featured_items.findIndex((i) => i.id === active.id);
    const newIndex = settings.featured_items.findIndex((i) => i.id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(settings.featured_items, oldIndex, newIndex);
    setSettings({ ...settings, featured_items: reordered });
  };

  const addShopifyProduct = (product: ShopifyProduct) => {
    if (settings.featured_items.length >= 5) {
      setMessage({ type: "error", text: "Maximum 5 featured items allowed" });
      return;
    }
    const newItem: FeaturedItem = {
      id: `shopify_${product.shopifyProductId}`,
      type: "shopify_product",
      title: product.title,
      image: product.imageUrl,
    };
    setSettings({
      ...settings,
      featured_items: [...settings.featured_items, newItem],
    });
    setProductsModalOpen(false);
  };

  const addGrantCycle = (cycle: GrantCycle) => {
    if (settings.featured_items.length >= 5) {
      setMessage({ type: "error", text: "Maximum 5 featured items allowed" });
      return;
    }
    const newItem: FeaturedItem = {
      id: `grant_${cycle.id}`,
      type: "microgrant",
      title: cycle.cycle_name,
      image: cycle.featured_image || "",
    };
    setSettings({
      ...settings,
      featured_items: [...settings.featured_items, newItem],
    });
    setGrantsModalOpen(false);
  };

  const removeFeaturedItem = (id: string) => {
    setSettings({
      ...settings,
      featured_items: settings.featured_items.filter((i) => i.id !== id),
    });
  };

  const openImageModal = (field: string) => {
    setModalOpen(field);
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-nfw-stone/20 w-1/3" />
          <div className="h-64 bg-nfw-stone/20" />
          <div className="h-32 bg-nfw-stone/20" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-nfw-dove min-h-screen">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-nfw-blackberry mb-2 font-serif">Manage Dashboard</h1>
            <p className="text-nfw-blackberry/60">Configure the member dashboard content and appearance</p>
          </div>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-3 bg-nfw-blackberry text-white font-medium hover:bg-nfw-blackberry/90 disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
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

        <div className="space-y-8">
          <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-nfw-blackberry/10">
              <h2 className="text-lg font-bold text-nfw-blackberry font-serif">Hero Image</h2>
            </div>
            <div className="p-6">
              <div className="border-2 border-dashed border-nfw-blackberry/20 p-8 text-center bg-nfw-dove/50">
                {settings.hero_image_url ? (
                  <div>
                    <img
                      src={settings.hero_image_url}
                      alt="Hero"
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <button
                      onClick={() => openImageModal("hero_image_url")}
                      className="mt-4 text-nfw-aubergine hover:underline"
                    >
                      Change Image
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openImageModal("hero_image_url")}
                    className="w-full py-8 text-nfw-blackberry/40 hover:text-nfw-aubergine transition-colors"
                  >
                    + Select Hero Image
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-nfw-blackberry/10">
              <h2 className="text-lg font-bold text-nfw-blackberry font-serif">Featured Items</h2>
              <p className="text-sm text-nfw-blackberry/60">Featured items shown in the "Popular across NFW" section (max 5)</p>
            </div>
            <div className="p-6">
              <div className="mb-4 flex gap-4">
                <button
                  onClick={() => setProductsModalOpen(true)}
                  disabled={settings.featured_items.length >= 5}
                  className="px-4 py-2 bg-nfw-aubergine text-white text-sm font-medium hover:bg-nfw-aubergine/90 disabled:opacity-50"
                >
                  + Add Zero Dollar Store Item
                </button>
                <button
                  onClick={() => setGrantsModalOpen(true)}
                  disabled={settings.featured_items.length >= 5}
                  className="px-4 py-2 bg-nfw-blackberry text-white text-sm font-medium hover:bg-nfw-blackberry/90 disabled:opacity-50"
                >
                  + Add Microgrant
                </button>
              </div>

              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext
                  items={settings.featured_items.map((i) => i.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {settings.featured_items.map((item) => (
                      <SortableFeaturedItem
                        key={item.id}
                        item={item}
                        onRemove={() => removeFeaturedItem(item.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {settings.featured_items.length === 0 && (
                <p className="text-center py-8 text-nfw-blackberry/40">No featured items added yet</p>
              )}
            </div>
          </div>

          <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-nfw-blackberry/10">
              <h2 className="text-lg font-bold text-nfw-blackberry font-serif">Membership Badge Images</h2>
              <p className="text-sm text-nfw-blackberry/60">Badge images displayed on member avatars</p>
            </div>
            <div className="p-6 grid grid-cols-3 gap-6">
              {[
                { key: "badge_free_url", label: "Free Member Badge" },
                { key: "badge_contributing_url", label: "Contributing Badge" },
                { key: "badge_founding_url", label: "Founding Badge" },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-nfw-blackberry mb-2">{label}</label>
                  <div className="border-2 border-dashed border-nfw-blackberry/20 p-4 text-center bg-nfw-dove/50">
                    {settings[key as keyof typeof settings] ? (
                      <div>
                        <img
                          src={settings[key as keyof typeof settings] as string}
                          alt={label}
                          className="max-h-24 mx-auto rounded"
                        />
                        <button
                          onClick={() => openImageModal(key)}
                          className="mt-2 text-sm text-nfw-aubergine hover:underline"
                        >
                          Change
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openImageModal(key)}
                        className="py-4 w-full text-nfw-blackberry/40 hover:text-nfw-aubergine transition-colors text-sm"
                      >
                        + Select Image
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-nfw-blackberry/10 overflow-hidden">
            <div className="px-6 py-4 border-b border-nfw-blackberry/10">
              <h2 className="text-lg font-bold text-nfw-blackberry font-serif">Bottom Section Square Images</h2>
              <p className="text-sm text-nfw-blackberry/60">Square images with links for the bottom action section</p>
            </div>
            <div className="p-6 space-y-6">
              {[1, 2, 3].map((num) => (
                <div key={num} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-nfw-blackberry mb-2">
                      Square {num} Image
                    </label>
                    <div className="border-2 border-dashed border-nfw-blackberry/20 p-4 text-center bg-nfw-dove/50">
                      {settings[`square_image${num}_url` as keyof typeof settings] ? (
                        <div>
                          <img
                            src={settings[`square_image${num}_url` as keyof typeof settings] as string}
                            alt={`Square ${num}`}
                            className="max-h-32 mx-auto rounded"
                          />
                          <button
                            onClick={() => openImageModal(`square_image${num}_url`)}
                            className="mt-2 text-sm text-nfw-aubergine hover:underline"
                          >
                            Change
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => openImageModal(`square_image${num}_url`)}
                          className="py-4 w-full text-nfw-blackberry/40 hover:text-nfw-aubergine transition-colors text-sm"
                        >
                          + Select Image
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-nfw-blackberry mb-2">
                      Square {num} Link
                    </label>
                    <input
                      type="text"
                      value={settings[`square_image${num}_link` as keyof typeof settings] as string}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          [`square_image${num}_link`]: e.target.value,
                        })
                      }
                      placeholder="https://..."
                      className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <MediaLibraryModal
        isOpen={modalOpen !== null}
        onClose={() => setModalOpen(null)}
        onSelect={(url) => {
          if (modalOpen) {
            setSettings({ ...settings, [modalOpen]: url });
          }
          setModalOpen(null);
        }}
        bucket="page-builder"
      />

      {productsModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-nfw-blackberry/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-nfw-blackberry">Select Zero Dollar Store Item</h3>
              <button onClick={() => setProductsModalOpen(false)} className="text-nfw-blackberry/50 hover:text-nfw-blackberry">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="grid grid-cols-2 gap-4">
                {shopifyProducts.map((product) => (
                  <button
                    key={product.shopifyProductId}
                    onClick={() => addShopifyProduct(product)}
                    className="flex items-center gap-3 p-3 border border-nfw-blackberry/10 rounded-lg hover:border-nfw-aubergine text-left"
                  >
                    <div className="w-16 h-16 bg-nfw-stone/10 flex-shrink-0 overflow-hidden rounded">
                      {product.imageUrl ? (
                        <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-nfw-stone/30 text-xs">No Img</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-nfw-blackberry truncate">{product.title}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {grantsModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-nfw-blackberry/10 flex items-center justify-between">
              <h3 className="text-lg font-bold text-nfw-blackberry">Select Microgrant</h3>
              <button onClick={() => setGrantsModalOpen(false)} className="text-nfw-blackberry/50 hover:text-nfw-blackberry">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {grantCycles.map((cycle) => (
                  <button
                    key={cycle.id}
                    onClick={() => addGrantCycle(cycle)}
                    className="w-full flex items-center gap-3 p-3 border border-nfw-blackberry/10 rounded-lg hover:border-nfw-aubergine text-left"
                  >
                    <div className="w-16 h-16 bg-nfw-stone/10 flex-shrink-0 overflow-hidden rounded">
                      {cycle.featured_image ? (
                        <img src={cycle.featured_image} alt={cycle.cycle_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-nfw-stone/30 text-xs">No Img</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-nfw-blackberry">{cycle.cycle_name}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
