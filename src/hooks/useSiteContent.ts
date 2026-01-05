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

export function useSiteContentList() {
  return useQuery({
    queryKey: ["site_content_list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_content")
        .select("id,key,locale,type,value,is_published,updated_at")
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
        .select("id,key,locale,type,value,is_published,updated_at")
        .eq("key", key)
        .eq("locale", locale)
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
      const { data, error } = await supabase
        .from("site_content")
        .upsert(payload, { onConflict: "key,locale" })
        .select("id,key,locale,type,value,is_published,updated_at")
        .single();

      if (error) throw error;
      return data as SiteContentRow;
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
        .select("id,key,locale,type,value,is_published,updated_at")
        .single();

      if (error) throw error;
      return data as SiteContentRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["site_content_list"] });
      qc.setQueryData(["site_content", row.key, row.locale], row);
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
