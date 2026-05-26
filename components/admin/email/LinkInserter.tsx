"use client";

import { useState } from "react";

interface Props {
  onInsert: (html: string) => void;
}

export function LinkInserter({ onInsert }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");

  const handleInsert = () => {
    if (!linkText.trim() || !linkUrl.trim()) return;
    onInsert(`<a href="${linkUrl}" style="color: inherit; text-decoration: underline;">${linkText}</a>`);
    setLinkText("");
    setLinkUrl("https://");
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1.5 text-xs font-medium bg-nfw-wisteria/20 text-nfw-aubergine border border-nfw-wisteria/30 rounded hover:bg-nfw-wisteria/30 transition-colors"
        title="Insert Link"
      >
        🔗 Link
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 p-3 bg-white border border-nfw-blackberry/20 rounded shadow-lg z-10 w-64">
          <div className="space-y-2">
            <input
              type="text"
              value={linkText}
              onChange={(e) => setLinkText(e.target.value)}
              placeholder="Link text"
              className="w-full px-2 py-1.5 text-sm border border-nfw-blackberry/20 rounded focus:outline-none focus:border-nfw-aubergine"
            />
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://"
              className="w-full px-2 py-1.5 text-sm border border-nfw-blackberry/20 rounded focus:outline-none focus:border-nfw-aubergine"
            />
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-2 py-1 text-xs text-nfw-blackberry/60 hover:text-nfw-blackberry"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsert}
                className="px-2 py-1 text-xs bg-nfw-aubergine text-white rounded hover:bg-nfw-aubergine/80"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}