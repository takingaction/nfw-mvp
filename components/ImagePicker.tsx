"use client";

import { useState } from "react";
import Image from "next/image";
import MediaLibraryModal from "@/components/admin/MediaLibraryModal";

export default function ImagePicker({
  label,
  currentUrl,
  onSelect,
  bucket = "page-builder",
}: {
  label: string;
  currentUrl?: string;
  onSelect: (url: string) => void;
  bucket?: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      <label className="block text-sm font-medium text-nfw-blackberry mb-2">
        {label}
      </label>

      {currentUrl && (
        <div className="mb-4 relative w-full h-48 bg-nfw-dove overflow-hidden">
          <Image
            src={currentUrl}
            alt="Preview"
            fill
            sizes="(max-width: 768px) 100vw, 50vw"
            className="object-cover"
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="bg-white border border-nfw-blackberry/20 px-4 py-2 hover:bg-nfw-blackberry/5 font-medium text-sm"
        >
          {currentUrl ? "Change Image" : "Select Image"}
        </button>

        {currentUrl && (
          <button
            type="button"
            onClick={() => onSelect("")}
            className="text-red-600 hover:text-red-800 text-sm font-medium"
          >
            Remove
          </button>
        )}
      </div>

      <p className="text-sm text-nfw-blackberry/50 mt-2">
        Recommended: JPG, PNG, or WebP.
      </p>

      <MediaLibraryModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSelect={(url) => {
          onSelect(url);
          setModalOpen(false);
        }}
        bucket={bucket}
      />
    </div>
  );
}
