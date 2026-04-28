import { createClient } from "@supabase/supabase-js";

export const metadata = {
  title: "Accessibility | National Fund for Women",
  description: "Read the Accessibility statement for National Fund for Women.",
};

export default async function AccessibilityPage() {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabaseAdmin
    .from("legal_pages")
    .select("termly_embed_code")
    .eq("slug", "accessibility")
    .single();

  return (
    <main className="min-h-screen bg-nfw-dove py-16">
      <div className="max-w-3xl mx-auto px-4">
        <h1 className="text-4xl font-bold text-nfw-blackberry mb-8 font-serif">
          Accessibility
        </h1>
        <div
          className="bg-white rounded-xl p-8 shadow-sm"
          dangerouslySetInnerHTML={{ __html: data?.termly_embed_code ?? "" }}
        />
      </div>
    </main>
  );
}