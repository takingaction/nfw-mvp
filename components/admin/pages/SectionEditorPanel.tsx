"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { X, Save, Upload } from "lucide-react";
import { PageSection } from "@/lib/sections/types";
import { SECTION_REGISTRY, EditorField } from "@/lib/sections/registry";
import { uploadImage } from "@/lib/upload";

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
}: {
  field: EditorField;
  value: unknown;
  onChange: (val: unknown) => void;
}) {
  if (field.type === "text" || field.type === "url") {
    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
          {field.label}
        </label>
        <input
          type="text"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239] transition-colors"
        />
      </div>
    );
  }

  if (field.type === "textarea" || field.type === "richtext") {
    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
          {field.label}
        </label>
        <textarea
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239] transition-colors resize-none"
        />
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
          {field.label}
        </label>
        <select
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239] transition-colors"
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
    const fileInputRef = { current: null as HTMLInputElement | null };

    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
          {field.label}
        </label>

        {typeof value === "string" && value && (
          <div className="relative mb-2 group w-full h-40 rounded-lg overflow-hidden">
            <Image
              src={value as string}
              alt=""
              fill
              className="object-cover"
            />
            <button
              onClick={() => onChange("")}
              className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
            >
              ×
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-lg hover:border-[#2d1239] hover:bg-[#2d1239]/5 transition-colors"
        >
          <Upload className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {value ? "Replace image" : "Upload image"}
          </span>
        </button>

        <input
          ref={(el) => {
            fileInputRef.current = el;
          }}
          type="file"
          accept="image/*"
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
          placeholder="Or paste a URL directly"
          className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239] transition-colors text-gray-400"
        />
      </div>
    );
  }

  if (field.type === "string-array") {
    const arr = (value as string[]) ?? [];

    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
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
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239] transition-colors"
              />
              <button
                onClick={() => onChange(arr.filter((_, i) => i !== index))}
                className="text-xs px-2 py-1.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50 flex-shrink-0"
              >
                ×
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange([...arr, ""])}
            className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-[#2d1239] hover:text-[#2d1239] transition-colors"
          >
            + Add {field.itemLabel}
          </button>
        </div>
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
        (acc, f) => ({ ...acc, [f.key]: "" }),
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
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
          {field.label}
        </label>
        <div className="space-y-3">
          {arr.map((item, index) => (
            <div
              key={index}
              className="border border-gray-200 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-400">
                  {field.itemLabel} {index + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => moveItem(index, "up")}
                    disabled={index === 0}
                    className="text-xs px-1.5 py-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    onClick={() => moveItem(index, "down")}
                    disabled={index === arr.length - 1}
                    className="text-xs px-1.5 py-0.5 rounded text-gray-400 hover:text-gray-600 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-xs px-1.5 py-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
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
            className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm text-gray-400 hover:border-[#2d1239] hover:text-[#2d1239] transition-colors"
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
  saving,
}: Props) {
  const def =
    SECTION_REGISTRY[section.section_type as keyof typeof SECTION_REGISTRY];
  const [content, setContent] = useState<Record<string, unknown>>(
    section.content as Record<string, unknown>,
  );

  useEffect(() => {
    setContent(section.content as Record<string, unknown>);
  }, [section.id]);

  const updateField = (key: string, value: unknown) => {
    setContent((prev) => ({ ...prev, [key]: value }));
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
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
        <h3 className="font-black text-[#2d1239]">{def.label}</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        {def.editorFields.map((field) => (
          <FieldEditor
            key={field.key}
            field={field}
            value={content[field.key]}
            onChange={(val) => updateField(field.key, val)}
          />
        ))}
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0">
        <button
          onClick={() => onSave(content)}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#2d1239] text-white rounded-xl font-bold hover:bg-[#2d1239]/90 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Section"}
        </button>
      </div>
    </div>
  );
}
