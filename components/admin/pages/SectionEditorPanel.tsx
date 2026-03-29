"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import { X, Upload, Check } from "lucide-react";
import { PageSection } from "@/lib/sections/types";
import { SECTION_REGISTRY, EditorField } from "@/lib/sections/registry";
import { uploadImage } from "@/lib/upload";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";

function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

interface Props {
  section: PageSection;
  onSave: (content: Record<string, unknown>) => void;
  onClose: () => void;
  saving: boolean;
}

function FieldEditor({
  field,
  value,
  onChange,
  openMediaLibrary,
}: {
  field: EditorField;
  value: unknown;
  onChange: (val: unknown) => void;
  openMediaLibrary?: (bucket: string, fieldKey: string) => void;
}) {
  if (field.type === "text" || field.type === "url") {
    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
          {field.label}
        </label>
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
        />
      </div>
    );
  }

  if (field.type === "textarea" || field.type === "richtext") {
    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
          {field.label}
        </label>
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors resize-none"
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
          {field.label}
        </label>
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
        >
          {field.options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  if (field.type === "image") {
    console.log("[DEBUG] FieldEditor image field, openMediaLibrary is:", typeof openMediaLibrary, "field:", field.key);
    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
          {field.label}
        </label>

        {typeof value === "string" && value && isValidUrl(value) && (
          <div className="relative mb-2 group w-full h-40 overflow-hidden">
            <Image
              src={value as string}
              alt=""
              fill
              className="object-cover"
            />
            <button
              onClick={() => onChange("")}
              className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => { 
            console.log("[DEBUG] Add Image clicked, openMediaLibrary:", openMediaLibrary, "field:", field.key); 
            if (openMediaLibrary) {
              openMediaLibrary("page-builder", field.key);
            }
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-nfw-blackberry/20 hover:border-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
        >
          <Upload className="w-4 h-4 text-nfw-blackberry/40" />
          <span className="text-sm text-nfw-blackberry/50">
            {value ? "Replace image" : "Add image"}
          </span>
        </button>

        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste a URL directly"
          className="mt-2 w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors text-nfw-blackberry/40"
        />
      </div>
    );
  }

  if (field.type === "video") {
    const fileInputRef = { current: null as HTMLInputElement | null };

    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
          {field.label}
        </label>

        {typeof value === "string" && value && isValidUrl(value) && (
          <div className="relative mb-2 group w-full h-40 bg-nfw-blackberry/10 rounded overflow-hidden">
            <video
              src={value as string}
              className="w-full h-full object-cover"
              muted
              playsInline
            />
            <button
              onClick={() => onChange("")}
              className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-nfw-blackberry/20 hover:border-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
        >
          <Upload className="w-4 h-4 text-nfw-blackberry/40" />
          <span className="text-sm text-nfw-blackberry/50">
            {value ? "Replace video" : "Upload video"}
          </span>
        </button>

        <input
          ref={(el) => {
            fileInputRef.current = el;
          }}
          type="file"
          accept="video/mp4,video/webm,video/ogg"
          className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
              const url = await uploadImage(file, "sections");
              onChange(url);
            } catch (err) {
              console.error("Upload error:", err);
              alert("Upload failed: " + (err as Error).message);
            }
          }}
        />

        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Or paste a video URL directly"
          className="mt-2 w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors text-nfw-blackberry/40"
        />
      </div>
    );
  }

  if (field.type === "string-array") {
    const arr = (value as string[]) ?? [];

    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-2">
          {field.label}
        </label>
        <div className="space-y-2">
          {arr.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <input
                type="text"
                value={item}
                onChange={(e) => {
                  const updated = arr.map((v, i) =>
                    i === index ? e.target.value : v,
                  );
                  onChange(updated);
                }}
                className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors"
              />
              <button
                onClick={() => onChange(arr.filter((_, i) => i !== index))}
                className="text-xs px-2 py-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange([...arr, ""])}
            className="w-full py-2 border-2 border-dashed border-nfw-blackberry/20 text-sm text-nfw-blackberry/40 hover:border-nfw-blackberry hover:text-nfw-blackberry transition-colors"
          >
            + Add {field.itemLabel}
          </button>
        </div>
      </div>
    );
  }

  if (field.type === "boolean") {
    const isChecked = value === true || value === "true";

    return (
      <div className="flex items-center gap-3">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={isChecked}
            onChange={(e) => onChange(e.target.checked)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-nfw-blackberry/20 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-nfw-blackberry/30 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-nfw-blackberry/30 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-nfw-citrine"></div>
        </label>
        <span className="text-sm text-nfw-blackberry/70">{field.label}</span>
      </div>
    );
  }

  if (field.type === "array") {
    const arr = (value as Record<string, unknown>[]) ?? [];

    const updateItem = (index: number, key: string, val: unknown) => {
      const updated = arr.map((item, i) =>
        i === index ? { ...item, [key]: val } : item,
      );
      onChange(updated);
    };

    const addItem = () => {
      const empty = field.fields.reduce(
        (acc, f) => ({
          ...acc,
          [f.key]: f.type === "select" && f.options?.length ? f.options[0] : "",
        }),
        {},
      );
      onChange([...arr, empty]);
    };

    const removeItem = (index: number) => {
      onChange(arr.filter((_, i) => i !== index));
    };

    const moveItem = (index: number, direction: "up" | "down") => {
      const updated = [...arr];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      if (swapIndex < 0 || swapIndex >= updated.length) return;
      [updated[index], updated[swapIndex]] = [
        updated[swapIndex],
        updated[index],
      ];
      onChange(updated);
    };

    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-2">
          {field.label}
        </label>
        <div className="space-y-3">
          {arr.map((item, index) => (
            <div
              key={index}
              className="border border-nfw-blackberry/10 p-3 space-y-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-nfw-blackberry/40">
                  {field.itemLabel} {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveItem(index, "up")}
                    disabled={index === 0}
                    className="text-xs px-1.5 py-0.5 text-nfw-blackberry/40 hover:text-nfw-blackberry disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(index, "down")}
                    disabled={index === arr.length - 1}
                    className="text-xs px-1.5 py-0.5 text-nfw-blackberry/40 hover:text-nfw-blackberry disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-xs px-1.5 py-0.5 text-red-400 hover:text-red-600 hover:bg-red-50"
                  >
                    Remove
                  </button>
                </div>
              </div>
              {field.fields.map((subField) => (
                <FieldEditor
                  key={subField.key}
                  field={subField}
                  value={item[subField.key]}
                  onChange={(val) => updateItem(index, subField.key, val)}
                />
              ))}
            </div>
          ))}
          <button
            onClick={addItem}
            className="w-full py-2 border-2 border-dashed border-nfw-blackberry/20 text-sm text-nfw-blackberry/40 hover:border-nfw-blackberry hover:text-nfw-blackberry transition-colors"
          >
            + Add {field.itemLabel}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

export default function SectionEditorPanel({
  section,
  onSave,
  onClose,
  saving: _saving,
}: Props) {
  const def =
    SECTION_REGISTRY[section.section_type as keyof typeof SECTION_REGISTRY];
  const [content, setContent] = useState<Record<string, unknown>>(
    (section.content || {}) as Record<string, unknown>,
  );
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [mediaLibrary, setMediaLibrary] = useState<{
    isOpen: boolean;
    fieldKey: string | null;
    bucket: string;
  }>({ isOpen: false, fieldKey: null, bucket: "page-builder" });
  const [currentFieldKey, setCurrentFieldKey] = useState<string | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const contentRef = useRef<Record<string, unknown>>(content);
  
  const openMediaLibrary = useCallback((bucket: string, fieldKey: string) => {
    setMediaLibrary({ isOpen: true, fieldKey, bucket });
  }, []);

  useEffect(() => {
    contentRef.current = content;
  }, [content]);

  useEffect(() => {
    setContent((section.content || {}) as Record<string, unknown>);
    setSaveStatus("idle");
  }, [section.id]);

  const triggerAutoSave = useCallback((contentToSave: Record<string, unknown>) => {
    console.log("[triggerAutoSave] Content to save", {
      contentKeys: contentToSave ? Object.keys(contentToSave) : null,
      contentNull: contentToSave === null,
      contentUndefined: contentToSave === undefined,
    });
    if (!contentToSave || typeof contentToSave !== 'object') {
      console.log("[triggerAutoSave] Skipping save - invalid content");
      return;
    }
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    setSaveStatus("saving");
    const contentToSaveFinal = { ...contentToSave };
    saveTimerRef.current = setTimeout(async () => {
      try {
        await onSave(contentToSaveFinal);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("idle");
        return;
      }
      setTimeout(() => setSaveStatus("idle"), 2000);
    }, 500);
  }, [onSave]);

  const updateField = (key: string, value: unknown) => {
    console.log("[updateField] Field update", { key, value });
    setContent((prev) => {
      const updatedContent = { ...prev, [key]: value };
      if (key === "autoplay" && value === true && prev.muted !== true) {
        updatedContent.muted = true;
      }
      console.log("[updateField] New content", {
        contentKeys: Object.keys(updatedContent),
      });
      triggerAutoSave(updatedContent);
      return updatedContent;
    });
  };

  if (!def) {
    return (
      <div className="p-6">
        <p className="text-sm text-gray-500">
          Unknown section type: {section.section_type}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-6 py-4 border-b border-nfw-blackberry/5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="font-black text-nfw-blackberry font-ui">{def.label}</h3>
          {saveStatus === "saving" && (
            <span className="text-xs text-nfw-blackberry/50 animate-pulse">Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs text-green-600">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-nfw-blackberry/40 hover:text-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {def.editorFields.map((field) => {
          if (field.type === "image") {
            return (
              <div key={field.key}>
                <label className="block text-xs font-black uppercase tracking-wider text-nfw-blackberry/50 mb-1">
                  {field.label}
                </label>

                {typeof content[field.key] === "string" && (content[field.key] as string) && isValidUrl(content[field.key] as string) && (
                  <div className="relative mb-2 group w-full h-40 overflow-hidden">
                    <Image
                      src={content[field.key] as string}
                      alt=""
                      fill
                      className="object-cover"
                    />
                    <button
                      onClick={() => updateField(field.key, "")}
                      className="absolute top-2 right-2 bg-red-500 text-white w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      ×
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => { console.log("[DEBUG] Image button clicked, field:", field.key); openMediaLibrary("page-builder", field.key); }}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-nfw-blackberry/20 hover:border-nfw-blackberry hover:bg-nfw-blackberry/5 transition-colors"
                >
                  <Upload className="w-4 h-4 text-nfw-blackberry/40" />
                  <span className="text-sm text-nfw-blackberry/50">
                    {content[field.key] ? "Replace image" : "Add image"}
                  </span>
                </button>

                <input
                  type="text"
                  value={(content[field.key] as string) ?? ""}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder="Or paste a URL directly"
                  className="mt-2 w-full px-3 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry transition-colors text-nfw-blackberry/40"
                />
              </div>
            );
          }
          return (
            <FieldEditor
              key={field.key}
              field={field}
              value={content[field.key]}
              onChange={(val) => updateField(field.key, val)}
            />
          );
        })}
      </div>

      <MediaLibraryModal
        isOpen={mediaLibrary.isOpen}
        onClose={() => { console.log("[DEBUG] Modal closing"); setMediaLibrary({ isOpen: false, fieldKey: null, bucket: "page-builder" }); }}
        bucket={mediaLibrary.bucket}
        onSelect={(url) => {
          console.log("[DEBUG] Image selected:", url);
          if (mediaLibrary.fieldKey) {
            updateField(mediaLibrary.fieldKey, url);
          }
          setMediaLibrary({ isOpen: false, fieldKey: null, bucket: "page-builder" });
        }}
      />
    </div>
  );
}
