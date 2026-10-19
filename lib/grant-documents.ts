import type { SupabaseClient } from "@supabase/supabase-js";

// PostgREST caps every response at the project's "Max rows" setting (1000 by
// default) and truncates silently. A cycle with 500+ applications can easily
// have more than 1000 attachments, so fetching them in one `.in()` query
// dropped documents from the scoring pages. Fetch in grant-id chunks (which
// also keeps the request URL short) and page within each chunk.
const GRANT_ID_CHUNK = 100;
const PAGE_SIZE = 1000;

const DOCUMENT_COLUMNS =
  "id, file_name, file_size, uploaded_at, document_url, grant_id, uploaded_by";

export async function fetchDocumentsByGrant(
  supabase: SupabaseClient,
  grantIds: string[],
): Promise<Record<string, any[]>> {
  const byGrant: Record<string, any[]> = {};

  for (let i = 0; i < grantIds.length; i += GRANT_ID_CHUNK) {
    const chunk = grantIds.slice(i, i + GRANT_ID_CHUNK);

    for (let from = 0; ; from += PAGE_SIZE) {
      const { data, error } = await supabase
        .from("grant_documents")
        .select(DOCUMENT_COLUMNS)
        .in("grant_id", chunk)
        .order("id", { ascending: true })
        .range(from, from + PAGE_SIZE - 1);

      if (error) {
        throw new Error(`Failed to load grant documents: ${error.message}`);
      }

      for (const doc of data || []) {
        (byGrant[doc.grant_id] ||= []).push(doc);
      }

      if (!data || data.length < PAGE_SIZE) break;
    }
  }

  return byGrant;
}
