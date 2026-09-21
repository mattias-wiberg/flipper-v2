import { Database } from "@/database.types";
import { getServerSupabaseConfig } from "@/lib/config";
import { createClient } from "@supabase/supabase-js";

export const createAdminClient = () => {
  const { url, serviceRoleKey } = getServerSupabaseConfig();

  return createClient<Database>(url, serviceRoleKey);
};
