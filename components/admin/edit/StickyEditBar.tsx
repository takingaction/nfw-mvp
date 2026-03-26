"use client";

import Link from "next/link";
import { Eye, RotateCcw, Globe, ChevronLeft } from "lucide-react";

interface Page {
  id: string;
  slug: string;
  title: string;
  status: string;
  preview_token: string;
}

interface Props {
  page: Page;
  onPublish: () => void;
  onRevert: () => void;
  onUnpublish: () => void;
  publishing: boolean;
}

export default function StickyEditBar({ page, onPublish, onRevert, onUnpublish, publishing }: Props) {
  const statusColor: Record<string, string> = {
    published: "bg-nfw-citrine text-nfw-blackberry",
    draft: "bg-nfw-citrine/50 text-nfw-blackberry",
    unpublished: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Left side */}
          <div className="flex items-center gap-4">
            <Link
              href="/admin/pages"
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-nfw-blackberry transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Admin
            </Link>
            <div className="w-px h-4 bg-gray-200" />
            <h1 className="font-bold text-nfw-blackberry">{page.title}</h1>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                statusColor[page.status] ?? "bg-gray-100 text-gray-600"
              }`}
            >
              {page.status}
            </span>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href={`/preview/${page.preview_token}/${page.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-nfw-blackberry bg-nfw-blackberry/5 hover:bg-nfw-blackberry/10 transition-colors"
            >
              <Eye className="w-4 h-4" />
              Preview
            </Link>

            {page.status === "published" && (
              <>
                <button
                  onClick={onRevert}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  <RotateCcw className="w-4 h-4" />
                  Revert
                </button>
                <button
                  onClick={onUnpublish}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                >
                  Unpublish
                </button>
              </>
            )}

            <button
              onClick={onPublish}
              disabled={publishing}
              className="flex items-center gap-2 px-5 py-2 text-sm font-bold text-white bg-nfw-blackberry hover:bg-nfw-blackberry/90 disabled:opacity-50 transition-colors"
            >
              <Globe className="w-4 h-4" />
              {publishing ? "Publishing..." : "Publish"}
            </button>

            <Link
              href={`/${page.slug}`}
              target="_blank"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-nfw-blackberry border border-nfw-blackberry/20 hover:bg-nfw-blackberry/5 transition-colors"
            >
              Done Editing
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
