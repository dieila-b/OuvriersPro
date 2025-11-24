// src/hooks/use-worker-search-filters.ts
import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

export type WorkerSearchFilters = {
  service: string;
  ville: string;
  commune: string;
  quartier: string;

  // (optionnel) tu pourras en ajouter d'autres:
  distanceKm?: string;
  minPrice?: string;
  maxPrice?: string;
  minRating?: string;
};

const DEFAULTS: WorkerSearchFilters = {
  service: "",
  ville: "",
  commune: "",
  quartier: "",
};

export function useWorkerSearchFilters() {
  const [params, setParams] = useSearchParams();

  const filters = useMemo<WorkerSearchFilters>(() => {
    return {
      service: params.get("service") ?? DEFAULTS.service,
      ville: params.get("ville") ?? DEFAULTS.ville,
      commune: params.get("commune") ?? DEFAULTS.commune,
      quartier: params.get("quartier") ?? DEFAULTS.quartier,

      distanceKm: params.get("distanceKm") ?? undefined,
      minPrice: params.get("minPrice") ?? undefined,
      maxPrice: params.get("maxPrice") ?? undefined,
      minRating: params.get("minRating") ?? undefined,
    };
  }, [params]);

  function updateFilters(next: Partial<WorkerSearchFilters>, replace = true) {
    const merged = { ...filters, ...next };

    // Nettoie les params vides
    const cleanEntries = Object.entries(merged).filter(
      ([, v]) => v !== undefined && String(v).trim() !== ""
    );

    setParams(cleanEntries as any, { replace });
  }

  function resetFilters() {
    setParams([], { replace: true });
  }

  return { filters, updateFilters, resetFilters };
}
