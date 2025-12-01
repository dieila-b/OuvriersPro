// src/api/workerReviews.ts
import { supabase } from "@/lib/supabase";

export type WorkerReview = {
  id: string;
  worker_id: string;
  client_id: string | null;
  author_name: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
};

// Charger les avis d'un ouvrier donné
export async function fetchWorkerReviews(workerId: string) {
  const { data, error } = await supabase
    .from("op_ouvrier_reviews")
    .select("*")
    .eq("worker_id", workerId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as WorkerReview[];
}

// Créer un avis pour un ouvrier
export async function createWorkerReview(params: {
  workerId: string;
  rating: number;
  comment?: string;
}) {
  const { workerId, rating, comment } = params;

  // On récupère l'utilisateur connecté
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) {
    throw new Error("Vous devez être connecté pour laisser un avis.");
  }

  // On peut utiliser user.user_metadata pour le nom si configuré
  const authorName =
    (user.user_metadata &&
      (user.user_metadata.full_name ||
        `${user.user_metadata.first_name || ""} ${
          user.user_metadata.last_name || ""
        }`.trim())) ||
    null;

  const { data, error } = await supabase
    .from("op_ouvrier_reviews")
    .insert([
      {
        worker_id: workerId,
        client_id: user.id, // Doit respecter la policy client_id = auth.uid()
        author_name: authorName,
        rating,
        comment: comment || null,
      },
    ])
    .select()
    .single();

  if (error) throw error;
  return data as WorkerReview;
}
