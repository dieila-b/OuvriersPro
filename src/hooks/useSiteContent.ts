import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export type SiteContentRow = {
  id: string;
  key: string;
  locale: string;
  type: "text" | "markdown" | "json" | string;
  value: string;
  is_published: boolean;
  updated_at: string;
};

export function useSiteContent(key: string, locale = "fr") {
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
  });
}

export function useUpsertSiteContent() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Partial<SiteContentRow> & { key: string; locale?: string }) => {
      const { key, locale = "fr", value = "", type = "text", is_published = true } = payload;

      const { data, error } = await supabase
        .from("site_content")
        .upsert({ key, locale, value, type, is_published }, { onConflict: "key" })
        .select("id,key,locale,type,value,is_published,updated_at")
        .single();

      if (error) throw error;
      return data as SiteContentRow;
    },
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["site_content"] });
      qc.setQueryData(["site_content", row.key, row.locale], row);
    },
  });
}
