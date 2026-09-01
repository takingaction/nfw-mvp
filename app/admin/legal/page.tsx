import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import LegalAdminClient from "./LegalAdminClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const LEGAL_PAGES = [
  { slug: "privacy", title: "Privacy Policy" },
  { slug: "terms-of-service", title: "Terms of Service" },
  { slug: "accessibility", title: "Accessibility" },
];

export default async function AdminLegalPage() {
  await requireAdmin({ redirectOnFailure: true });

  const { data: pages } = await supabaseAdmin
    .from("legal_pages")
    .select("slug, title, termly_embed_code");

  const pagesMap: Record<string, string | null> = {};
  (pages ?? []).forEach((p: any) => {
    pagesMap[p.slug] = p.termly_embed_code;
  });

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
            Legal Pages
          </h1>
          <p className="text-nfw-blackberry/60">
            Manage Termly embed codes for Privacy Policy, Terms of Service, and Accessibility pages
          </p>
        </div>
        <LegalAdminClient
          pages={LEGAL_PAGES.map(p => ({
            ...p,
            termly_embed_code: pagesMap[p.slug] ?? null,
          }))}
        />
      </div>
    </main>
  );
}