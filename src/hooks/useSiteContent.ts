import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type SiteContentRow = {
  id: string;
  key: string;
  locale: string; // fr | en | ...
  type: "text" | "markdown" | "json" | string;
  value: string;
  is_published: boolean;
  updated_at: string;
};

const SELECT_FIELDS = "id,key,locale,type,value,is_published,updated_at";

/**
 * Utilitaire: évite .single() / .maybeSingle() quand le backend retourne
 * parfois un tableau ou quand la vue/rls crée un comportement non attendu.
 */
function firstOrNull<T>(data: T[] | T | null | undefined): T | null {
  if (!data) return null;
  if (Array.isArray(data)) return (data[0] ?? null) as T | null;
  return data as T;
}

export function useSiteContentList() {
  return useQuery({
    queryKey: ["site_content_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select(SELECT_FIELDS)
        .order("key", { ascending: true })
        .order("locale", { ascending: true });

      if (error) throw error;
      return (data ?? []) as SiteContentRow[];
    },
  });
}

export function useSiteContent(key: string, locale: string) {
  return useQuery({
    queryKey: ["site_content", key, locale],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select(SELECT_FIELDS)
        .eq("key", key)
        .eq("locale", locale)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return (firstOrNull<SiteContentRow>(data) ?? null) as SiteContentRow | null;
    },
    enabled: Boolean(key) && Boolean(locale),
  });
}

export function useUpsertSiteContent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      key: string;
      locale: string;
      type: string;
      value: string;
      is_published: boolean;
    }) => {
      // IMPORTANT:
      // - .single() peut casser si la DB renvoie 0 ou >1 ligne
      // - on sécurise: limit(1) et lecture first
      const { data, error } = await supabase
        .from("site_content")
        .upsert(payload, { onConflict: "key,locale" })
        .select(SELECT_FIELDS)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const row = firstOrNull<SiteContentRow>(data);
      if (row) return row;

      // Fallback: relire
      const { data: fallback, error: e2 } = await supabase
        .from("site_content")
        .select(SELECT_FIELDS)
        .eq("key", payload.key)
        .eq("locale", payload.locale)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (e2) throw e2;

      const row2 = firstOrNull<SiteContentRow>(fallback);
      if (!row2) throw new Error("Upsert OK mais aucune ligne retournée (RLS/SELECT ?).");
      return row2;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["site_content_list"] });
      qc.setQueryData(["site_content", row.key, row.locale], row);
    },
  });
}

export function useTogglePublishSiteContent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; is_published: boolean }) => {
      const { data, error } = await supabase
        .from("site_content")
        .update({ is_published: payload.is_published })
        .eq("id", payload.id)
        .select(SELECT_FIELDS)
        .limit(1);

      if (error) throw error;

      const row = firstOrNull<SiteContentRow>(data);
      return (row ?? null) as SiteContentRow | null;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["site_content_list"] });
      if (row) qc.setQueryData(["site_content", row.key, row.locale], row);
    },
  });
}

export function useDeleteSiteContent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string }) => {
      const { error } = await supabase.from("site_content").delete().eq("id", payload.id);
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["site_content_list"] });
    },
  });
}
