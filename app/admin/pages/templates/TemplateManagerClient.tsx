"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Plus, X, Copy, Trash2, Edit2, Loader2, AlertTriangle, Upload, ChevronLeft } from "lucide-react";
import { SECTION_REGISTRY, EditorField } from "@/lib/sections/registry";
import { uploadImage } from "@/lib/upload";
import type { SectionTemplate } from "@/types/section-templates";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  duplicateTemplate,
} from "./actions";

interface Props {
  initialTemplates: SectionTemplate[];
  userId: string;
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
          rows={3}
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
      const empty = field.fields.reduce((acc, f) => ({ ...acc, [f.key]: "" }), {});
      onChange([...arr, empty]);
    };
    const removeItem = (index: number) => {
      onChange(arr.filter((_, i) => i !== index));
    };

    return (
      <div>
        <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-2">
          {field.label}
        </label>
        <div className="space-y-3">
          {arr.map((item, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-400">
                  {field.itemLabel} {index + 1}
                </span>
                <button
                  onClick={() => removeItem(index)}
                  className="text-xs px-1.5 py-0.5 rounded text-red-400 hover:text-red-600 hover:bg-red-50"
                >
                  Remove
                </button>
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

  return null;
}

export default function TemplateManagerClient({
  initialTemplates,
  userId,
}: Props) {
  const [templates, setTemplates] = useState(initialTemplates);
  const [loading, setLoading] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<SectionTemplate | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<SectionTemplate | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [formName, setFormName] = useState("");
  const [formSectionType, setFormSectionType] = useState("");
  const [formContent, setFormContent] = useState<Record<string, unknown>>({});

  useEffect(() => {
    loadTemplates();
  }, []);

  async function loadTemplates() {
    setLoading(true);
    try {
      const data = await getTemplates();
      setTemplates(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setEditingTemplate(null);
    setFormName("");
    setFormSectionType("hero");
    setFormContent(SECTION_REGISTRY.hero.defaultContent);
    setShowModal(true);
  }

  function openEditModal(template: SectionTemplate) {
    setEditingTemplate(template);
    setFormName(template.name);
    setFormSectionType(template.section_type);
    setFormContent(template.default_content as Record<string, unknown>);
    setShowModal(true);
  }

  function openDeleteConfirm(template: SectionTemplate) {
    setTemplateToDelete(template);
    setShowDeleteConfirm(true);
  }

  async function handleSave() {
    setModalLoading(true);
    try {
      if (editingTemplate) {
        await updateTemplate(editingTemplate.id, formName, formContent);
      } else {
        await createTemplate(formName, formSectionType, formContent, userId);
      }
      setShowModal(false);
      await loadTemplates();
    } catch (err) {
      console.error(err);
      alert("Failed to save template");
    } finally {
      setModalLoading(false);
    }
  }

  async function handleDuplicate(template: SectionTemplate) {
    try {
      await duplicateTemplate(template.id, userId);
      await loadTemplates();
    } catch (err) {
      console.error(err);
      alert("Failed to duplicate template");
    }
  }

  async function handleDelete() {
    if (!templateToDelete) return;
    setDeleteLoading(true);
    try {
      await deleteTemplate(templateToDelete.id);
      setShowDeleteConfirm(false);
      setTemplateToDelete(null);
      await loadTemplates();
    } catch (err) {
      console.error(err);
      alert("Failed to delete template");
    } finally {
      setDeleteLoading(false);
    }
  }

  const def =
    formSectionType &&
    (SECTION_REGISTRY[formSectionType as keyof typeof SECTION_REGISTRY]);

  return (
    <>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-[#2d1239] mb-2">
            Section Templates
          </h1>
          <p className="text-gray-600">
            Create and manage reusable section templates
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/admin/pages"
            className="flex items-center gap-1 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Manage Pages
          </Link>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#2d1239] rounded-lg hover:bg-[#2d1239]/90 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Template
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-400">Loading...</div>
      ) : templates.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-gray-400 mb-4">
            No templates found. Click &quot;Initialize System Templates&quot; to add the built-in templates.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                  Name
                </th>
                <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                  Type
                </th>
                <th className="text-left px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                  Kind
                </th>
                <th className="text-right px-6 py-4 text-xs font-black uppercase tracking-wider text-gray-500">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <span className="font-semibold text-[#2d1239]">
                      {template.name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600">
                      {template.section_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
                        template.is_system
                          ? "bg-purple-100 text-purple-700"
                          : "bg-blue-100 text-blue-700"
                      }`}
                    >
                      {template.is_system ? "System" : "Custom"}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(template)}
                        className="p-2 text-gray-400 hover:text-[#2d1239] hover:bg-[#2d1239]/5 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDuplicate(template)}
                        className="p-2 text-gray-400 hover:text-[#2d1239] hover:bg-[#2d1239]/5 rounded-lg transition-colors"
                        title="Duplicate"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      {!template.is_system && (
                        <button
                          onClick={() => openDeleteConfirm(template)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
              <h2 className="font-black text-[#2d1239] text-lg">
                {editingTemplate ? "Edit Template" : "New Template"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                  Template Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239] transition-colors"
                  placeholder="e.g., Summer Hero Variant"
                />
              </div>

              {!editingTemplate && (
                <div>
                  <label className="block text-xs font-black uppercase tracking-wider text-gray-500 mb-1">
                    Section Type
                  </label>
                  <select
                    value={formSectionType}
                    onChange={(e) => {
                      const type = e.target.value;
                      setFormSectionType(type);
                      setFormContent(
                        SECTION_REGISTRY[type as keyof typeof SECTION_REGISTRY]
                          .defaultContent,
                      );
                    }}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#2d1239] transition-colors"
                  >
                    {Object.values(SECTION_REGISTRY).map((reg) => (
                      <option key={reg.type} value={reg.type}>
                        {reg.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {editingTemplate && (
                <div className="text-sm text-gray-500">
                  Section type: <span className="font-semibold">{editingTemplate.section_type}</span>
                </div>
              )}

              {def && (
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <p className="text-xs font-black uppercase tracking-wider text-gray-500">
                    Default Content
                  </p>
                  {def.editorFields.map((field) => (
                    <FieldEditor
                      key={field.key}
                      field={field}
                      value={formContent[field.key]}
                      onChange={(val) =>
                        setFormContent((prev) => ({ ...prev, [field.key]: val }))
                      }
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex-shrink-0 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-6 py-3 text-sm font-semibold text-gray-600 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={modalLoading || !formName.trim()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[#2d1239] text-white rounded-xl font-bold hover:bg-[#2d1239]/90 disabled:opacity-50 transition-colors"
              >
                {modalLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Template"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && templateToDelete && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="font-black text-[#2d1239] text-lg">
                  Delete Template?
                </h2>
              </div>
              <p className="text-gray-600 mb-2">
                Are you sure you want to delete{" "}
                <span className="font-semibold">{templateToDelete.name}</span>?
              </p>
              <p className="text-sm text-gray-400">
                This template will be permanently deleted. Any sections using this
                template will not be affected.
              </p>
            </div>
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setTemplateToDelete(null);
                }}
                className="flex-1 px-6 py-3 text-sm font-semibold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteLoading}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Delete Template"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}