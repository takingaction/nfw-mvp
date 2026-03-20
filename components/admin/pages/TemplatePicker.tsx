"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { SECTION_REGISTRY } from "@/lib/sections/registry";
import type { SectionTemplate } from "@/types/section-templates";

interface Props {
  templates: SectionTemplate[];
  onSelect: (template: SectionTemplate) => void;
  onClose: () => void;
}

export default function TemplatePicker({ templates, onSelect, onClose }: Props) {
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="font-black text-[#2d1239] text-lg">Add Section</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {templates.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              No templates found. Go to{" "}
              <Link href="/admin/pages/templates" className="underline">
                Template Management
              </Link>
              {" "}to initialize system templates.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {templates.map((template) => {
                const def =
                  SECTION_REGISTRY[
                    template.section_type as keyof typeof SECTION_REGISTRY
                  ];
                return (
                  <button
                    key={template.id}
                    onClick={() => onSelect(template)}
                    className="text-left p-4 border-2 border-gray-200 rounded-xl hover:border-[#2d1239] hover:bg-[#2d1239]/5 transition-all group"
                  >
                    <div className="w-full h-16 rounded-lg mb-3 flex items-center justify-center bg-[#3e155f]/10 group-hover:bg-[#3e155f]/20 transition-colors">
                      <span className="text-xs font-black uppercase tracking-wider text-[#3e155f]/50">
                        {def?.label ?? template.section_type}
                      </span>
                    </div>
                    <p className="font-black text-sm text-[#2d1239]">
                      {template.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-400">
                        {template.section_type}
                      </span>
                      {template.is_system && (
                        <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                          System
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}