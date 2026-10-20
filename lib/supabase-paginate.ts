import type { PostgrestError } from "@supabase/supabase-js";

// PostgREST caps every response at the project's "Max rows" setting (1000 by
// default) and truncates SILENTLY: no error, no flag, just fewer rows. Any read
// that can return more rows than that must page with .range().
//
// These helpers return the same { data, error } shape as a normal supabase-js
// query, so they drop in where an unpaginated query was:
//
//   const { data: grants, error } = await fetchAllPages((from, to) =>
//     supabase.from("grants").select("id, status").eq("cycle_id", id)
//       .order("id").range(from, to),
//   );
//
// Always include a stable .order() on a unique column (usually "id"), or rows
// can repeat or go missing across page boundaries.
export const PAGE_SIZE = 1000;

// Long .in() filters go into the request URL. A few hundred UUIDs is ~20KB,
// which is where proxies start rejecting requests, so chunk them.
export const IN_CHUNK_SIZE = 100;

type PageResult<T> = PromiseLike<{
  data: T[] | null;
  error: PostgrestError | null;
}>;

export type AllPagesResult<T> =
  | { data: T[]; error: null }
  | { data: null; error: PostgrestError };

// Default `any` matches what an untyped supabase client returns for a plain query.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllPages<T = any>(
  page: (from: number, to: number) => PageResult<T>,
): Promise<AllPagesResult<T>> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) return { data: null, error };
    if (data) rows.push(...data);
    if (!data || data.length < PAGE_SIZE) break;
  }
  return { data: rows, error: null };
}

// For queries filtered by a potentially long list of values: de-duplicates the
// list, splits it into chunks, and pages within each chunk.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetchAllPagesIn<T = any, V = string>(
  values: readonly V[],
  page: (chunk: V[], from: number, to: number) => PageResult<T>,
  chunkSize = IN_CHUNK_SIZE,
): Promise<AllPagesResult<T>> {
  const unique = Array.from(new Set(values));
  const rows: T[] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const res = await fetchAllPages<T>((from, to) => page(chunk, from, to));
    if (res.error) return res;
    rows.push(...res.data);
  }
  return { data: rows, error: null };
}
