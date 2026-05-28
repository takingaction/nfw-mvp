"use client";

import { useState } from "react";
import { EMAIL_VARIABLES } from "@/lib/email-blocks/types";

interface Props {
  onInsert: (variable: string) => void;
}

export function VariableInserter({ onInsert }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  const handleInsert = (name: string) => {
    onInsert(`{{${name}}}`);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 text-sm font-medium bg-nfw-wisteria/20 text-nfw-aubergine border border-nfw-wisteria/30 rounded hover:bg-nfw-wisteria/30 transition-colors"
      >
        ✕ Variable
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setIsOpen(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-4 w-80 max-w-[90vw]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-nfw-blackberry">Insert Variable</h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-nfw-blackberry/50 hover:text-nfw-blackberry text-xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {EMAIL_VARIABLES.map((v) => (
                <button
                  key={v.name}
                  type="button"
                  onClick={() => handleInsert(v.name)}
                  className="w-full px-3 py-2 text-left text-sm text-nfw-blackberry hover:bg-nfw-citrine/20 rounded transition-colors"
                >
                  <span className="font-medium">{v.label}</span>
                  <span className="ml-2 text-nfw-blackberry/40 font-mono text-xs">{`{{${v.name}}}`}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}