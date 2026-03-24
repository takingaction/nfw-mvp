"use client";

import { useState } from "react";
import { Plus, Trash2, Save, Upload, GripVertical,Indent,Outdent } from "lucide-react";
import { uploadImage } from "@/lib/upload";
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

interface NavLink {
  label: string;
  url: string;
  indent: number;
}

interface HeaderData {
  id: string;
  logo_url: string | null;
  nav_links: NavLink[];
  cta_label: string | null;
  cta_url: string | null;
  donate_label: string | null;
  donate_url: string | null;
}

function SortableLink({
  link,
  index,
  onUpdate,
  onDelete,
  onIndent,
  onOutdent,
  canIndent,
  canOutdent,
}: {
  link: NavLink;
  index: number;
  onUpdate: (key: keyof NavLink, value: string | number) => void;
  onDelete: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  canIndent: boolean;
  canOutdent: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `nav-${index}` });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2"
    >
      <button
        {...attributes}
        {...listeners}
        className="p-1 text-nfw-blackberry/30 hover:text-nfw-blackberry/60 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5" />
      </button>
      <div
        className="flex-1 flex items-center gap-2"
        style={{ paddingLeft: `${link.indent * 24}px` }}
      >
        {link.indent > 0 && (
          <span className="text-nfw-blackberry/30 text-xs font-mono">└</span>
        )}
        <input
          type="text"
          value={link.label}
          onChange={(e) => onUpdate("label", e.target.value)}
          placeholder="Label"
          className="px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry flex-1"
        />
        <input
          type="text"
          value={link.url}
          onChange={(e) => onUpdate("url", e.target.value)}
          placeholder="URL"
          className="px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry flex-1"
        />
        <button
          onClick={onOutdent}
          disabled={!canOutdent}
          className="p-1.5 text-nfw-blackberry/40 hover:text-nfw-blackberry disabled:opacity-30 transition-colors"
          title="Outdent"
        >
          <Outdent className="w-4 h-4" />
        </button>
        <button
          onClick={onIndent}
          disabled={!canIndent}
          className="p-1.5 text-nfw-blackberry/40 hover:text-nfw-blackberry disabled:opacity-30 transition-colors"
          title="Indent"
        >
          <Indent className="w-4 h-4" />
        </button>
        <button
          onClick={onDelete}
          className="p-1.5 text-nfw-blackberry/40 hover:text-red-500 hover:bg-red-50 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default function HeaderEditorClient({
  initialData,
}: {
  initialData: HeaderData | null;
}) {
  const [logoUrl, setLogoUrl] = useState(initialData?.logo_url ?? "");
  const [navLinks, setNavLinks] = useState<NavLink[]>(
    (initialData?.nav_links ?? []).map((l) => ({
      label: l.label || (l as any).label || "",
      url: l.url || (l as any).url || "",
      indent: l.indent ?? (l as any).highlight ? 1 : 0,
    })),
  );
  const [ctaLabel, setCtaLabel] = useState(initialData?.cta_label ?? "");
  const [ctaUrl, setCtaUrl] = useState(initialData?.cta_url ?? "");
  const [donateLabel, setDonateLabel] = useState(initialData?.donate_label ?? "");
  const [donateUrl, setDonateUrl] = useState(initialData?.donate_url ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const addLink = () => {
    setNavLinks([...navLinks, { label: "", url: "", indent: 0 }]);
  };

  const updateLink = (index: number, key: keyof NavLink, value: string | number) => {
    setNavLinks(
      navLinks.map((l, i) => (i === index ? { ...l, [key]: value } : l)),
    );
  };

  const removeLink = (index: number) => {
    setNavLinks(navLinks.filter((_, i) => i !== index));
  };

  const indentLink = (index: number) => {
    if (index === 0) return;
    const prevIndent = navLinks[index - 1].indent;
    setNavLinks(
      navLinks.map((l, i) =>
        i === index ? { ...l, indent: Math.min(l.indent + 1, 1) } : l,
      ),
    );
  };

  const outdentLink = (index: number) => {
    setNavLinks(
      navLinks.map((l, i) =>
        i === index ? { ...l, indent: Math.max(l.indent - 1, 0) } : l,
      ),
    );
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = parseInt((active.id as string).replace("nav-", ""));
    const newIndex = parseInt((over.id as string).replace("nav-", ""));

    setNavLinks(arrayMove(navLinks, oldIndex, newIndex));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/header", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: initialData?.id,
          singleton: true,
          logo_url: logoUrl,
          nav_links: navLinks,
          cta_label: ctaLabel,
          cta_url: ctaUrl,
          donate_label: donateLabel,
          donate_url: donateUrl,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      showToast("Header saved");
    } catch (err) {
      showToast("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Logo */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry mb-4 font-ui">Logo</h2>

        {logoUrl && (
          <div className="relative mb-3 group inline-block">
            <img
              src={logoUrl}
              alt="Logo preview"
              className="h-12 object-contain"
            />
            <button
              onClick={() => setLogoUrl("")}
              className="absolute -top-2 -right-2 bg-red-500 text-white w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        )}

        <label className="block cursor-pointer mb-2">
          <div className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-nfw-blackberry/20 hover:border-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors">
            <Upload className="w-4 h-4 text-nfw-blackberry/40" />
            <span className="text-sm text-nfw-blackberry/50">
              {logoUrl ? "Replace logo" : "Upload logo"}
            </span>
          </div>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              try {
                const url = await uploadImage(file, "logos");
                setLogoUrl(url);
              } catch (err) {
                alert("Upload failed: " + (err as Error).message);
              }
            }}
          />
        </label>

        <input
          type="text"
          value={logoUrl}
          onChange={(e) => setLogoUrl(e.target.value)}
          placeholder="Or paste a URL directly"
          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry text-nfw-blackberry/40"
        />
      </div>

      {/* Nav links */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry mb-4 font-ui">Navigation Links</h2>
        <p className="text-sm text-nfw-blackberry/60 mb-4">
          Drag to reorder. Use indent/outdent to create sub-items.
        </p>
        <div className="space-y-2 mb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={navLinks.map((_, i) => `nav-${i}`)}
              strategy={verticalListSortingStrategy}
            >
              {navLinks.map((link, i) => (
                <SortableLink
                  key={`nav-${i}`}
                  link={link}
                  index={i}
                  onUpdate={(key, value) => updateLink(i, key as keyof NavLink, value as string | number)}
                  onDelete={() => removeLink(i)}
                  onIndent={() => indentLink(i)}
                  onOutdent={() => outdentLink(i)}
                  canIndent={i > 0 && link.indent < 1}
                  canOutdent={link.indent > 0}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
        <button
          onClick={addLink}
          className="flex items-center gap-2 text-sm font-semibold text-nfw-blackberry hover:opacity-70 transition-opacity"
        >
          <Plus className="w-4 h-4" />
          Add Link
        </button>
      </div>

      {/* CTA button */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry mb-4 font-ui">CTA Button</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Label
            </label>
            <input
              type="text"
              value={ctaLabel}
              onChange={(e) => setCtaLabel(e.target.value)}
              placeholder="e.g. Join Today"
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              URL
            </label>
            <input
              type="text"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="/auth/sign-up"
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
            />
          </div>
        </div>
      </div>

      {/* Donate button */}
      <div className="bg-white border border-nfw-blackberry/10 p-6">
        <h2 className="font-black text-nfw-blackberry mb-4 font-ui">Donate Button</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              Label
            </label>
            <input
              type="text"
              value={donateLabel}
              onChange={(e) => setDonateLabel(e.target.value)}
              placeholder="e.g. Donate"
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
            />
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
              URL
            </label>
            <input
              type="text"
              value={donateUrl}
              onChange={(e) => setDonateUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
            />
          </div>
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-nfw-blackberry text-white font-bold hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-colors"
      >
        <Save className="w-4 h-4" />
        {saving ? "Saving..." : "Save Header"}
      </button>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-nfw-blackberry text-white px-6 py-3 text-sm font-semibold shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
