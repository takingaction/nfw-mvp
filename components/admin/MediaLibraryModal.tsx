"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { X, Search, Upload, Trash2, ChevronLeft, ChevronRight, ImageIcon } from "lucide-react";
import { uploadImage } from "@/lib/upload";
import ConfirmModal from "./ConfirmModal";

interface MediaLibraryFile {
  name: string;
  url: string;
  thumbnailUrl: string;
  created_at: string;
  size: number;
}

interface MediaLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (imageUrl: string) => void;
  bucket: string;
}

const PAGE_SIZE = 20;

export default function MediaLibraryModal({
  isOpen,
  onClose,
  onSelect,
  bucket,
}: MediaLibraryModalProps) {
  const [activeTab, setActiveTab] = useState<"browse" | "upload">("browse");
  const [files, setFiles] = useState<MediaLibraryFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    file: MediaLibraryFile | null;
  }>({ isOpen: false, file: null });
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    console.log("[MediaLibrary] Fetching files from bucket:", bucket);
    try {
      const res = await fetch("/api/storage/list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket, search, limit: PAGE_SIZE, offset }),
      });
      console.log("[MediaLibrary] Response status:", res.status);
      const data = await res.json();
      console.log("[MediaLibrary] Response data:", data);
      if (data.files) {
        setFiles(data.files);
        setTotal(data.total);
      } else if (data.error) {
        console.error("[MediaLibrary] API error:", data.error);
      }
    } catch (error) {
      console.error("[MediaLibrary] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [bucket, search, offset]);

  useEffect(() => {
    if (isOpen && activeTab === "browse") {
      fetchFiles();
    }
  }, [isOpen, activeTab, fetchFiles]);

  useEffect(() => {
    if (isOpen && activeTab === "browse") {
      setOffset(0);
    }
  }, [search, isOpen, activeTab]);

  const handleSelect = (file: MediaLibraryFile) => {
    setSelectedFile(file.url);
    onSelect(file.url);
    onClose();
  };

  const handleDelete = async () => {
    if (!deleteModal.file) return;

    try {
      await fetch("/api/storage/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket,
          filename: deleteModal.file.name,
        }),
      });
      setDeleteModal({ isOpen: false, file: null });
      fetchFiles();
    } catch (error) {
      console.error("Error deleting file:", error);
    }
  };

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const file = fileList[0];
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 3 * 1024 * 1024) {
      alert("File size must be less than 3MB");
      return;
    }

    setUploading(true);
    try {
      const url = await uploadImage(file, bucket);
      // Refresh the list
      fetchFiles();
      // Auto-select the uploaded image
      onSelect(url);
      onClose();
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    handleUpload(e.dataTransfer.files);
  };

  const hasMore = offset + PAGE_SIZE < total;

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-6">
            <h3 className="text-lg font-bold text-nfw-blackberry">Media Library</h3>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveTab("browse")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "browse"
                    ? "bg-white text-nfw-blackberry shadow-sm"
                    : "text-nfw-blackberry/60 hover:text-nfw-blackberry"
                }`}
              >
                Browse
              </button>
              <button
                onClick={() => setActiveTab("upload")}
                className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  activeTab === "upload"
                    ? "bg-white text-nfw-blackberry shadow-sm"
                    : "text-nfw-blackberry/60 hover:text-nfw-blackberry"
                }`}
              >
                Upload New
              </button>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-nfw-blackberry/40 hover:text-nfw-blackberry transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {activeTab === "browse" ? (
            <div className="h-full flex flex-col p-6">
              {/* Search */}
              <div className="relative mb-4 flex-shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-nfw-blackberry/40" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by filename..."
                  className="w-full pl-10 pr-4 py-2 border border-nfw-blackberry/20 text-sm focus:outline-none focus:border-nfw-blackberry"
                />
              </div>

              {/* Grid */}
              <div className="flex-1 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center h-64">
                    <p className="text-nfw-blackberry/50">Loading...</p>
                  </div>
                ) : files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-center">
                    <ImageIcon className="w-12 h-12 text-nfw-blackberry/20 mb-3" />
                    <p className="text-nfw-blackberry/50">
                      {search ? "No images match your search" : "No images in library"}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 overflow-y-auto max-h-[50vh]">
                    {files.map((file) => (
                      <div
                        key={file.name}
                        className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all ${
                          selectedFile === file.url
                            ? "border-nfw-citrine"
                            : "border-transparent hover:border-nfw-blackberry/20"
                        }`}
                        onClick={() => handleSelect(file)}
                      >
                        <img
                          src={file.thumbnailUrl}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({ isOpen: true, file });
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className="flex items-center justify-between pt-4 border-t border-gray-100 mt-4 flex-shrink-0">
                  <p className="text-sm text-nfw-blackberry/50">
                    {offset + 1}-{Math.min(offset + PAGE_SIZE, total)} of {total}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                      disabled={offset === 0}
                      className="p-2 text-nfw-blackberry/60 hover:text-nfw-blackberry disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setOffset(offset + PAGE_SIZE)}
                      disabled={!hasMore}
                      className="p-2 text-nfw-blackberry/60 hover:text-nfw-blackberry disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full p-6">
              <div
                className="h-full border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-nfw-blackberry/40 transition-colors"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleUpload(e.target.files)}
                />
                <Upload className="w-12 h-12 text-nfw-blackberry/30 mb-4" />
                <p className="text-nfw-blackberry font-medium mb-1">
                  Drop an image here or click to upload
                </p>
                <p className="text-sm text-nfw-blackberry/50">
                  PNG, JPG, GIF up to 3MB
                </p>
                {uploading && (
                  <div className="mt-4">
                    <p className="text-sm text-nfw-blackberry/50 animate-pulse">
                      Uploading...
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Image?"
        message="This image will be permanently deleted. Any pages using this image will show an empty area. This cannot be undone."
        confirmLabel="Delete Image"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, file: null })}
      />
    </div>
  );
}
