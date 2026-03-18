"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { SECTION_REGISTRY } from "@/lib/sections/registry";
import { createClient } from "@/lib/supabase/client";

interface Template {
  id: string;
  name: string;
  section_type: string;
  default_content: Record<string, unknown>;
}

interface Props {
  onSelect: (template: Template) => void;
  onClose: () => void;
}

export default function TemplatePicker({ onSelect, onClose }: Props) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("section_templates")
        .select("*")
        .order("name");
      setTemplates(data ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="font-black text-[#2d1239] text-lg">Add Section</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Template grid */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-400 text-sm">
              Loading templates...
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
                    {/* Color swatch */}
                    <div className="w-full h-16 rounded-lg mb-3 flex items-center justify-center bg-[#3e155f]/10 group-hover:bg-[#3e155f]/20 transition-colors">
                      <span className="text-xs font-black uppercase tracking-wider text-[#3e155f]/50">
                        {def?.label ?? template.section_type}
                      </span>
                    </div>
                    <p className="font-black text-sm text-[#2d1239]">
                      {template.name}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {template.section_type}
                    </p>
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
