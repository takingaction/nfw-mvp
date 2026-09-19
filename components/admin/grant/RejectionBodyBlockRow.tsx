"use client";

import { FormattedTextInput } from "@/components/admin/text-editor/FormattedTextInput";
import type { RejectionBodyBlock } from "@/lib/grant-rejection-body";

interface Props {
  block: RejectionBodyBlock;
  index: number;
  total: number;
  onChange: (block: RejectionBodyBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}

export function RejectionBodyBlockRow({
  block,
  index,
  total,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: Props) {
  return (
    <div className="border border-nfw-blackberry/20 rounded p-3 bg-nfw-dove/30">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="inline-flex border border-nfw-blackberry/20 rounded overflow-hidden">
            <button
              type="button"
              onClick={() => onChange({ ...block, type: "paragraph" })}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                block.type === "paragraph"
                  ? "bg-nfw-aubergine text-white"
                  : "bg-white text-nfw-blackberry hover:bg-nfw-blackberry/10"
              }`}
            >
              Paragraph
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...block, type: "bullet" })}
              className={`px-3 py-1 text-xs font-medium transition-colors border-l border-nfw-blackberry/20 ${
                block.type === "bullet"
                  ? "bg-nfw-aubergine text-white"
                  : "bg-nfw-blackberry/5 text-nfw-blackberry hover:bg-nfw-blackberry/10"
              }`}
            >
              Bullet
            </button>
          </div>
          <span className="text-xs text-nfw-blackberry/50">
            {block.type === "paragraph" ? "¶" : "•"} Block {index + 1}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onMoveUp}
            disabled={index === 0}
            className="px-2 py-1 text-xs text-nfw-blackberry/70 hover:bg-nfw-blackberry/10 disabled:opacity-30 disabled:cursor-not-allowed rounded"
            aria-label="Move block up"
            title="Move up"
          >
            ↑
          </button>
          <button
            type="button"
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="px-2 py-1 text-xs text-nfw-blackberry/70 hover:bg-nfw-blackberry/10 disabled:opacity-30 disabled:cursor-not-allowed rounded"
            aria-label="Move block down"
            title="Move down"
          >
            ↓
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
            aria-label="Remove block"
            title="Remove"
          >
            Remove
          </button>
        </div>
      </div>
      <FormattedTextInput
        value={block.text}
        onChange={(text) => onChange({ ...block, text })}
        placeholder={
          block.type === "paragraph"
            ? "Type paragraph text, or use **bold** or [link](url)"
            : "Type bullet text, or use **bold** or [link](url)"
        }
        ariaLabel={`${block.type} block ${index + 1} text`}
      />
    </div>
  );
}
