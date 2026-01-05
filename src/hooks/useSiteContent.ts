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

/**
 * ⚠️ Important:
 * - maybeSingle() plante si la requête retourne >1 ligne
 * - Cela arrive si tu as des doublons (key, locale)
 * ✅ Solution: on force limit(1) puis maybeSingle()
 */
export function useSiteContent(key: string, locale: string) {
  return useQuery({
    queryKey: ["site_content", key, locale],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select(SELECT_FIELDS)
        .eq("key", key)
        .eq("locale", locale)
        .order("updated_at", { ascending: false }) // si doublons, on prend le plus récent
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as SiteContentRow | null;
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
      /**
       * ⚠️ .single() peut aussi planter si Supabase retourne plusieurs lignes
       * (ou si la contrainte unique n’existe pas encore)
       * ✅ On sécurise: limit(1) + maybeSingle()
       */
      const { data, error } = await supabase
        .from("site_content")
        .upsert(payload, { onConflict: "key,locale" })
        .select(SELECT_FIELDS)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      // Si la DB renvoie null (cas rare), on force une lecture derrière
      if (!data) {
        const { data: fallback, error: e2 } = await supabase
          .from("site_content")
          .select(SELECT_FIELDS)
          .eq("key", payload.key)
          .eq("locale", payload.locale)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (e2) throw e2;
        return (fallback ?? null) as SiteContentRow;
      }

      return data as SiteContentRow;
    },
    onSuccess: (row) => {
      if (!row) return;
      qc.invalidateQueries({ queryKey: ["site_content_list"] });
      qc.setQueryData(["site_content", row.key, row.locale], row);
    },
  });
}

export function useTogglePublishSiteContent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; is_published: boolean }) => {
      /**
       * ⚠️ .single() peut planter si la requête renvoie 0 ou >1 ligne
       * ✅ On sécurise: limit(1) + maybeSingle()
       */
      const { data, error } = await supabase
        .from("site_content")
        .update({ is_published: payload.is_published })
        .eq("id", payload.id)
        .select(SELECT_FIELDS)
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return (data ?? null) as SiteContentRow | null;
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
