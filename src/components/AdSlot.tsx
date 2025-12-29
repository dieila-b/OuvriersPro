import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type AdCampaign = {
  id: string;
  title: string;
  link_url: string | null;
  placement: string;
  start_at: string | null;
  end_at: string | null;
  status: "draft" | "published" | "paused" | "ended";
  created_at?: string;
};

type AdAsset = {
  id: string;
  campaign_id: string;
  media_type: "image" | "video";
  storage_path: string;
  mime_type?: string | null;
  size_bytes?: number | null;
  created_at?: string;
};

type Props = {
  placement: string;
  className?: string;
  expiresIn?: number;
};

const BUCKET = "ads-media";

const AdSlot: React.FC<Props> = ({ placement, className, expiresIn = 300 }) => {
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [asset, setAsset] = useState<AdAsset | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // évite une valeur figée qui pourrait bloquer les fenêtres start/end
  const nowIso = useMemo(() => new Date().toISOString(), [placement]);

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
        // 1) Dernière campagne publiée pour ce placement
        const { data: campaigns, error: cErr } = await supabase
          .from("ads_campaigns")
          .select("id,title,link_url,placement,start_at,end_at,status,created_at")
          .eq("placement", placement)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(1);

        if (cErr) throw cErr;

        const c = (campaigns?.[0] as AdCampaign) ?? null;

        const inWindow =
          !!c &&
          (c.start_at ? c.start_at <= nowIso : true) &&
          (c.end_at ? c.end_at >= nowIso : true);

        if (!c || !inWindow) {
          if (!cancelled) reset();
          return;
        }

        // 2) Dernier asset de cette campagne
        const { data: assets, error: aErr } = await supabase
          .from("ads_assets")
          .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes,created_at")
          .eq("campaign_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (aErr) throw aErr;

        const a = (assets?.[0] as AdAsset) ?? null;
        if (!a?.storage_path) {
          if (!cancelled) {
            setCampaign(c);
            setAsset(null);
            setSignedUrl(null);
          }
          return;
        }

        // 3) URL signée via Storage (Option A)
        const { data: signed, error: sErr } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(a.storage_path, expiresIn);

        // si le fichier n'existe plus côté storage, on masque la pub au lieu d'afficher une erreur
        if (sErr) {
          if (!cancelled) reset();
          return;
        }

        if (!cancelled) {
          setCampaign(c);
          setAsset(a);
          setSignedUrl(signed?.signedUrl ?? null);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Unknown ads error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [placement, expiresIn, nowIso]);

  if (loading) return null;

  // pour la home: on ne montre pas d'erreur, on masque juste
  if (error) return null;

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
