// src/lib/supabase.ts
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://bvezcivihjpscatsgrvu.supabase.co";

// ✅ clé anon public (ok côté front)
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2ZXpjaXZpaGpwc2NhdHNncnZ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMwMjU2ODcsImV4cCI6MjA3ODYwMTY4N30.qX1lSNOgcYa-7HWLs6XQBx0Zlb1yd5dyRQ3s_uBeKtk";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("[Supabase] Missing config", {
    hasUrl: !!SUPABASE_URL,
    hasAnon: !!SUPABASE_ANON_KEY,
  });
  throw new Error("supabaseKey is required.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
