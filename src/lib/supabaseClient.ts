// src/lib/supabaseClient.ts
// Ton projet utilise un client Supabase centralisé dans:
//   /src/integrations/supabase/client.ts
// Donc on ne recrée PAS un client ici → on le ré-exporte proprement.

export { supabase } from '@/integrations/supabase/client';
