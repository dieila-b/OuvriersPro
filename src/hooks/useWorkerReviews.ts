import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuthProfile } from "@/hooks/useAuthProfile";

export type WorkerReview = {
  id: string;
  worker_id: string;
  client_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  updated_at: string;
  client_name: string | null;
};

export const useWorkerReviews = (workerId: string) => {
  const { user, isClient } = useAuthProfile();
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReviews = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from("op_worker_reviews")
        .select(
          `
          id,
          worker_id,
          client_id,
          rating,
          comment,
          created_at,
          updated_at,
          client:op_users(full_name)
        `
        )
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formatted: WorkerReview[] =
        (data ?? []).map((row: any) => ({
          id: row.id,
          worker_id: row.worker_id,
          client_id: row.client_id,
          rating: row.rating,
          comment: row.comment,
          created_at: row.created_at,
          updated_at: row.updated_at,
          client_name: row.client?.full_name ?? null,
        }));

      setReviews(formatted);
    } catch (err: any) {
      console.error("[useWorkerReviews] error", err);
      setError(
        "Impossible de charger les avis pour le moment. Merci de réessayer."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (workerId) {
      loadReviews();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const upsertReview = async (rating: number, comment: string) => {
    if (!user) throw new Error("Utilisateur non authentifié");

    const payload = {
      worker_id: workerId,
      client_id: user.id,
      rating,
      comment,
    };

    const { error } = await supabase
      .from("op_worker_reviews")
      .upsert(payload, { onConflict: "worker_id,client_id" });

    if (error) throw error;

    await loadReviews();
  };

  return {
    reviews,
    loading,
    error,
    upsertReview,
    isClient,
    currentUserId: user?.id ?? null,
  };
};
