// src/hooks/useSiteContent.ts
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

type ListOptions = {
  /**
   * true = site public (ne charge que le contenu publié)
   * false = backoffice/debug (charge tout)
   */
  publishedOnly?: boolean;
};

export function useSiteContentList(options: ListOptions = {}) {
  const { publishedOnly = true } = options;

  return useQuery({
    queryKey: ["site_content_list", { publishedOnly }],
    queryFn: async () => {
      let q = supabase.from("site_content").select(SELECT_FIELDS);

      if (publishedOnly) q = q.eq("is_published", true);

      const { data, error } = await q
        .order("key", { ascending: true })
        .order("locale", { ascending: true });

      if (error) throw error;
      return (data ?? []) as SiteContentRow[];
    },
  });
}

type GetOptions = {
  publishedOnly?: boolean;
};

export function useSiteContent(key: string, locale: string, options: GetOptions = {}) {
  const { publishedOnly = true } = options;

  return useQuery({
    queryKey: ["site_content", key, locale, { publishedOnly }],
    queryFn: async () => {
      let q = supabase
        .from("site_content")
        .select(SELECT_FIELDS)
        .eq("key", key)
        .eq("locale", locale);

      if (publishedOnly) q = q.eq("is_published", true);

      const { data, error } = await q
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;
      return ((data?.[0] ?? null) as SiteContentRow | null);
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
      const { data, error } = await supabase
        .from("site_content")
        .upsert(payload, { onConflict: "key,locale" })
        .select(SELECT_FIELDS)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (error) throw error;

      const row = (data?.[0] ?? null) as SiteContentRow | null;
      if (row) return row;

      const { data: fallback, error: e2 } = await supabase
        .from("site_content")
        .select(SELECT_FIELDS)
        .eq("key", payload.key)
        .eq("locale", payload.locale)
        .order("updated_at", { ascending: false })
        .limit(1);

      if (e2) throw e2;
      return ((fallback?.[0] ?? null) as SiteContentRow | null);
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["site_content_list"] });
      if (row) {
        // On met aussi à jour la cache entry "publishedOnly" et "all"
        qc.setQueryData(["site_content", row.key, row.locale, { publishedOnly: true }], row.is_published ? row : null);
        qc.setQueryData(["site_content", row.key, row.locale, { publishedOnly: false }], row);
      }
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
      return ((data?.[0] ?? null) as SiteContentRow | null);
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["site_content_list"] });
      if (row) {
        qc.setQueryData(["site_content", row.key, row.locale, { publishedOnly: true }], row.is_published ? row : null);
        qc.setQueryData(["site_content", row.key, row.locale, { publishedOnly: false }], row);
      }
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
