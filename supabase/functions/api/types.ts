import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type AppVariables = {
  userId: string;
  supabase: SupabaseClient;
};
