"use client";

import { useState } from "react";
import { PageSection } from "@/lib/sections/types";
import SectionRenderer from "@/components/sections/SectionRenderer";
import FloatingControls from "./FloatingControls";

const SECTIONS_WITH_EXTERNAL_DEPS = ["zero_dollar_store_teaser", "hero_video"];

function hasExternalDependencies(sectionType: string): boolean {
  return SECTIONS_WITH_EXTERNAL_DEPS.includes(sectionType);
}

function getSectionTypeLabel(sectionType: string): string {
  const labels: Record<string, string> = {
    zero_dollar_store_teaser: "Zero Dollar Store Teaser",
    hero_video: "Hero Video",
  };
  return labels[sectionType] || sectionType;
}

interface Props {
  section: PageSection;
  isFirst: boolean;
  isLast: boolean;
  onEdit: () => void;
  onReorder: (sectionId: string, direction: "up" | "down") => void;
  onToggleVisibility: () => void;
  onDelete: () => void;
}

export default function SectionWrapper({
  section,
  isFirst,
  isLast,
  onEdit,
  onReorder,
  onToggleVisibility,
  onDelete,
}: Props) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hidden overlay */}
      {!section.visible && section.visible !== undefined && (
        <div className="absolute inset-0 bg-black/50 z-10 flex items-center justify-center">
          <button
            onClick={onToggleVisibility}
            className="flex items-center gap-2 px-4 py-2 bg-white text-nfw-blackberry font-semibold"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            Show Section
          </button>
        </div>
      )}

      {/* Section content */}
      <div className={`relative ${!section.visible && section.visible !== undefined ? "opacity-30 pointer-events-none" : ""}`}>
        {hasExternalDependencies(section.section_type) ? (
          <div className="bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center min-h-[200px] text-center">
            <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-600 mb-1">{getSectionTypeLabel(section.section_type)}</p>
            <p className="text-xs text-gray-400">Dynamic content - visible on live page</p>
          </div>
        ) : (
          <SectionRenderer sections={[section]} />
        )}
      </div>

      {/* Floating controls - show if visible is true or undefined (treat undefined as visible) */}
      {(section.visible === undefined || section.visible) && (
        <FloatingControls
          isVisible={isHovered}
          isFirst={isFirst}
          isLast={isLast}
          onEdit={onEdit}
          onMoveUp={() => onReorder(section.id, "up")}
          onMoveDown={() => onReorder(section.id, "down")}
          onToggleVisibility={onToggleVisibility}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}
