"use client";

import { RejectionBodyBlockRow } from "./RejectionBodyBlockRow";
import type {
  RejectionBodyBlock,
  RejectionBodyBlockType,
} from "@/lib/grant-rejection-body";

interface Props {
  blocks: RejectionBodyBlock[];
  onChange: (blocks: RejectionBodyBlock[]) => void;
}

export function RejectionBodyEditor({ blocks, onChange }: Props) {
  const addBlock = (type: RejectionBodyBlockType) => {
    onChange([...blocks, { type, text: "" }]);
  };

  const updateBlock = (index: number, block: RejectionBodyBlock) => {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  };

  const removeBlock = (index: number) => {
    onChange(blocks.filter((_, i) => i !== index));
  };

  const moveUp = (index: number) => {
    if (index === 0) return;
    const next = [...blocks];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    onChange(next);
  };

  const moveDown = (index: number) => {
    if (index === blocks.length - 1) return;
    const next = [...blocks];
    [next[index + 1], next[index]] = [next[index], next[index + 1]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {blocks.length === 0 ? (
        <div className="bg-nfw-dove border border-nfw-blackberry/10 p-3 text-sm text-nfw-blackberry/60">
          No content yet. Click "Add Paragraph" or "Add Bullet" below to
          compose the rejection message. Use the B/I/Link toolbar on each
          block for formatting.
        </div>
      ) : (
        blocks.map((block, index) => (
          <RejectionBodyBlockRow
            key={index}
            block={block}
            index={index}
            total={blocks.length}
            onChange={(b) => updateBlock(index, b)}
            onRemove={() => removeBlock(index)}
            onMoveUp={() => moveUp(index)}
            onMoveDown={() => moveDown(index)}
          />
        ))
      )}
      <div className="flex gap-2 pt-2">
        <button
          type="button"
          onClick={() => addBlock("paragraph")}
          className="px-3 py-1.5 text-xs font-medium bg-nfw-wisteria/20 text-nfw-aubergine border border-nfw-wisteria/30 rounded hover:bg-nfw-wisteria/30"
        >
          + Add Paragraph
        </button>
        <button
          type="button"
          onClick={() => addBlock("bullet")}
          className="px-3 py-1.5 text-xs font-medium bg-nfw-wisteria/20 text-nfw-aubergine border border-nfw-wisteria/30 rounded hover:bg-nfw-wisteria/30"
        >
          + Add Bullet
        </button>
      </div>
    </div>
  );
}
