"use client";

import { Pencil, ArrowUp, ArrowDown, Eye, EyeOff, Trash2 } from "lucide-react";

interface Props {
  isVisible: boolean;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

export default function FloatingControls({
  isVisible,
  isFirst,
  isLast,
  onEdit,
  onMoveUp,
  onMoveDown,
  onToggleVisibility,
  onDelete,
}: Props) {
  if (!isVisible) return null;

  return (
    <div className="absolute top-4 right-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-1 border border-gray-200">
      {/* Edit */}
      <button
        onClick={onEdit}
        className="p-2 text-gray-500 hover:text-nfw-blackberry hover:bg-gray-100 transition-colors"
        title="Edit section"
      >
        <Pencil className="w-4 h-4" />
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-200" />

      {/* Move up */}
      <button
        onClick={onMoveUp}
        disabled={isFirst}
        className="p-2 text-gray-500 hover:text-nfw-blackberry hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Move up"
      >
        <ArrowUp className="w-4 h-4" />
      </button>

      {/* Move down */}
      <button
        onClick={onMoveDown}
        disabled={isLast}
        className="p-2 text-gray-500 hover:text-nfw-blackberry hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Move down"
      >
        <ArrowDown className="w-4 h-4" />
      </button>

      {/* Divider */}
      <div className="w-px h-4 bg-gray-200" />

      {/* Toggle visibility */}
      <button
        onClick={onToggleVisibility}
        className="p-2 text-gray-500 hover:text-nfw-blackberry hover:bg-gray-100 transition-colors"
        title="Hide section"
      >
        <Eye className="w-4 h-4" />
      </button>

      {/* Delete */}
      <button
        onClick={onDelete}
        className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 transition-colors"
        title="Delete section"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  );
}
