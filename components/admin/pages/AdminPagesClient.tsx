"use client";

import { useState } from "react";
import Link from "next/link";
import { LayoutTemplate, Plus, Trash2 } from "lucide-react";
import NewPageModal from "@/components/admin/pages/NewPageModal";
import ConfirmModal from "@/components/admin/ConfirmModal";

interface Page {
  id: string;
  title: string;
  slug: string;
  status: string;
  preview_token: string;
}

export default function AdminPagesClient({ pages }: { pages: Page[] }) {
  const [showNewModal, setShowNewModal] = useState(false);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    pageId: string | null;
    pageTitle: string;
  }>({ isOpen: false, pageId: null, pageTitle: "" });

  const statusColor: Record<string, string> = {
    published: "bg-[#d4f1ad] text-[#2d1239]",
    draft: "bg-[#fdf493] text-[#2d1239]",
    unpublished: "bg-gray-100 text-gray-600",
  };

  const handleDelete = async () => {
    if (!deleteModal.pageId) return;

    const { createClient } = await import("@supabase/supabase-js");
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    await supabaseAdmin
      .from("pages")
      .delete()
      .eq("id", deleteModal.pageId);

    setDeleteModal({ isOpen: false, pageId: null, pageTitle: "" });
    window.location.reload();
  };

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
              Manage Pages
            </h1>
            <p className="text-nfw-blackberry/60">
              Edit page content, reorder sections, and publish changes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/pages/templates"
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-nfw-aubergine hover:bg-nfw-aubergine/90 transition-colors"
            >
              <LayoutTemplate className="w-4 h-4" />
              Manage Templates
            </Link>
            <button
              onClick={() => setShowNewModal(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-nfw-blackberry hover:bg-nfw-blackberry/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              New Page
            </button>
          </div>
        </div>

        <div className="space-y-4">
          {pages.length === 0 ? (
            <div className="bg-white border border-nfw-blackberry/10 p-12 text-center">
              <p className="text-nfw-blackberry/40">No pages found.</p>
            </div>
          ) : (
            pages.map((page) => (
              <div
                key={page.id}
                className="bg-white border border-nfw-blackberry/10 p-6 hover:border-nfw-blackberry/20 transition-all"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <h2 className="text-xl font-black text-nfw-blackberry">
                          {page.title}
                        </h2>
                        <span
                          className={`text-xs px-2.5 py-1 font-semibold ${statusColor[page.status] ?? "bg-nfw-stone/20 text-nfw-blackberry/60"}`}
                        >
                          {page.status}
                        </span>
                      </div>
                      <p className="text-sm text-nfw-blackberry/50">/{page.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/preview/${page.preview_token}/${page.slug}`}
                      target="_blank"
                      className="px-4 py-2 text-sm font-semibold text-nfw-blackberry bg-nfw-blackberry/5 hover:bg-nfw-blackberry/10 transition-colors"
                    >
                      Preview
                    </Link>
                    <Link
                      href={`/admin/pages/${page.id}`}
                      className="px-4 py-2 text-sm font-semibold text-white bg-nfw-blackberry hover:bg-nfw-blackberry/90 transition-colors"
                    >
                      Edit Page
                    </Link>
                    <button
                      onClick={() => setDeleteModal({ isOpen: true, pageId: page.id, pageTitle: page.title })}
                      className="p-2 text-red-500 hover:bg-red-50 transition-colors"
                      title="Delete page"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <NewPageModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreated={(pageId) => {
          window.location.href = `/admin/pages/${pageId}`;
        }}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        title="Delete Page"
        message={`Are you sure you want to delete "${deleteModal.pageTitle}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteModal({ isOpen: false, pageId: null, pageTitle: "" })}
      />
    </main>
  );
}
