"use client";

import { useState, useRef, useCallback } from "react";
import type { EditorField } from "@/lib/sections/registry";
import { EMAIL_BLOCK_REGISTRY } from "@/lib/email-blocks/registry";
import type { EmailBlockType } from "@/lib/email-blocks/types";
import { VariableInserter } from "./VariableInserter";
import { LinkInserter } from "./LinkInserter";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";
import { StringArrayItem } from "./StringArrayItem";

interface Props {
  blockType: EmailBlockType;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
}

export function EmailBlockEditor({ blockType, content, onChange }: Props) {
  const definition = EMAIL_BLOCK_REGISTRY[blockType];
  const [mediaField, setMediaField] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const insertAtCursor = useCallback((replacement: string, fieldKey: string) => {
    const el = (textareaRef.current ?? inputRef.current) as HTMLInputElement | HTMLTextAreaElement | null;
    if (!el) return;

    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const text = el.value;
    const selectedText = text.substring(start, end);

    let newText: string;
    let newCursorPos: number;

    if (selectedText) {
      newText = text.substring(0, start) + replacement + text.substring(end);
      newCursorPos = start + replacement.length;
    } else {
      newText = text.substring(0, start) + replacement + text.substring(end);
      newCursorPos = start + replacement.length;
    }

    onChange({ ...content, [fieldKey]: newText });
    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  }, [content, onChange]);

  const wrapSelection = useCallback((prefix: string, suffix: string, fieldKey: string) => {
    const textarea = textareaRef.current as HTMLInputElement | HTMLTextAreaElement | null;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? 0;
    const text = textarea.value;
    const selectedText = text.substring(start, end);

    if (selectedText) {
      const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      onChange({ ...content, [fieldKey]: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
    } else {
      const placeholder = `${prefix}text${suffix}`;
      const newText = text.substring(0, start) + placeholder + text.substring(end);
      const newCursorPos = start + prefix.length;
      onChange({ ...content, [fieldKey]: newText });
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos + 4);
      }, 0);
    }
  }, [content, onChange]);

  if (!definition) {
    return <div className="text-red-600">Unknown block type: {blockType}</div>;
  }

  return (
    <div className="space-y-4">
      {definition.editorFields.map((field) => (
        <div key={field.key}>
          <label className="block text-sm font-medium text-nfw-blackberry mb-1">
            {field.label}
          </label>

          {field.type === "text" && (
            <div className="flex gap-2">
              <input
                type="text"
                ref={field.key === "text" ? inputRef : undefined}
                value={(content[field.key] as string) || ""}
                onChange={(e) => onChange({ ...content, [field.key]: e.target.value })}
                className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine"
              />
              <VariableInserter
                onInsert={(variable) => insertAtCursor(variable, field.key)}
              />
            </div>
          )}

          {field.type === "richtext" && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="flex items-center border border-nfw-blackberry/20 rounded overflow-hidden">
                  <button
                    type="button"
                    onClick={() => wrapSelection("**", "**", field.key)}
                    className="px-3 py-2 text-sm font-bold text-nfw-blackberry hover:bg-nfw-blackberry/10 transition-colors"
                    title="Bold"
                  >
                    B
                  </button>
                  <button
                    type="button"
                    onClick={() => wrapSelection("*", "*", field.key)}
                    className="px-3 py-2 text-sm italic text-nfw-blackberry hover:bg-nfw-blackberry/10 transition-colors border-l border-nfw-blackberry/20"
                    title="Italic"
                  >
                    I
                  </button>
                </div>
                <textarea
                  ref={textareaRef}
                  value={(content[field.key] as string) || ""}
                  onChange={(e) => onChange({ ...content, [field.key]: e.target.value })}
                  rows={5}
                  className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine resize-none"
                />
                <div className="flex flex-col gap-1">
                  <VariableInserter
                    onInsert={(variable) => insertAtCursor(variable, field.key)}
                  />
                  <LinkInserter
                    onInsert={(html) => insertAtCursor(html, field.key)}
                  />
                </div>
              </div>
            </div>
          )}

          {field.type === "url" && (
            <input
              type="url"
              value={(content[field.key] as string) || ""}
              onChange={(e) => onChange({ ...content, [field.key]: e.target.value })}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine"
            />
          )}

          {field.type === "select" && field.options && (
            <select
              value={(content[field.key] as string) || ""}
              onChange={(e) => onChange({ ...content, [field.key]: e.target.value })}
              className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine"
            >
              <option value="">Select...</option>
              {field.options.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          )}

          {field.type === "image" && (
            <div className="space-y-2">
              <input
                type="text"
                value={(content[field.key] as string) || ""}
                onChange={(e) => onChange({ ...content, [field.key]: e.target.value })}
                placeholder="Image URL"
                className="w-full px-3 py-2 border border-nfw-blackberry/20 text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine"
              />
              <button
                type="button"
                onClick={() => setMediaField(field.key)}
                className="px-3 py-1.5 text-xs font-medium bg-nfw-wisteria/20 text-nfw-aubergine border border-nfw-wisteria/30 rounded hover:bg-nfw-wisteria/30 transition-colors"
              >
                Browse
              </button>
              {(content[field.key] as string) && (
                <div className="mt-2">
                  <img
                    src={content[field.key] as string}
                    alt=""
                    className="h-20 object-contain border border-nfw-blackberry/10 rounded"
                  />
                </div>
              )}
            </div>
          )}

          {field.type === "string-array" && (
            <div className="space-y-2">
              {(content[field.key] as string[])?.map((item, index) => (
                <StringArrayItem
                  key={index}
                  item={item}
                  index={index}
                  fieldKey={field.key}
                  content={content}
                  onChange={onChange}
                  onRemove={() => {
                    const arr = [...((content[field.key] as string[]) || [])];
                    arr.splice(index, 1);
                    onChange({ ...content, [field.key]: arr });
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  const arr = [...((content[field.key] as string[]) || []), ""];
                  onChange({ ...content, [field.key]: arr });
                }}
                className="px-3 py-1 text-xs font-medium bg-nfw-wisteria/20 text-nfw-aubergine border border-nfw-wisteria/30 rounded hover:bg-nfw-wisteria/30 transition-colors"
              >
                Add {field.itemLabel || "Item"}
              </button>
            </div>
          )}
        </div>
      ))}

      {mediaField && (
        <MediaLibraryModal
          isOpen={true}
          bucket="page-builder"
          onClose={() => setMediaField(null)}
          onSelect={(url) => {
            onChange({ ...content, [mediaField]: url });
            setMediaField(null);
          }}
        />
      )}
    </div>
  );
}