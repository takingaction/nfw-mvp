import { unstable_cache, revalidateTag } from "next/cache";
import { createClient } from "@supabase/supabase-js";

/**
 * Cached reads for public CMS content (pages, sections, header, footer,
 * site settings, popups).
 *
 * Before this, every page render (including link prefetches) re-queried
 * Supabase for the same rows: ~50k site_header + ~50k site_settings +
 * ~124k pages requests a day. These rows only change when an admin saves, so
 * they are cached in Next's data cache and invalidated by tag from every admin
 * write path (see invalidateCms callers). REVALIDATE_SECONDS is a safety net
 * for edits made outside the app (SQL editor, migrations).
 *
 * Reads use the publishable key with no user session, so RLS returns exactly
 * what an anonymous visitor may see (published pages, live+visible sections,
 * active popups). Never cache per-user data here.
 */
const REVALIDATE_SECONDS = 600;

export const CMS_TAGS = {
  pages: "cms:pages", // pages + page_sections
  header: "cms:site_header",
  footer: "cms:site_footer",
  settings: "cms:site_settings",
  popups: "cms:promotional_popups",
} as const;

type CmsTag = (typeof CMS_TAGS)[keyof typeof CMS_TAGS];

const SITE_SETTINGS_ID = "00000000-0000-0000-0000-000000000001";

function publicClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type CmsPage = {
  id: string;
  status: string;
  slug: string;
  title: string | null;
  meta_title: string | null;
  meta_description: string | null;
  meta_schema: string | null;
};

export const getCachedPageBySlug = (slug: string) =>
  unstable_cache(
    async (): Promise<CmsPage | null> => {
      const { data, error } = await publicClient()
        .from("pages")
        .select("id, status, slug, title, meta_title, meta_description, meta_schema")
        .eq("slug", slug)
        .maybeSingle();
      if (error) throw new Error(`pages(${slug}): ${error.message}`); // don't cache failures
      return data;
    },
    ["cms-page-by-slug", slug],
    { tags: [CMS_TAGS.pages], revalidate: REVALIDATE_SECONDS },
  )();

export const getCachedLiveSections = (pageId: string) =>
  unstable_cache(
    async () => {
      const { data, error } = await publicClient()
        .from("page_sections")
        .select("*")
        .eq("page_id", pageId)
        .eq("version", "live")
        .eq("visible", true)
        .order("order_index");
      if (error) throw new Error(`page_sections(${pageId}): ${error.message}`);
      return data ?? [];
    },
    ["cms-live-sections", pageId],
    { tags: [CMS_TAGS.pages], revalidate: REVALIDATE_SECONDS },
  )();

export const getCachedSiteHeader = unstable_cache(
  async () => {
    const { data, error } = await publicClient().from("site_header").select("*").limit(1).maybeSingle();
    if (error) throw new Error(`site_header: ${error.message}`);
    return data;
  },
  ["cms-site-header"],
  { tags: [CMS_TAGS.header], revalidate: REVALIDATE_SECONDS },
);

export const getCachedSiteFooter = unstable_cache(
  async () => {
    const { data, error } = await publicClient().from("site_footer").select("*").limit(1).maybeSingle();
    if (error) throw new Error(`site_footer: ${error.message}`);
    return data;
  },
  ["cms-site-footer"],
  { tags: [CMS_TAGS.footer], revalidate: REVALIDATE_SECONDS },
);

export const getCachedGtmId = unstable_cache(
  async (): Promise<string | null> => {
    const { data, error } = await publicClient()
      .from("site_settings")
      .select("gtm_id")
      .eq("id", SITE_SETTINGS_ID)
      .maybeSingle();
    if (error) throw new Error(`site_settings: ${error.message}`);
    return data?.gtm_id?.trim() || null;
  },
  ["cms-gtm-id"],
  { tags: [CMS_TAGS.settings], revalidate: REVALIDATE_SECONDS },
);

/** All active popups; date windows and target pages are filtered per request by the caller. */
export const getCachedActivePopups = unstable_cache(
  async () => {
    const { data, error } = await publicClient()
      .from("promotional_popups")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true });
    if (error) throw new Error(`promotional_popups: ${error.message}`);
    return data ?? [];
  },
  ["cms-active-popups"],
  { tags: [CMS_TAGS.popups], revalidate: REVALIDATE_SECONDS },
);

/**
 * Call after any admin write to a cached table. `expire: 0` drops the entry
 * immediately, so the next visitor sees the change (no stale-while-revalidate).
 */
export function invalidateCms(...tags: CmsTag[]) {
  for (const tag of tags) revalidateTag(tag, { expire: 0 });
}
