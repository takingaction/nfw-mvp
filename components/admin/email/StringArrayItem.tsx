"use client";

import { useRef } from "react";

interface StringArrayItemProps {
  item: string;
  index: number;
  fieldKey: string;
  content: Record<string, unknown>;
  onChange: (content: Record<string, unknown>) => void;
  onRemove: () => void;
}

export function StringArrayItem({
  item,
  index,
  fieldKey,
  content,
  onChange,
  onRemove,
}: StringArrayItemProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const wrapText = (prefix: string, suffix: string, placeholder: string) => {
    const input = inputRef.current;
    if (!input) return;

    const start = input.selectionStart || 0;
    const end = input.selectionEnd || 0;
    const text = input.value;
    const selectedText = text.substring(start, end);

    const newText = selectedText
      ? text.substring(0, start) + prefix + selectedText + suffix + text.substring(end)
      : text.substring(0, start) + prefix + placeholder + suffix + text.substring(end);

    const arr = [...((content[fieldKey] as string[]) || [])];
    arr[index] = newText;
    onChange({ ...content, [fieldKey]: arr });
  };

  return (
    <div className="flex gap-2">
      <div className="flex items-center border border-nfw-blackberry/20 rounded overflow-hidden">
        <button
          type="button"
          onClick={() => wrapText("**", "**", "bold")}
          className="px-2 py-1.5 text-xs font-bold text-nfw-blackberry hover:bg-nfw-blackberry/10 transition-colors"
          title="Bold"
        >
          B
        </button>
        <button
          type="button"
          onClick={() => wrapText("*", "*", "italic")}
          className="px-2 py-1.5 text-xs italic text-nfw-blackberry hover:bg-nfw-blackberry/10 transition-colors border-l border-nfw-blackberry/20"
          title="Italic"
        >
          I
        </button>
        <button
          type="button"
          onClick={() => wrapText("[", "](url)", "link text")}
          className="px-2 py-1.5 text-xs text-nfw-blackberry hover:bg-nfw-blackberry/10 transition-colors border-l border-nfw-blackberry/20"
          title="Link"
        >
          Link
        </button>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={item}
        onChange={(e) => {
          const arr = [...((content[fieldKey] as string[]) || [])];
          arr[index] = e.target.value;
          onChange({ ...content, [fieldKey]: arr });
        }}
        className="flex-1 px-3 py-2 border border-nfw-blackberry/20 text-sm text-nfw-blackberry focus:outline-none focus:border-nfw-aubergine"
      />
      <button
        type="button"
        onClick={onRemove}
        className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
      >
        Remove
      </button>
    </div>
  );
}