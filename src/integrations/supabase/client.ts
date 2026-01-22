// src/integrations/supabase/client.ts
import { createClient } from "@supabase/supabase-js";

// Configuration Supabase avec valeurs en dur (le projet est externe)
const SUPABASE_URL = "https://bvezcivihjpscatsgrvu.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2ZXpjaXZpaGpwc2NhdHNncnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjU2ODcsImV4cCI6MjA3ODYwMTY4N30.qX1lSNOgcYa-7HWLs6XQBx0Zlb1yd5dyRQ3s_uBeKtk";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
