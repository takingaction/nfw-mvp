import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";

const adminClient = createSupabaseAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export default adminClient;