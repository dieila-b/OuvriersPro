// src/api/ouvriers.ts
import { supabase } from "@/lib/supabase";

export type Ouvrier = {
  id: string;
  // ...autres champs
  average_rating: number | null;
  rating_count: number | null;
};

export async function fetchWorkerById(id: string) {
  const { data, error } = await supabase
    .from("op_ouvriers")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Ouvrier;
}
