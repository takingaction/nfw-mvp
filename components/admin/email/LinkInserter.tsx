"use client";

import { useState } from "react";

interface Props {
  onInsert: (html: string) => void;
}

export function LinkInserter({ onInsert }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [linkText, setLinkText] = useState("");
  const [linkUrl, setLinkUrl] = useState("https://");
  const [openInNewTab, setOpenInNewTab] = useState(false);

  const handleInsert = () => {
    if (!linkText.trim() || !linkUrl.trim()) return;
    const targetAttr = openInNewTab ? ' target="_blank" rel="noopener noreferrer"' : "";
    onInsert(`<a href="${linkUrl}"${targetAttr} style="color: inherit; text-decoration: underline;">${linkText}</a>`);
    setLinkText("");
    setLinkUrl("https://");
    setOpenInNewTab(false);
    setIsOpen(false);
  };

  const handleCancel = () => {
    setLinkText("");
    setLinkUrl("https://");
    setOpenInNewTab(false);
    setIsOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-2 text-sm font-medium bg-nfw-wisteria/20 text-nfw-aubergine border border-nfw-wisteria/30 rounded hover:bg-nfw-wisteria/30 transition-colors"
        title="Insert Link"
      >
        🔗 Link
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={handleCancel} />
          <div className="relative bg-white rounded-lg shadow-xl p-6 w-80 max-w-[90vw]">
            <h3 className="text-lg font-semibold text-nfw-blackberry mb-4">Insert Link</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-nfw-blackberry/70 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  value={linkText}
                  onChange={(e) => setLinkText(e.target.value)}
                  placeholder="Click here"
                  autoFocus
                  className="w-full px-3 py-2 text-sm border border-nfw-blackberry/20 rounded focus:outline-none focus:border-nfw-aubergine"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-nfw-blackberry/70 mb-1">
                  URL
                </label>
                <input
                  type="url"
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://"
                  className="w-full px-3 py-2 text-sm border border-nfw-blackberry/20 rounded focus:outline-none focus:border-nfw-aubergine"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="openInNewTab"
                  checked={openInNewTab}
                  onChange={(e) => setOpenInNewTab(e.target.checked)}
                  className="w-4 h-4 accent-nfw-aubergine"
                />
                <label htmlFor="openInNewTab" className="text-sm text-nfw-blackberry">
                  Open in new tab
                </label>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-sm text-nfw-blackberry/60 hover:text-nfw-blackberry"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleInsert}
                className="px-4 py-2 text-sm bg-nfw-aubergine text-white rounded hover:bg-nfw-aubergine/80"
              >
                Insert
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}