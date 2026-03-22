import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import Link from "next/link";
import { LayoutTemplate } from "lucide-react";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminPagesPage() {
  await requireAdmin();

  const { data: pages } = await supabaseAdmin
    .from("pages")
    .select("*")
    .order("created_at", { ascending: false });

  const statusColor: Record<string, string> = {
    published: "bg-[#d4f1ad] text-[#2d1239]",
    draft: "bg-[#fdf493] text-[#2d1239]",
    unpublished: "bg-gray-100 text-gray-600",
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
          <Link
            href="/admin/pages/templates"
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-nfw-aubergine hover:bg-nfw-aubergine/90 transition-colors"
          >
            <LayoutTemplate className="w-4 h-4" />
            Manage Templates
          </Link>
        </div>

        <div className="space-y-4">
          {!pages || pages.length === 0 ? (
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
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
