import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Placement = "home_feed" | string;

type CampaignRow = {
  id: string;
  title: string;
  status: string;
  placement: string;
  start_at: string | null;
  end_at: string | null;
  link_url: string | null;
  priority?: number | null;
};

type AssetRow = {
  id: string;
  campaign_id: string;
  media_type: "image" | "video";
  storage_path: string;
  mime_type: string | null;
  size_bytes: number | null;
};

type Props = {
  placement?: Placement;
  className?: string;
  expiresInSeconds?: number; // durée URL signée
};

export default function AdSlot({
  placement = "home_feed",
  className = "",
  expiresInSeconds = 300,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [asset, setAsset] = useState<AssetRow | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const now = useMemo(() => new Date(), []);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setCampaign(null);
      setAsset(null);
      setSignedUrl(null);

      // 1) Campagnes publiées par placement
      // (RLS filtre déjà status/date si tu l’as mis; on ajoute un minimum côté front)
      const { data: campaigns, error: cErr } = await supabase
        .from("ads_campaigns")
        .select("id,title,status,placement,start_at,end_at,link_url,priority")
        .eq("placement", placement)
        .eq("status", "published")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (!mounted) return;

      if (cErr) {
        setError(cErr.message);
        setLoading(false);
        return;
      }

      const visible = (campaigns ?? []).filter((c: CampaignRow) => {
        const startOk = !c.start_at || new Date(c.start_at) <= now;
        const endOk = !c.end_at || new Date(c.end_at) >= now;
        return startOk && endOk;
      });

      if (!visible.length) {
        setLoading(false);
        return;
      }

      // 2) Choisir une campagne (ici: première après tri)
      const chosen = visible[0];
      setCampaign(chosen);

      // 3) Charger l’asset lié (video/image)
      const { data: assets, error: aErr } = await supabase
        .from("ads_assets")
        .select("id,campaign_id,media_type,storage_path,mime_type,size_bytes")
        .eq("campaign_id", chosen.id)
        .order("created_at", { ascending: false })
        .limit(1);

      if (!mounted) return;

      if (aErr) {
        setError(aErr.message);
        setLoading(false);
        return;
      }

      const a = assets?.[0] ?? null;
      if (!a) {
        setLoading(false);
        return;
      }
      setAsset(a);

      // 4) URL signée (bucket privé)
      const { data: signed, error: sErr } = await supabase.storage
        .from("ads-media")
        .createSignedUrl(a.storage_path, expiresInSeconds);

      if (!mounted) return;

      if (sErr) {
        setError(sErr.message);
        setLoading(false);
        return;
      }

      setSignedUrl(signed?.signedUrl ?? null);
      setLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [placement, expiresInSeconds, now]);

  if (loading) {
    return (
      <div className={`w-full ${className}`}>
        <div className="w-full rounded-xl bg-gray-100 animate-pulse h-40" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`w-full ${className}`}>
        <div className="text-sm text-red-600">Ads error: {error}</div>
      </div>
    );
  }

  if (!campaign || !asset || !signedUrl) return null;

  const content =
    asset.media_type === "video" ? (
      <video
        src={signedUrl}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="w-full h-full object-cover"
      />
    ) : (
      <img
        src={signedUrl}
        alt={campaign.title}
        className="w-full h-full object-cover"
        loading="lazy"
      />
    );

  // Si lien: rendre cliquable
  return (
    <div className={`w-full ${className}`}>
      <div className="relative w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="aspect-[16/5] sm:aspect-[16/4] md:aspect-[16/3]">
          {campaign.link_url ? (
            <a
              href={campaign.link_url}
              target="_blank"
              rel="noreferrer"
              className="block w-full h-full"
            >
              {content}
            </a>
          ) : (
            content
          )}
        </div>
      </div>
    </div>
  );
}
