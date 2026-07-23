"use client";

import { useState, useEffect, useCallback } from "react";
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
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Plus, Pencil, Trash2, GripVertical, X, Check, ChevronDown, ChevronUp, Link, ExternalLink, Save } from "lucide-react";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";

type CollectionItem = {
  id: string;
  collection_id: string;
  item_type: "access_perk" | "nfw_perk";
  item_identifier: string;
  display_order: number;
  created_at: string;
};

type Collection = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  is_active: boolean;
  is_admin_only: boolean;
  display_order: number;
  items: CollectionItem[];
  created_at: string;
  updated_at: string;
};

export default function AdminPerkCollections() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [showAddItemModal, setShowAddItemModal] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | null>(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNfwExclusive, setShowNfwExclusive] = useState(false);
  const [savingNfwExclusive, setSavingNfwExclusive] = useState(false);

  // Banner settings state
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [heroHeading, setHeroHeading] = useState("Member Perks");
  const [heroSubheading, setHeroSubheading] = useState("Exclusive discounts and offers for NFW members");
  const [heroTestMode, setHeroTestMode] = useState(false);
  const [savingBanner, setSavingBanner] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [mediaLibraryOpen, setMediaLibraryOpen] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    is_active: true,
    is_admin_only: false,
  });

  const [itemUrl, setItemUrl] = useState("");
  const [itemPreview, setItemPreview] = useState<{ type: string; identifier: string } | null>(null);
  const [addingItem, setAddingItem] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchCollections();
    fetchSiteSettings();
    fetchPerksBannerSettings();
  }, []);

  async function fetchSiteSettings() {
    try {
      const res = await fetch("/api/site/settings");
      const data = await res.json();
      setShowNfwExclusive(data.show_nfw_exclusive_button || false);
    } catch (err) {
      console.error("Failed to fetch site settings:", err);
    }
  }

  async function fetchPerksBannerSettings() {
    try {
      const res = await fetch("/api/perks/settings");
      const data = await res.json();
      if (data) {
        setHeroImageUrl(data.hero_image_url || "");
        setHeroHeading(data.hero_heading || "Member Perks");
        setHeroSubheading(data.hero_subheading || "Exclusive discounts and offers for NFW members");
        setHeroTestMode(data.is_test_mode || false);
      }
    } catch (err) {
      console.error("Failed to fetch perks banner settings:", err);
    }
  }

  const handleSaveBanner = async () => {
    setSavingBanner(true);
    setBannerSaved(false);
    try {
      const res = await fetch("/api/perks/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hero_image_url: heroImageUrl || null,
          hero_heading: heroHeading,
          hero_subheading: heroSubheading,
          is_test_mode: heroTestMode,
        }),
      });
      if (res.ok) {
        setBannerSaved(true);
        setTimeout(() => setBannerSaved(false), 3000);
      }
    } catch {
      console.error("Failed to save banner settings");
    } finally {
      setSavingBanner(false);
    }
  };

  async function handleToggleNfwExclusive() {
    setSavingNfwExclusive(true);
    try {
      const res = await fetch("/api/site/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ show_nfw_exclusive_button: !showNfwExclusive }),
      });
      if (res.ok) {
        setShowNfwExclusive(!showNfwExclusive);
      }
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setSavingNfwExclusive(false);
    }
  }

  async function fetchCollections() {
    try {
      const res = await fetch("/api/admin/perk-collections");
      const data = await res.json();
      if (data.collections) {
        setCollections(data.collections);
      }
    } catch (err) {
      console.error("Error fetching collections:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingCollection(null);
    setFormData({ name: "", slug: "", description: "", is_active: true, is_admin_only: false });
    setError(null);
    setShowCollectionModal(true);
  }

  function openEditModal(collection: Collection) {
    setEditingCollection(collection);
    setFormData({
      name: collection.name,
      slug: collection.slug || "",
      description: collection.description || "",
      is_active: collection.is_active,
      is_admin_only: collection.is_admin_only,
    });
    setError(null);
    setShowCollectionModal(true);
  }

  function openAddItemModal(collectionId: string) {
    setSelectedCollectionId(collectionId);
    setItemUrl("");
    setItemPreview(null);
    setError(null);
    setShowAddItemModal(true);
  }

  function toggleExpand(collectionId: string) {
    setExpandedCollections((prev) => {
      const next = new Set(prev);
      if (next.has(collectionId)) {
        next.delete(collectionId);
      } else {
        next.add(collectionId);
      }
      return next;
    });
  }

  function parseItemUrl(url: string) {
    if (!url) {
      setItemPreview(null);
      return;
    }

    // Try to parse as URL first
    let identifier: string | null = null;
    let type: string | null = null;

    try {
      const parsed = new URL(url, "https://nationalfundforwomen.org");
      const path = parsed.pathname;

      const nfwMatch = path.match(/^\/perks\/nfw\/([^\/]+)$/);
      if (nfwMatch) {
        type = "NFW Perk";
        identifier = nfwMatch[1];
      } else {
        const accessMatch = path.match(/^\/perks\/([^\/]+)$/);
        if (accessMatch) {
          type = "Access Perk";
          identifier = accessMatch[1];
        }
      }
    } catch {
      // Try regex on raw URL
      const nfwMatch = url.match(/\/perks\/nfw\/([^\/]+)/);
      if (nfwMatch) {
        type = "NFW Perk";
        identifier = nfwMatch[1];
      } else {
        const accessMatch = url.match(/\/perks\/([^\/]+)/);
        if (accessMatch) {
          type = "Access Perk";
          identifier = accessMatch[1];
        }
      }
    }

    if (type && identifier) {
      setItemPreview({ type, identifier });
    } else {
      setItemPreview(null);
    }
  }

  async function handleSaveCollection() {
    if (!formData.name.trim()) {
      setError("Name is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      if (editingCollection) {
        // Update existing
        const res = await fetch(`/api/admin/perk-collections/${editingCollection.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to update collection");
          return;
        }
      } else {
        // Create new
        const res = await fetch("/api/admin/perk-collections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(formData),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error || "Failed to create collection");
          return;
        }
      }

      setShowCollectionModal(false);
      fetchCollections();
    } catch (err) {
      setError("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddItem() {
    if (!selectedCollectionId || !itemPreview) {
      setError("Please enter a valid perk URL");
      return;
    }

    setAddingItem(true);
    setError(null);

    try {
      // Build the URL
      const baseUrl = itemPreview.type === "NFW Perk"
        ? `/perks/nfw/${itemPreview.identifier}`
        : `/perks/${itemPreview.identifier}`;

      const res = await fetch(`/api/admin/perk-collections/${selectedCollectionId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: baseUrl }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to add item");
        return;
      }

      setShowAddItemModal(false);
      fetchCollections();
    } catch (err) {
      setError("An error occurred");
    } finally {
      setAddingItem(false);
    }
  }

  async function handleDeleteCollection(collectionId: string) {
    if (!confirm("Are you sure you want to delete this collection? This cannot be undone.")) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/perk-collections/${collectionId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to delete collection");
        return;
      }
      fetchCollections();
    } catch (err) {
      alert("An error occurred");
    }
  }

  async function handleDeleteItem(collectionId: string, itemId: string) {
    try {
      const res = await fetch(`/api/admin/perk-collections/${collectionId}/items`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to remove item");
        return;
      }
      fetchCollections();
    } catch (err) {
      alert("An error occurred");
    }
  }

  async function handleToggleActive(collection: Collection) {
    try {
      const res = await fetch(`/api/admin/perk-collections/${collection.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !collection.is_active }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Failed to update collection");
        return;
      }
      fetchCollections();
    } catch (err) {
      alert("An error occurred");
    }
  }

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      console.log("[handleDragEnd] active:", active.id, "over:", over?.id);
      if (!over || active.id === over.id) return;

      const oldIndex = collections.findIndex((c) => c.id === active.id);
      const newIndex = collections.findIndex((c) => c.id === over.id);
      console.log("[handleDragEnd] oldIndex:", oldIndex, "newIndex:", newIndex);

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(collections, oldIndex, newIndex);
      setCollections(reordered);

      // Persist to server
      try {
        const res = await fetch("/api/admin/perk-collections/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderedIds: reordered.map((c) => c.id) }),
        });
        console.log("[handleDragEnd] Server response:", res.status);
      } catch (err) {
        console.error("Failed to persist reorder:", err);
      }
    },
    [collections]
  );

  async function handleItemDragEnd(collectionId: string, event: DragEndEvent, items: CollectionItem[]) {
    const { active, over } = event;
    console.log("[handleItemDragEnd] active:", active.id, "over:", over?.id);
    if (!over || active.id === over.id) return;

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    console.log("[handleItemDragEnd] oldIndex:", oldIndex, "newIndex:", newIndex);

    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(items, oldIndex, newIndex);

    // Update local state
    setCollections((prev) =>
      prev.map((c) =>
        c.id === collectionId ? { ...c, items: reordered } : c
      )
    );

    // Persist to server
    try {
      const res = await fetch(`/api/admin/perk-collections/${collectionId}/items/reorder`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderedIds: reordered.map((i) => i.id) }),
      });
      console.log("[handleItemDragEnd] Server response:", res.status);
    } catch (err) {
      console.error("Failed to persist item reorder:", err);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-nfw-blackberry/60">Loading...</div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-nfw-blackberry">Perk Collections</h1>
          <p className="text-sm text-nfw-blackberry/60 mt-1">
            Create collections to group Access Perks and NFW Perks together
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-ui text-nfw-blackberry/60">NFW Exclusive:</span>
            <button
              onClick={handleToggleNfwExclusive}
              disabled={savingNfwExclusive}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                showNfwExclusive ? "bg-nfw-aubergine" : "bg-nfw-stone/30"
              } disabled:opacity-50`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  showNfwExclusive ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-nfw-aubergine text-white font-ui font-medium text-sm rounded-lg hover:bg-nfw-aubergine/90"
          >
            <Plus className="w-4 h-4" />
            Create Collection
          </button>
        </div>
      </div>

      {/* Banner Settings Section */}
      <div className="bg-white border border-nfw-blackberry/10 overflow-hidden mb-8">
        <div className="px-6 py-5 border-b border-nfw-blackberry/10">
          <h2 className="text-lg font-bold text-nfw-blackberry font-ui mb-4">Banner Settings</h2>
          <p className="text-nfw-blackberry/50 text-sm mb-4">
            Configure the hero banner at the top of the Member Perks page.
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
                      alt="Banner preview"
                      className="w-full h-32 object-cover rounded"
                    />
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => setMediaLibraryOpen(true)}
                        className="text-sm text-nfw-aubergine hover:underline"
                      >
                        Change Image
                      </button>
                      <button
                        onClick={() => setHeroImageUrl("")}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
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
              <div className="flex items-center gap-3 pt-4">
                <input
                  type="checkbox"
                  id="heroTestMode"
                  checked={heroTestMode}
                  onChange={(e) => setHeroTestMode(e.target.checked)}
                  className="w-4 h-4 rounded border-nfw-blackberry/30 text-nfw-aubergine focus:ring-nfw-aubergine"
                />
                <label htmlFor="heroTestMode" className="text-sm font-medium text-nfw-blackberry cursor-pointer">
                  Test Mode (hidden from non-admin users)
                </label>
              </div>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-4">
            <button
              onClick={handleSaveBanner}
              disabled={savingBanner}
              className="flex items-center gap-2 px-4 py-2 bg-nfw-blackberry text-white text-sm font-medium hover:bg-nfw-blackberry/90 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {savingBanner ? "Saving..." : "Save Banner Settings"}
            </button>
            {bannerSaved && (
              <span className="text-sm text-green-600 font-medium">Saved!</span>
            )}
          </div>
        </div>
      </div>

      {collections.length === 0 ? (
        <div className="bg-nfw-dove rounded-lg p-12 text-center">
          <p className="text-nfw-blackberry/60">No collections yet. Create your first collection to get started.</p>
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
        >
          <SortableContext items={collections.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-4">
              {collections.map((collection) => (
                <SortableCollectionCard
                  key={collection.id}
                  collection={collection}
                  isExpanded={expandedCollections.has(collection.id)}
                  onToggleExpand={() => toggleExpand(collection.id)}
                  onEdit={() => openEditModal(collection)}
                  onDelete={() => handleDeleteCollection(collection.id)}
                  onToggleActive={() => handleToggleActive(collection)}
                  onAddItem={() => openAddItemModal(collection.id)}
                  onDeleteItem={(itemId) => handleDeleteItem(collection.id, itemId)}
                  onItemDragEnd={(event, items) => handleItemDragEnd(collection.id, event, items)}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Create/Edit Collection Modal */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-nfw-blackberry/10">
              <h2 className="text-lg font-serif font-bold text-nfw-blackberry">
                {editingCollection ? "Edit Collection" : "Create Collection"}
              </h2>
              <button onClick={() => setShowCollectionModal(false)} className="p-1 hover:bg-nfw-stone/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
              )}
              <div>
                <label className="block text-sm font-ui font-medium text-nfw-blackberry mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    setFormData((prev) => {
                      // Auto-generate slug from name if slug hasn't been manually edited
                      const baseSlug = prev.name
                        .toLowerCase()
                        .replace(/[^a-z0-9\s-]/g, '')
                        .replace(/\s+/g, '-')
                        .replace(/-+/g, '-')
                        .trim();
                      const newSlug = prev.slug?.startsWith(baseSlug) || !prev.slug
                        ? `${baseSlug}-${prev.slug?.split('-').pop() || Math.random().toString(36).substring(2, 6)}`
                        : prev.slug;
                      return {
                        ...prev,
                        name: newName,
                        slug: prev.slug || newSlug,
                      };
                    });
                  }}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg font-ui text-sm focus:outline-none focus:ring-2 focus:ring-nfw-aubergine/30"
                  placeholder="e.g., Summer Savings, Member Exclusive"
                />
              </div>
              <div>
                <label className="block text-sm font-ui font-medium text-nfw-blackberry mb-1">
                  URL Slug
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData((prev) => ({ ...prev, slug: e.target.value }))}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg font-ui text-sm focus:outline-none focus:ring-2 focus:ring-nfw-aubergine/30"
                  placeholder="e.g., summer-savings-ab12"
                />
                <p className="text-xs text-nfw-blackberry/50 mt-1">
                  Auto-generated from name. Edit to customize.
                </p>
              </div>
              <div>
                <label className="block text-sm font-ui font-medium text-nfw-blackberry mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-nfw-blackberry/20 rounded-lg font-ui text-sm focus:outline-none focus:ring-2 focus:ring-nfw-aubergine/30 resize-none"
                  rows={3}
                  placeholder="Optional description shown to members"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="w-4 h-4 text-nfw-aubergine border-nfw-blackberry/30 rounded focus:ring-nfw-aubergine/30"
                />
                <label htmlFor="is_active" className="text-sm font-ui text-nfw-blackberry">
                  Active (visible to members)
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_admin_only"
                  checked={formData.is_admin_only}
                  onChange={(e) => setFormData((prev) => ({ ...prev, is_admin_only: e.target.checked }))}
                  className="w-4 h-4 text-nfw-aubergine border-nfw-blackberry/30 rounded focus:ring-nfw-aubergine/30"
                />
                <label htmlFor="is_admin_only" className="text-sm font-ui text-nfw-blackberry">
                  Admin only (hidden from public)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-nfw-blackberry/10">
              <button
                onClick={() => setShowCollectionModal(false)}
                className="px-4 py-2 text-sm font-ui font-medium text-nfw-blackberry hover:bg-nfw-stone/20 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCollection}
                disabled={saving}
                className="px-4 py-2 bg-nfw-aubergine text-white text-sm font-ui font-medium rounded-lg hover:bg-nfw-aubergine/90 disabled:opacity-50"
              >
                {saving ? "Saving..." : editingCollection ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Item Modal */}
      {showAddItemModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-nfw-blackberry/10">
              <h2 className="text-lg font-serif font-bold text-nfw-blackberry">Add Perk to Collection</h2>
              <button onClick={() => setShowAddItemModal(false)} className="p-1 hover:bg-nfw-stone/20 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
              )}
              <div>
                <label className="block text-sm font-ui font-medium text-nfw-blackberry mb-1">
                  Perk URL <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nfw-blackberry/40" />
                  <input
                    type="text"
                    value={itemUrl}
                    onChange={(e) => {
                      setItemUrl(e.target.value);
                      parseItemUrl(e.target.value);
                    }}
                    className="w-full pl-10 pr-3 py-2 border border-nfw-blackberry/20 rounded-lg font-ui text-sm focus:outline-none focus:ring-2 focus:ring-nfw-aubergine/30"
                    placeholder="/perks/12345 or /perks/nfw/summer-sale"
                  />
                </div>
                <p className="text-xs text-nfw-blackberry/50 mt-1">
                  Paste the full perk URL or the relative path
                </p>
              </div>
              {itemPreview && (
                <div className="p-3 bg-nfw-wisteria/10 border border-nfw-wisteria/30 rounded-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-nfw-wisteria" />
                    <span className="font-ui font-medium text-nfw-blackberry">
                      {itemPreview.type}
                    </span>
                    <span className="text-nfw-blackberry/60">
                      — {itemPreview.identifier}
                    </span>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 p-4 border-t border-nfw-blackberry/10">
              <button
                onClick={() => setShowAddItemModal(false)}
                className="px-4 py-2 text-sm font-ui font-medium text-nfw-blackberry hover:bg-nfw-stone/20 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleAddItem}
                disabled={addingItem || !itemPreview}
                className="px-4 py-2 bg-nfw-aubergine text-white text-sm font-ui font-medium rounded-lg hover:bg-nfw-aubergine/90 disabled:opacity-50"
              >
                {addingItem ? "Adding..." : "Add to Collection"}
              </button>
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

function SortableCollectionCard({
  collection,
  isExpanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleActive,
  onAddItem,
  onDeleteItem,
  onItemDragEnd,
}: {
  collection: Collection;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleActive: () => void;
  onAddItem: () => void;
  onDeleteItem: (itemId: string) => void;
  onItemDragEnd: (event: DragEndEvent, items: CollectionItem[]) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: collection.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-xl border border-nfw-blackberry/10 overflow-hidden ${
        isDragging ? "shadow-lg" : ""
      }`}
    >
      <div className="flex items-center gap-3 p-4">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab p-1 hover:bg-nfw-stone/20 rounded"
        >
          <GripVertical className="w-5 h-5 text-nfw-blackberry/40" />
        </button>

        <div className="flex-1">
            <div className="flex items-center gap-2">
            <h3 className="font-serif font-bold text-nfw-blackberry">{collection.name}</h3>
            {!collection.is_active && (
              <span className="px-2 py-0.5 bg-nfw-stone/40 text-nfw-blackberry/60 text-xs font-ui rounded">
                Inactive
              </span>
            )}
            {collection.is_admin_only && (
              <span className="px-2 py-0.5 bg-nfw-aubergine/20 text-nfw-aubergine text-xs font-ui rounded">
                Admin Only
              </span>
            )}
          </div>
          {collection.description && (
            <p className="text-sm text-nfw-blackberry/60 mt-0.5">{collection.description}</p>
          )}
          <p className="text-xs text-nfw-blackberry/40 mt-1">
            {collection.items.length} item{collection.items.length !== 1 ? "s" : ""}
          </p>
          {collection.slug && (
            <p className="text-xs text-nfw-wisteria mt-0.5 font-mono">
              /perks?collection={collection.slug}
            </p>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onToggleActive}
            className={`px-3 py-1 text-xs font-ui font-medium rounded-lg ${
              collection.is_active
                ? "bg-green-100 text-green-700"
                : "bg-nfw-stone/20 text-nfw-blackberry/60"
            }`}
          >
            {collection.is_active ? "Active" : "Inactive"}
          </button>
          <button
            onClick={onToggleExpand}
            className="p-2 hover:bg-nfw-stone/20 rounded-lg"
          >
            {isExpanded ? (
              <ChevronUp className="w-5 h-5 text-nfw-blackberry/60" />
            ) : (
              <ChevronDown className="w-5 h-5 text-nfw-blackberry/60" />
            )}
          </button>
          <button onClick={onEdit} className="p-2 hover:bg-nfw-stone/20 rounded-lg">
            <Pencil className="w-4 h-4 text-nfw-blackberry/60" />
          </button>
          <button onClick={onDelete} className="p-2 hover:bg-red-50 rounded-lg">
            <Trash2 className="w-4 h-4 text-red-500" />
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-nfw-blackberry/10 bg-nfw-dove/50">
          <div className="p-4">
            {collection.items.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-sm text-nfw-blackberry/60 mb-2">No items in this collection yet</p>
                <button
                  onClick={onAddItem}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-ui font-medium text-nfw-aubergine bg-nfw-aubergine/10 hover:bg-nfw-aubergine/20 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add First Item
                </button>
              </div>
            ) : (
              <>
                <DndContext
                  sensors={itemSensors}
                  collisionDetection={closestCenter}
                  onDragEnd={(event) => onItemDragEnd(event, collection.items)}
                  modifiers={[restrictToVerticalAxis]}
                >
                  <SortableContext items={collection.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
                    <div className="space-y-2">
                      {collection.items.map((item) => (
                        <SortableItemRow
                          key={item.id}
                          item={item}
                          onDelete={() => onDeleteItem(item.id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
                <button
                  onClick={onAddItem}
                  className="mt-3 inline-flex items-center gap-1 px-3 py-1.5 text-sm font-ui font-medium text-nfw-aubergine bg-nfw-aubergine/10 hover:bg-nfw-aubergine/20 rounded-lg"
                >
                  <Plus className="w-4 h-4" />
                  Add Item
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function SortableItemRow({
  item,
  onDelete,
}: {
  item: CollectionItem;
  onDelete: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const itemUrl = item.item_type === "nfw_perk"
    ? `/perks/nfw/${item.item_identifier}`
    : `/perks/${item.item_identifier}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-2 p-2 bg-white rounded-lg border border-nfw-blackberry/10 ${
        isDragging ? "shadow-md" : ""
      }`}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab p-1 hover:bg-nfw-stone/20 rounded"
      >
        <GripVertical className="w-4 h-4 text-nfw-blackberry/40" />
      </button>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 text-xs font-ui rounded ${
            item.item_type === "nfw_perk"
              ? "bg-nfw-aubergine/10 text-nfw-aubergine"
              : "bg-nfw-wisteria/10 text-nfw-wisteria"
          }`}>
            {item.item_type === "nfw_perk" ? "NFW Perk" : "Access Perk"}
          </span>
          <span className="text-sm font-mono text-nfw-blackberry/80 truncate">
            {item.item_identifier}
          </span>
        </div>
        <a
          href={itemUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-nfw-blackberry/40 hover:text-nfw-aubergine flex items-center gap-1 mt-0.5"
        >
          {itemUrl}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      <button
        onClick={onDelete}
        className="p-1.5 hover:bg-red-50 rounded-lg flex-shrink-0"
      >
        <X className="w-4 h-4 text-red-500" />
      </button>
    </div>
  );
}
