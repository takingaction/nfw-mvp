"use client";

import { useState, useRef } from "react";
import { Camera } from "lucide-react";

type AvatarUploadProps = {
  currentAvatarUrl: string | null;
};

export default function AvatarUpload({ currentAvatarUrl }: AvatarUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setSuccess(false);
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("avatar", file);

      const res = await fetch("/api/profile/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setSuccess(true);
      // Reload page to show new avatar
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to upload avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Remove your profile photo?")) return;

    setError(null);
    setSuccess(false);
    setUploading(true);

    try {
      const res = await fetch("/api/profile/avatar/delete", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Delete failed");
      }

      setSuccess(true);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || "Failed to delete avatar");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white border border-nfw-blackberry/10 p-6 mb-6">
      <h3 className="text-lg font-semibold text-nfw-blackberry mb-4">
        Profile Photo
      </h3>

      <div className="flex items-center gap-6">
        {/* Current Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-nfw-stone/20 border-2 border-nfw-blackberry/10">
            {currentAvatarUrl ? (
              <img
                src={currentAvatarUrl}
                alt="Your profile photo"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Camera className="w-8 h-8 text-nfw-stone/30" />
              </div>
            )}
          </div>
          {uploading && (
            <div className="absolute inset-0 bg-nfw-blackberry/50 rounded-full flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Buttons */}
        <div className="flex flex-col gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="px-4 py-2 bg-nfw-aubergine text-white text-sm font-medium hover:bg-nfw-aubergine/90 disabled:opacity-50 transition-colors"
          >
            {currentAvatarUrl ? "Change Photo" : "Add Photo"}
          </button>

          {currentAvatarUrl && (
            <button
              onClick={handleDelete}
              disabled={uploading}
              className="px-4 py-2 bg-nfw-stone/20 text-nfw-blackberry text-sm font-medium hover:bg-nfw-stone/30 disabled:opacity-50 transition-colors"
            >
              Remove Photo
            </button>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}
          {success && !currentAvatarUrl && (
            <p className="text-sm text-green-600">Photo updated!</p>
          )}

          <p className="text-xs text-nfw-blackberry/40">
            JPEG, PNG, or WebP. Max 2MB. Auto-cropped to square.
          </p>
        </div>
      </div>
    </div>
  );
}