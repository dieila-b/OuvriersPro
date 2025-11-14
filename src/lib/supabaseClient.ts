// src/lib/supabaseClient.ts

// Alias rétro-compatible : si certaines parties du code importent encore
// "@/lib/supabaseClient", on les redirige vers le client central "@/lib/supabase".
// À terme, tu peux remplacer tous les imports par "@/lib/supabase" puis supprimer ce fichier.

export { supabase } from "./supabase";
