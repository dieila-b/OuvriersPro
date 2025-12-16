import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Star, Send } from "lucide-react";

type WorkerRow = {
  id: string; // op_ouvriers.id
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
};

type ContactRow = {
  id: string;
  worker_id: string | null;
  client_id: string | null; // ⚠️ doit être op_clients.id
  client_name: string | null;
  status: string | null;
  created_at: string;
};

type ReviewRow = {
  id: string;
  worker_id: string;
  client_id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;

  // optionnel si tu veux afficher le client_name via contacts
  client_name?: string | null;
};

const WorkerReviews: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [worker, setWorker] = useState<WorkerRow | null>(null);

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>("");

  const [myReviews, setMyReviews] = useState<ReviewRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const t = useMemo(() => {
    return {
      title: language === "fr" ? "Laisser un avis sur un client" : "Leave a review for a client",
      back: language === "fr" ? "Retour à l’espace ouvrier" : "Back to worker space",
      selectClient: language === "fr" ? "Sélectionner un client" : "Select a client",
      rating: language === "fr" ? "Note" : "Rating",
      comment: language === "fr" ? "Commentaire" : "Comment",
      placeholder: language === "fr" ? "Écrivez votre avis…" : "Write your review…",
      send: language === "fr" ? "Publier l’avis" : "Publish review",
      loadError: language === "fr" ? "Impossible de charger les clients/avis." : "Unable to load clients/reviews.",
      postError: language === "fr" ? "Impossible de publier l’avis." : "Unable to publish the review.",
      postOk: language === "fr" ? "Avis publié." : "Review published.",
      myReviews: language === "fr" ? "Mes avis publiés" : "My published reviews",
      noContacts: language === "fr" ? "Aucun client dans vos échanges." : "No clients in your threads.",
      noReviews: language === "fr" ? "Aucun avis publié pour le moment." : "No reviews published yet.",
    };
  }, [language]);

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

  const StarsInput = () => (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => {
        const v = i + 1;
        return (
          <button
            key={v}
            type="button"
            onClick={() => setRating(v)}
            className="p-1"
            aria-label={`star-${v}`}
          >
            <Star
              className={`w-5 h-5 ${v <= rating ? "text-orange-500" : "text-slate-300"}`}
              fill={v <= rating ? "currentColor" : "none"}
            />
          </button>
        );
      })}
    </div>
  );

  const loadAll = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw authError || new Error("No user");

      // worker profile
      const { data: workerData, error: wErr } = await supabase
        .from("op_ouvriers")
        .select("id, user_id, first_name, last_name")
        .eq("user_id", authData.user.id)
        .maybeSingle();

      if (wErr) throw wErr;
      if (!workerData) throw new Error(language === "fr" ? "Profil ouvrier introuvable." : "Worker profile not found.");

      const w = workerData as WorkerRow;
      setWorker(w);

      // contacts (clients connus via échanges)
      const { data: contactsData, error: cErr } = await supabase
        .from("op_ouvrier_contacts")
        .select("id, worker_id, client_id, client_name, status, created_at")
        .eq("worker_id", w.id)
        .order("created_at", { ascending: false });

      if (cErr) throw cErr;

      const list = (contactsData || []) as ContactRow[];
      // garder uniquement ceux qui ont un client_id
      const usable = list.filter((x) => !!x.client_id);
      setContacts(usable);

      if (!selectedClientId && usable.length > 0) {
        setSelectedClientId(usable[0].client_id as string);
      }

      // mes reviews publiés
      const { data: reviewsData, error: rErr } = await supabase
        .from("op_worker_client_reviews")
        .select("id, worker_id, client_id, rating, comment, created_at")
        .eq("worker_id", w.id)
        .order("created_at", { ascending: false });

      if (rErr) throw rErr;

      // enrichir client_name depuis contacts si possible
      const mapName = new Map<string, string>();
      usable.forEach((c) => {
        if (c.client_id) mapName.set(c.client_id, c.client_name || "Client");
      });

      const mapped: ReviewRow[] = (reviewsData || []).map((r: any) => ({
        ...r,
        client_name: mapName.get(r.client_id) || "Client",
      }));

      setMyReviews(mapped);
    } catch (e) {
      console.error("WorkerReviews load error", e);
      setError(t.loadError);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const handlePublish = async () => {
    if (!worker) return;
    if (!selectedClientId) return;

    const content = comment.trim();
    if (!content) return;

    setPosting(true);
    setError(null);
    setOk(null);

    try {
      const payload = {
        worker_id: worker.id,          // op_ouvriers.id
        client_id: selectedClientId,   // op_clients.id (PAS auth.uid())
        rating,
        comment: content,
      };

      const { data, error } = await supabase
        .from("op_worker_client_reviews")
        .insert(payload)
        .select("id, worker_id, client_id, rating, comment, created_at")
        .single();

      if (error) throw error;

      setOk(t.postOk);
      setComment("");

      // mise à jour locale
      const clientName =
        contacts.find((c) => c.client_id === selectedClientId)?.client_name || "Client";

      setMyReviews((prev) => [
        { ...(data as any), client_name: clientName } as ReviewRow,
        ...prev,
      ]);
    } catch (e) {
      console.error("WorkerReviews publish error", e);
      setError(t.postError);
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-6">
      <div className="max-w-5xl mx-auto px-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-slate-600"
            onClick={() => navigate("/espace-ouvrier")}
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

        {ok && (
          <div className="mt-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
            {ok}
          </div>
        )}

        <Card className="mt-4 p-5 rounded-2xl border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">{t.selectClient}</div>
              {contacts.length === 0 ? (
                <div className="text-sm text-slate-500">{t.noContacts}</div>
              ) : (
                <select
                  className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                  value={selectedClientId || ""}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.client_id || ""}>
                      {c.client_name || "Client"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-700 mb-2">{t.rating}</div>
              <StarsInput />
            </div>
          </div>

          <div className="mt-4">
            <div className="text-xs font-semibold text-slate-700 mb-2">{t.comment}</div>
            <Textarea
              rows={3}
              placeholder={t.placeholder}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              disabled={posting}
              className="text-sm"
            />
            <div className="mt-3 flex justify-end">
              <Button
                type="button"
                onClick={handlePublish}
                disabled={posting || !comment.trim() || !selectedClientId || contacts.length === 0}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
              >
                {posting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                {t.send}
              </Button>
            </div>
          </div>
        </Card>

        <div className="mt-6">
          <div className="text-sm font-semibold text-slate-900 mb-3">{t.myReviews}</div>

          {!loading && myReviews.length === 0 && (
            <div className="text-sm text-slate-500">{t.noReviews}</div>
          )}

          {!loading && myReviews.length > 0 && (
            <div className="space-y-3">
              {myReviews.map((r) => (
                <Card key={r.id} className="p-4 rounded-2xl border-slate-200">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-slate-900 truncate">
                        {r.client_name || "Client"}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">{formatDateTime(r.created_at)}</div>
                    </div>
                    <div className="shrink-0 flex items-center gap-1">
                      <Star className="w-4 h-4 text-orange-500" fill="currentColor" />
                      <span className="text-sm font-semibold text-slate-700">{r.rating ?? 0}</span>
                    </div>
                  </div>

                  {r.comment && (
                    <div className="mt-3 rounded-xl bg-slate-50 border border-slate-100 p-3">
                      <div className="text-sm text-slate-800 whitespace-pre-line">{r.comment}</div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerReviews;
