"use client";

import { useState, useRef, useEffect } from "react";
import { EMAIL_VARIABLES } from "@/lib/email-blocks/types";

interface Props {
  onInsert: (variable: string) => void;
}

export function VariableInserter({ onInsert }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-3 py-1.5 text-xs font-medium bg-nfw-wisteria/20 text-nfw-aubergine border border-nfw-wisteria/30 rounded hover:bg-nfw-wisteria/30 transition-colors"
      >
        Insert Variable
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-48 bg-white border border-nfw-blackberry/20 rounded shadow-lg">
          <div className="py-1">
            <div className="px-3 py-1.5 text-xs font-semibold text-nfw-blackberry/50 uppercase tracking-wider">
              Variables
            </div>
            {EMAIL_VARIABLES.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => {
                  onInsert(`{{${v.name}}}`);
                  setIsOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-sm text-nfw-blackberry hover:bg-nfw-citrine/20 transition-colors"
              >
                <span className="font-medium">{v.label}</span>
                <span className="ml-2 text-nfw-blackberry/40 font-mono text-xs">{`{{${v.name}}}`}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}