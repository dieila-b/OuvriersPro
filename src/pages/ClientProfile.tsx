// src/pages/ClientProfile.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, ArrowLeft, Save, Star, Send, MessageCircle } from "lucide-react";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  preferred_contact: string | null;
};

type ClientRow = {
  id: string;
  user_id: string | null;
};

type ReviewRow = {
  id: string;
  worker_id: string | null;
  client_id: string | null;
  rating: number | null;
  title: string | null;
  content: string | null;
  is_published: boolean | null;
  created_at: string;

  worker?: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    profession: string | null;
    city: string | null;
  } | null;
};

type ReviewReplyRow = {
  id: string;
  review_id: string | null;
  client_id: string | null;
  content: string | null; // ✅ content (PAS message)
  created_at: string;
};

const ClientProfile: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [client, setClient] = useState<ClientRow | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Avis
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [repliesByReviewId, setRepliesByReviewId] = useState<
    Record<string, ReviewReplyRow[]>
  >({});
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [replyDraft, setReplyDraft] = useState<Record<string, string>>({});
  const [replySending, setReplySending] = useState<Record<string, boolean>>({});

  const t = {
    title: language === "fr" ? "Mon profil client" : "My client profile",
    subtitle:
      language === "fr"
        ? "Mettez à jour vos coordonnées pour être facilement recontacté par les ouvriers."
        : "Update your contact details so workers can easily reach you.",
    mainInfo: language === "fr" ? "Informations principales" : "Main information",
    contactInfo: language === "fr" ? "Coordonnées de contact" : "Contact information",
    emailLabel: "Email",
    fullNameLabel: language === "fr" ? "Nom complet" : "Full name",
    phoneLabel: language === "fr" ? "Téléphone" : "Phone",
    countryLabel: language === "fr" ? "Pays" : "Country",
    cityLabel: language === "fr" ? "Ville" : "City",
    preferredContactLabel:
      language === "fr" ? "Préférences de contact" : "Contact preferences",
    preferredContactPlaceholder:
      language === "fr"
        ? "Ex : Contact de préférence par WhatsApp en soirée…"
        : "e.g. Prefer to be contacted by WhatsApp in the evening…",
    save: language === "fr" ? "Enregistrer" : "Save",
    saving: language === "fr" ? "Enregistrement..." : "Saving...",

    // ✅ bouton demandé (libellé plus explicite)
    backToClientArea:
      language === "fr"
        ? "Retour à l’espace client / particulier"
        : "Back to client area",

    success:
      language === "fr"
        ? "Profil mis à jour avec succès."
        : "Profile updated successfully.",
    errorLoad:
      language === "fr"
        ? "Impossible de charger votre profil."
        : "Unable to load your profile.",
    errorSave:
      language === "fr"
        ? "Erreur lors de l’enregistrement de votre profil."
        : "Error while saving your profile.",

    // Avis
    reviewsTitle: language === "fr" ? "Avis reçus" : "Reviews received",
    reviewsSubtitle:
      language === "fr"
        ? "Les avis laissés par les ouvriers à propos de vous (visibles publiquement)."
        : "Reviews left by workers about you (publicly visible).",
    reviewsLoading:
      language === "fr" ? "Chargement des avis..." : "Loading reviews...",
    reviewsEmpty:
      language === "fr" ? "Aucun avis pour le moment." : "No reviews yet.",
    replyPlaceholder:
      language === "fr"
        ? "Réagir / répondre à cet avis…"
        : "React / reply to this review…",
    replySend: language === "fr" ? "Envoyer" : "Send",
    replyError:
      language === "fr"
        ? "Impossible d'envoyer votre réponse."
        : "Unable to send your reply.",
    reviewsError:
      language === "fr" ? "Impossible de charger les avis." : "Unable to load reviews.",
  };

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

  const fullWorkerName = (w?: ReviewRow["worker"] | null) => {
    if (!w) return language === "fr" ? "Ouvrier" : "Worker";
    const n = `${w.first_name || ""} ${w.last_name || ""}`.trim();
    return n || (language === "fr" ? "Ouvrier" : "Worker");
  };

  const stars = (rating: number | null) => {
    const r = Math.max(0, Math.min(5, Number(rating || 0)));
    return Array.from({ length: 5 }).map((_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${
          i < r ? "text-amber-500 fill-amber-500" : "text-slate-300"
        }`}
      />
    ));
  };

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      setError(null);
      setReviewsError(null);

      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        if (authError || !authData?.user) throw authError || new Error("No user");
        const userId = authData.user.id;

        const { data: userRow, error: userErr } = await supabase
          .from("op_users")
          .select("id, email, full_name, phone, country, city, preferred_contact")
          .eq("id", userId)
          .maybeSingle();

        if (userErr || !userRow) throw userErr || new Error("Profile not found");
        setProfile(userRow as Profile);

        const { data: clientRow, error: clientErr } = await supabase
          .from("op_clients")
          .select("id, user_id")
          .eq("user_id", userId)
          .maybeSingle();

        if (clientErr) throw clientErr;

        if (!clientRow?.id) {
          setClient(null);
          setReviews([]);
          setRepliesByReviewId({});
          return;
        }

        const c = clientRow as ClientRow;
        setClient(c);

        await loadReviewsAndReplies(c.id);
      } catch (err) {
        console.error(err);
        setError(t.errorLoad);
      } finally {
        setLoading(false);
      }
    };

    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const loadReviewsAndReplies = async (clientId: string) => {
    setReviewsLoading(true);
    setReviewsError(null);

    try {
      const { data: reviewsData, error: reviewsErr } = await supabase
        .from("op_worker_client_reviews")
        .select(
          `
          id,
          worker_id,
          client_id,
          rating,
          title,
          content,
          is_published,
          created_at,
          worker:op_ouvriers (
            id,
            first_name,
            last_name,
            profession,
            city
          )
        `
        )
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });

      if (reviewsErr) throw reviewsErr;

      const list = (reviewsData || []) as any[];
      const mapped: ReviewRow[] = list.map((r) => ({ ...r, worker: r.worker ?? null }));
      setReviews(mapped);

      const reviewIds = mapped.map((r) => r.id).filter(Boolean);
      if (reviewIds.length === 0) {
        setRepliesByReviewId({});
        return;
      }

      const { data: repliesData, error: repliesErr } = await supabase
        .from("op_worker_client_review_replies")
        .select("id, review_id, client_id, content, created_at")
        .eq("client_id", clientId)
        .in("review_id", reviewIds)
        .order("created_at", { ascending: true });

      if (repliesErr) throw repliesErr;

      const replies = (repliesData || []) as ReviewReplyRow[];
      const grouped: Record<string, ReviewReplyRow[]> = {};
      for (const rep of replies) {
        const rid = rep.review_id || "";
        if (!rid) continue;
        if (!grouped[rid]) grouped[rid] = [];
        grouped[rid].push(rep);
      }
      setRepliesByReviewId(grouped);
    } catch (e) {
      console.error("loadReviewsAndReplies error", e);
      setReviewsError(t.reviewsError);
    } finally {
      setReviewsLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error: updErr } = await supabase
        .from("op_users")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          country: profile.country,
          city: profile.city,
          preferred_contact: profile.preferred_contact,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (updErr) throw updErr;
      setSuccess(t.success);
    } catch (err) {
      console.error(err);
      setError(t.errorSave);
    } finally {
      setSaving(false);
    }
  };

  const canReply = useMemo(() => Boolean(client?.id), [client?.id]);

  const handleSendReply = async (review: ReviewRow) => {
    if (!client?.id) return;
    const text = (replyDraft[review.id] || "").trim();
    if (!text) return;

    setReplySending((prev) => ({ ...prev, [review.id]: true }));

    try {
      const { data, error } = await supabase
        .from("op_worker_client_review_replies")
        .insert({
          review_id: review.id,
          client_id: client.id, // ✅ op_clients.id
          content: text, // ✅ content (PAS message)
        })
        .select("id, review_id, client_id, content, created_at")
        .single();

      if (error) throw error;

      const reply = data as ReviewReplyRow;

      setRepliesByReviewId((prev) => {
        const next = { ...prev };
        const arr = next[review.id] ? [...next[review.id]] : [];
        arr.push(reply);
        next[review.id] = arr;
        return next;
      });

      setReplyDraft((prev) => ({ ...prev, [review.id]: "" }));
    } catch (e) {
      console.error("Reply insert error:", e);
      setReviewsError(t.replyError);
    } finally {
      setReplySending((prev) => ({ ...prev, [review.id]: false }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr" ? "Chargement du profil..." : "Loading profile..."}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-red-600">{t.errorLoad}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          {/* ✅ Bouton demandé */}
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
            onClick={() => navigate("/espace-client")}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.backToClientArea}
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-pro-blue/10 flex items-center justify-center">
              <User className="w-4 h-4 text-pro-blue" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-slate-900">
                {t.title}
              </h1>
              <p className="text-xs md:text-sm text-slate-600">{t.subtitle}</p>
            </div>
          </div>
        </div>

        {/* PROFIL */}
        <Card className="p-6 md:p-7 rounded-2xl bg-white/90 shadow-sm border-slate-200 space-y-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
              {success}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                {t.mainInfo}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.fullNameLabel}
                  </label>
                  <Input
                    name="full_name"
                    value={profile.full_name ?? ""}
                    onChange={handleChange}
                    placeholder={
                      language === "fr" ? "Ex : Mamadou Diallo" : "e.g. John Doe"
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.emailLabel}
                  </label>
                  <Input
                    value={profile.email ?? ""}
                    disabled
                    className="bg-slate-50 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                {t.contactInfo}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.phoneLabel}
                  </label>
                  <Input
                    name="phone"
                    value={profile.phone ?? ""}
                    onChange={handleChange}
                    placeholder="+224 6X XX XX XX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.countryLabel}
                  </label>
                  <Input
                    name="country"
                    value={profile.country ?? ""}
                    onChange={handleChange}
                    placeholder={language === "fr" ? "Ex : Guinée" : "e.g. Guinea"}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.cityLabel}
                  </label>
                  <Input
                    name="city"
                    value={profile.city ?? ""}
                    onChange={handleChange}
                    placeholder={
                      language === "fr" ? "Ex : Conakry" : "e.g. Conakry"
                    }
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.preferredContactLabel}
              </label>
              <Textarea
                name="preferred_contact"
                value={profile.preferred_contact ?? ""}
                onChange={handleChange}
                rows={3}
                placeholder={t.preferredContactPlaceholder}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" disabled={saving} className="rounded-full px-5">
                {saving ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-pulse" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t.save}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>

        {/* AVIS */}
        <Card className="mt-6 p-6 md:p-7 rounded-2xl bg-white/90 shadow-sm border-slate-200 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">{t.reviewsTitle}</h2>
              <p className="text-xs text-slate-600 mt-1">{t.reviewsSubtitle}</p>
            </div>
          </div>

          {reviewsError && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {reviewsError}
            </div>
          )}

          {reviewsLoading && <div className="text-sm text-slate-500">{t.reviewsLoading}</div>}

          {!reviewsLoading && reviews.length === 0 && (
            <div className="text-sm text-slate-500">{t.reviewsEmpty}</div>
          )}

          {!reviewsLoading && reviews.length > 0 && (
            <div className="space-y-4">
              {reviews.map((r) => {
                const workerLabel = fullWorkerName(r.worker);
                const replies = repliesByReviewId[r.id] || [];
                const draft = replyDraft[r.id] || "";
                const sendingThis = Boolean(replySending[r.id]);

                return (
                  <div key={r.id} className="rounded-xl border border-slate-200 p-4 bg-white">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 truncate">
                          {workerLabel}
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">
                          {[r.worker?.profession, r.worker?.city].filter(Boolean).join(" • ")}
                        </div>

                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex items-center gap-1">{stars(r.rating)}</div>
                          <span className="text-xs text-slate-400">
                            • {formatDateTime(r.created_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {(r.title || r.content) && (
                      <div className="mt-3 text-sm text-slate-800 whitespace-pre-line">
                        {r.title ? <div className="font-semibold">{r.title}</div> : null}
                        {r.content ? <div className={r.title ? "mt-1" : ""}>{r.content}</div> : null}
                      </div>
                    )}

                    {replies.length > 0 && (
                      <div className="mt-4 space-y-2">
                        {replies.map((rep) => (
                          <div
                            key={rep.id}
                            className="rounded-lg bg-slate-50 border border-slate-100 p-3"
                          >
                            <div className="text-xs text-slate-500 flex items-center gap-2">
                              <MessageCircle className="w-4 h-4 text-slate-400" />
                              {language === "fr" ? "Votre réponse" : "Your reply"} •{" "}
                              {formatDateTime(rep.created_at)}
                            </div>
                            <div className="mt-1 text-sm text-slate-800 whitespace-pre-line">
                              {rep.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4">
                      <Textarea
                        rows={2}
                        placeholder={t.replyPlaceholder}
                        value={draft}
                        onChange={(e) =>
                          setReplyDraft((prev) => ({ ...prev, [r.id]: e.target.value }))
                        }
                        disabled={!canReply || sendingThis}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          type="button"
                          className="flex items-center gap-1 bg-orange-500 hover:bg-orange-600"
                          onClick={() => handleSendReply(r)}
                          disabled={!canReply || !draft.trim() || sendingThis}
                        >
                          <Send className="w-4 h-4" />
                          {t.replySend}
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClientProfile;
