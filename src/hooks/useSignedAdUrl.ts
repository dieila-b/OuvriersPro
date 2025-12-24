// src/hooks/useSignedAdUrl.ts
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export function useSignedAdUrl(storagePath: string | null, expiresInSec = 300) {
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const run = async () => {
      if (!storagePath) {
        setUrl(null);
        return;
      }
      setLoading(true);

      const { data, error } = await supabase.storage
        .from("ads-media")
        .createSignedUrl(storagePath, expiresInSec);

      setLoading(false);

      if (error) {
        console.error("signed url error", error);
        setUrl(null);
        return;
      }
      setUrl(data.signedUrl);
    };

    run();
  }, [storagePath, expiresInSec]);

  return { url, loading };
}
