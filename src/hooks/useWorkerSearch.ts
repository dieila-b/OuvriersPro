// src/hooks/useWorkerSearch.ts
import { useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";

interface WorkerCard {
  id: string;
  name: string;
  job: string;
  country: string;
  region: string;
  city: string;
  commune: string;
  district: string;
  experienceYears: number;
  hourlyRate: number;
  currency: string;
  rating: number;
  ratingCount: number;
  lat?: number | null;
  lng?: number | null;
}

export function useWorkerSearch() {
  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (serviceFilter: string, districtFilter: string, language: string) => {
    setLoading(true);
    setError(null);

    try {
      console.log("🔍 Recherche avec:", { service: serviceFilter, district: districtFilter });

      let query = supabase
        .from("op_ouvriers")
        .select(
          `
          id,
          first_name,
          last_name,
          profession,
          country,
          region,
          city,
          commune,
          district,
          hourly_rate,
          currency,
          years_experience,
          average_rating,
          rating_count,
          status,
          latitude,
          longitude
        `
        )
        .eq("status", "approved");

      // ✅ Filtre SQL métier (profession) si fourni
      if (serviceFilter.trim()) {
        query = query.ilike("profession", `%${serviceFilter.trim()}%`);
      }

      // ✅ Filtre SQL quartier (district) si fourni
      if (districtFilter.trim()) {
        query = query.ilike("district", `%${districtFilter.trim()}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Supabase error:", error);
        setError(
          language === "fr"
            ? "Impossible de charger les professionnels pour le moment."
            : "Unable to load professionals at the moment."
        );
        return;
      }

      console.log("✅ Résultats trouvés:", data?.length);

      const mapped: WorkerCard[] =
        (data ?? []).map((w) => ({
          id: w.id,
          name:
            ((w.first_name || "") +
              (w.last_name ? ` ${w.last_name}` : "")) || "Ouvrier",
          job: w.profession ?? "",
          country: w.country ?? "",
          region: w.region ?? "",
          city: w.city ?? "",
          commune: w.commune ?? "",
          district: w.district ?? "",
          experienceYears: w.years_experience ?? 0,
          hourlyRate: w.hourly_rate ?? 0,
          currency: w.currency ?? "GNF",
          rating: w.average_rating ?? 0,
          ratingCount: w.rating_count ?? 0,
          lat: w.latitude ?? null,
          lng: w.longitude ?? null,
        })) ?? [];

      setWorkers(mapped);
    } catch (e) {
      console.error(e);
      setError(
        language === "fr"
          ? "Une erreur est survenue lors du chargement."
          : "An error occurred while loading."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  return { workers, loading, error, search };
}
