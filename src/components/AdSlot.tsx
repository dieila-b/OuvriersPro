import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdCampaign = {
  id: string;
  title: string;
  link_url: string | null;
  placement: string;
  start_at: string | null;
  end_at: string | null;
  status: "draft" | "published" | "paused" | "ended";
  created_at?: string | null;
};

type AdAsset = {
  id: string;
  campaign_id: string;
  media_type: "image" | "video";
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at?: string | null;
};

type Props = {
  placement: string; // ex: "home_feed"
  className?: string;
  expiresIn?: number; // secondes (URL signée)
};

/**
 * AdSlot (Option B) — génère l'URL signée via Edge Function (server-side),
 * ce qui permet de garder le bucket ads-media en PRIVATE + policies admin-only.
 *
 * Prérequis:
 * - Edge Function: "get-ad-signed-url"
 *   Body attendu: { bucket: "ads-media", path: "<storage_path>", expiresIn: number }
 *   Réponse attendue: { signedUrl: string }
 */
const AdSlot: React.FC<Props> = ({ placement, className, expiresIn = 300 }) => {
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [asset, setAsset] = useState<AdAsset | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const reset = () => {
      setCampaign(null);
      setAsset(null);
      setSignedUrl(null);
    };

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        const nowIso = new Date().toISOString();

        // 1) Campagnes "published" visibles maintenant sur un placement
        const { data: campaigns, error: cErr } = await supabase
          .from("ads_campaigns")
          .select("id,title,link_url,placement,start_at,end_at,status,created_at")
          .eq("placement", placement)
          .eq("status", "published")
          // start_at: null OR <= now
          .or(`start_at.is.null,start_at.lte.${nowIso}`)
          // end_at: null OR >= now
          .or(`end_at.is.null,end_at.gte.${nowIso}`)
          .order("created_at", { ascending: false })
          .limit(1);

        if (cErr) throw cErr;

        const c = (campaigns?.[0] as AdCampaign | undefined) ?? null;
        if (!c) {
          if (!cancelled) reset();
          return;
        }

        // 2) Asset le plus récent de la campagne
        const { data: assets, error: aErr } = await supabase
          .from("ads_assets")
          .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes,created_at")
          .eq("campaign_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (aErr) throw aErr;

        const a = (assets?.[0] as AdAsset | undefined) ?? null;
        if (!a) {
          if (!cancelled) {
            setCampaign(c);
            setAsset(null);
            setSignedUrl(null);
          }
          return;
        }

        // 3) URL signée via Edge Function (PUBLIC SAFE)
        //    -> Ne dépend PAS des policies SELECT côté public sur storage.objects.
        const { data: fnData, error: fnErr } = await supabase.functions.invoke(
          "get-ad-signed-url",
          {
            body: {
              bucket: "ads-media",
              path: a.storage_path,
              expiresIn,
            },
          }
        );

        if (fnErr) throw fnErr;

        const url = (fnData as any)?.signedUrl as string | undefined;
        if (!url) {
          throw new Error("Signed URL not returned by function");
        }

        if (!cancelled) {
          setCampaign(c);
          setAsset(a);
          setSignedUrl(url);
        }
      } catch (e: any) {
        if (!cancelled) {
          // Astuce: si tu vois encore "Object not found", vérifie aussi la casse du chemin:
          // DB: videos/...  != Storage: Videos/...
          setError(e?.message ?? "Unknown ads error");
          reset();
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [placement, expiresIn]);

  if (loading) return null;
  if (error) return <div className="text-xs text-red-600">Ads error: {error}</div>;
  if (!campaign || !asset || !signedUrl) return null;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (campaign.link_url) {
      return (
        <a
          href={campaign.link_url}
          target="_blank"
          rel="noreferrer"
          className={className}
        >
          {children}
        </a>
      );
    }
    return <div className={className}>{children}</div>;
  };

  // Render vidéo / image
  if (asset.media_type === "video") {
    return (
      <Wrapper>
        <video
          src={signedUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          className="w-full rounded-xl shadow-sm"
        />
      </Wrapper>
    );
  }

  return (
    <Wrapper>
      <img
        src={signedUrl}
        alt={campaign.title}
        className="w-full rounded-xl shadow-sm"
        loading="lazy"
      />
    </Wrapper>
  );
};

export default AdSlot;
