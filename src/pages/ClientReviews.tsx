// src/pages/ClientReviews.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2, Star } from "lucide-react";
import ClientReviewReplies from "@/components/reviews/ClientReviewReplies";

type ClientRow = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
};

type ReviewRow = {
  id: string;
  worker_id: string;
  client_id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;

  worker?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profession: string | null;
    city: string | null;
    commune: string | null;
    district: string | null;
  } | null;
};

const ClientReviews: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [client, setClient] = useState<ClientRow | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = useMemo(() => {
    return {
      title: language === "fr" ? "Avis reçus" : "Received reviews",
      back: language === "fr" ? "Retour à l’espace client" : "Back to client space",
      loadError: language === "fr" ? "Impossible de charger vos avis." : "Unable to load your reviews.",
      noReviews: language === "fr" ? "Aucun avis pour le moment." : "No reviews yet.",
      fromWorker: language === "fr" ? "Ouvrier" : "Worker",
      replyInfo:
        language === "fr"
          ? "Vous pouvez répondre à cet avis. La réponse est visible publiquement."
          : "You can reply to this review. The reply is publicly visible.",
    };
  }, [language]);

  const fullName = (first?: string | null, last?: string | null) =>
    `${first || ""} ${last || ""}`.trim() || "—";

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const stars = (rating?: number | null) => {
    const r = Math.max(0, Math.min(5, Number(rating || 0)));
    return (
      <div className="flex items-center gap-1">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star
            key={i}
            className={`w-4 h-4 ${i < r ? "text-orange-500" : "text-slate-300"}`}
            fill={i < r ? "currentColor" : "none"}
          />
        ))}
      </div>
    );
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) throw authError || new Error("No user");

        const { data: clientData, error: clientErr } = await supabase
          .from("op_clients")
          .select("id, user_id, first_name, last_name, email, phone")
          .eq("user_id", authData.user.id)
          .maybeSingle();

        if (clientErr) throw clientErr;
        if (!clientData) throw new Error(language === "fr" ? "Profil client introuvable." : "Client profile not found.");

        const c = clientData as ClientRow;
        setClient(c);

        const { data: reviewsData, error: reviewsErr } = await supabase
          .from("op_worker_client_reviews")
          .select(
            `
            id,
            worker_id,
            client_id,
            rating,
            comment,
            created_at,
            worker:op_ouvriers (
              id,
              first_name,
              last_name,
              profession,
              city,
              commune,
              district
            )
          `
          )
          .eq("client_id", c.id)
          .order("created_at", { ascending: false });

        if (reviewsErr) throw reviewsErr;

        const mapped: ReviewRow[] = (reviewsData || []).map((r: any) => ({
          ...r,
          worker: r.worker ?? null,
        }));

        setReviews(mapped);
      } catch (e) {
        console.error("ClientReviews load error", e);
        setError(t.loadError);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [language, t.loadError]);

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-slate-600"
            onClick={() => navigate("/espace-client")}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>

          <h1 className="text-2xl font-bold text-slate-900">{t.title}</h1>
          <div className="w-[140px]" />
        </div>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="w-4 h-4 animate-spin" />
            {language === "fr" ? "Chargement..." : "Loading..."}
          </div>
        )}

        {error && (
          <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}

        {!loading && !error && reviews.length === 0 && (
          <div className="text-sm text-slate-500">{t.noReviews}</div>
        )}

        {!loading && !error && reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((r) => {
              const workerName = r.worker ? fullName(r.worker.first_name, r.worker.last_name) : "—";
              const workerMeta = [r.worker?.profession, r.worker?.city, r.worker?.commune, r.worker?.district]
                .filter(Boolean)
                .join(" • ");

              return (
                <Card key={r.id} className="p-5 rounded-2xl border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm text-slate-500">{t.fromWorker}</div>
                      <div className="text-lg font-semibold text-slate-900 truncate">{workerName}</div>
                      {workerMeta && <div className="text-xs text-slate-500 mt-1">{workerMeta}</div>}
                      <div className="text-xs text-slate-400 mt-2">{formatDateTime(r.created_at)}</div>
                    </div>
                    <div className="shrink-0">{stars(r.rating)}</div>
                  </div>

                  {r.comment && (
                    <div className="mt-4 rounded-xl bg-slate-50 border border-slate-100 p-4">
                      <div className="text-sm text-slate-800 whitespace-pre-line">{r.comment}</div>
                    </div>
                  )}

                  <div className="mt-4 text-xs text-slate-500">{t.replyInfo}</div>

                  <ClientReviewReplies reviewId={r.id} clientId={client?.id ?? null} canReply={true} />
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientReviews;
