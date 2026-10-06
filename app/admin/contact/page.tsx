import { createClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/middleware/adminCheck";
import ContactEditorClient from "@/components/admin/ContactEditorClient";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export default async function AdminContactPage() {
  await requireAdmin({ redirectOnFailure: true });

  const { data: contact } = await supabaseAdmin
    .from("site_contact")
    .select("*")
    .single();

  // Paginated fetch — contact_submissions will exceed the 1000-row cap eventually.
  const PAGE_SIZE = 1000;
  const allSubmissions: any[] = [];
  let contactPage = 0;
  let contactHasMore = true;

  while (contactHasMore) {
    const from = contactPage * PAGE_SIZE;
    const { data: pageData } = await supabaseAdmin
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (pageData && pageData.length > 0) {
      allSubmissions.push(...pageData);
      contactPage++;
      contactHasMore = pageData.length === PAGE_SIZE;
    } else {
      contactHasMore = false;
    }
  }

  const submissions = allSubmissions;

  return (
    <main className="min-h-screen p-8 bg-nfw-dove">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-nfw-blackberry mb-2 font-serif">
            Edit Contact Page
          </h1>
          <p className="text-nfw-blackberry/60">
            Manage hero section, contact info cards, and member CTA
          </p>
        </div>
        <ContactEditorClient initialData={contact} submissions={submissions || []} />
      </div>
    </main>
  );
}
