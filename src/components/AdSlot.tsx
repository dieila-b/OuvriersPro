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
  mime_type: string | null;
  size_bytes: number | null;
};

type Props = {
  placement: string; // ex: "home_feed"
  className?: string;
  expiresIn?: number; // secondes (URL signée)
};

const AdSlot: React.FC<Props> = ({ placement, className, expiresIn = 300 }) => {
  const [loading, setLoading] = useState(false);
  const [campaign, setCampaign] = useState<AdCampaign | null>(null);
  const [asset, setAsset] = useState<AdAsset | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const nowIso = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      setLoading(true);
      setError(null);

      try {
        // 1) Campagnes publiées (sans priority)
        const { data: campaigns, error: cErr } = await supabase
          .from("ads_campaigns")
          .select("id,title,link_url,placement,start_at,end_at,status,created_at")
          .eq("placement", placement)
          .eq("status", "published")
          .order("created_at", { ascending: false })
          .limit(1);

        if (cErr) throw cErr;

        const c = campaigns?.[0] ?? null;

        // Fenêtre de visibilité (si start_at/end_at sont utilisés)
        const isInWindow =
          !c ||
          ((c.start_at ? c.start_at <= nowIso : true) &&
            (c.end_at ? c.end_at >= nowIso : true));

        if (!c || !isInWindow) {
          if (!cancelled) {
            setCampaign(null);
            setAsset(null);
            setSignedUrl(null);
          }
          return;
        }

        // 2) Asset le plus récent
        const { data: assets, error: aErr } = await supabase
          .from("ads_assets")
          .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes,created_at")
          .eq("campaign_id", c.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (aErr) throw aErr;

        const a = assets?.[0] ?? null;
        if (!a) {
          if (!cancelled) {
            setCampaign(c);
            setAsset(null);
            setSignedUrl(null);
          }
          return;
        }

        // 3) URL signée (bucket private)
        const { data: signed, error: sErr } = await supabase.storage
          .from("ads-media")
          .createSignedUrl(a.storage_path, expiresIn);

        if (sErr) throw sErr;

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
  if (error) return <div className="text-xs text-red-600">Ads error: {error}</div>;
  if (!campaign || !asset || !signedUrl) return null;

  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    if (campaign.link_url) {
      return (
        <a href={campaign.link_url} target="_blank" rel="noreferrer" className={className}>
          {children}
        </a>
      );
    }
    return <div className={className}>{children}</div>;
  };

  // 4) Render vidéo / image
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
