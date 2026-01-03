// src/pages/ClientDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  User,
  ClipboardList,
  MessageCircle,
  Heart,
  ArrowRight,
  Search,
  Star,
  Send,
  Info,
  ArrowLeft,
} from "lucide-react";

type ClientInfo = {
  fullName: string | null;
  email: string | null;
  role: string | null;
};

type DbClientRow = {
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
  } | null;
};

type ReviewReplyRow = {
  id: string;
  review_id: string | null;
  client_id: string | null;
  content: string | null; // ✅ content (PAS message)
  created_at: string;
};

const ClientDashboard: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [clientInfo, setClientInfo] = useState<ClientInfo | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // ✅ Pour afficher les avis
  const [clientDb, setClientDb] = useState<DbClientRow | null>(null);
  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [repliesByReview, setRepliesByReview] = useState<Record<string, ReviewReplyRow[]>>({});

  useEffect(() => {
    const loadUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;

        if (!user) {
          setClientInfo(null);
          setClientDb(null);
          return;
        }

        // Profil (nom + role)
        const { data: profile } = await supabase
          .from("op_users")
          .select("full_name, role")
          .eq("id", user.id)
          .maybeSingle();

        const fullNameFromMeta =
          (user.user_metadata?.full_name as string | undefined) ||
          (user.user_metadata?.name as string | undefined) ||
          null;

        setClientInfo({
          fullName: profile?.full_name ?? fullNameFromMeta,
          email: user.email ?? null,
          role: (profile?.role as string) || "user",
        });

        // ✅ Récupérer le client DB (op_clients.id)
        const { data: c, error: cErr } = await supabase
          .from("op_clients")
          .select("id, user_id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (cErr) throw cErr;
        setClientDb((c as DbClientRow) ?? null);
      } catch (err) {
        console.error("Erreur chargement utilisateur client:", err);
        setClientInfo(null);
        setClientDb(null);
      } finally {
        setLoadingUser(false);
      }
    };

    loadUser();
  }, []);

  // ✅ Charger les avis reçus par le client
  useEffect(() => {
    const loadReviews = async () => {
      if (!clientDb?.id) {
        setReviews([]);
        return;
      }

      setReviewsLoading(true);
      setReviewsError(null);

      try {
        const { data, error } = await supabase
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
              profession
            )
          `
          )
          .eq("client_id", clientDb.id)
          .order("created_at", { ascending: false });

        if (error) throw error;

        const list = (data || []) as any[];
        const mapped: ReviewRow[] = list.map((r) => ({
          ...r,
          worker: r.worker ?? null,
        }));

        setReviews(mapped);
      } catch (e: any) {
        console.error("ClientDashboard loadReviews error", e);
        setReviewsError(
          e?.message ||
            (language === "fr" ? "Impossible de charger vos avis." : "Unable to load your reviews.")
        );
      } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [clientDb?.id, language]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Erreur de déconnexion:", err);
    } finally {
      navigate("/", { replace: true });
    }
  };

  // ✅ Bouton retour (en haut à gauche)
  const handleBack = () => {
    // Si un historique existe, on revient en arrière.
    // Sinon, on renvoie vers l’accueil.
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const t = {
    title: language === "fr" ? "Espace client / particulier" : "Client / individual space",
    subtitle:
      language === "fr"
        ? "Retrouvez vos demandes, vos échanges avec les ouvriers et vos informations personnelles."
        : "Access your requests, conversations with workers and personal information.",
    quickActions: language === "fr" ? "Actions rapides" : "Quick actions",
    myRequests: language === "fr" ? "Mes demandes de travaux" : "My work requests",
    myRequestsDesc:
      language === "fr"
        ? "Suivez le statut de vos demandes et l’historique des échanges avec les ouvriers."
        : "Track the status of your requests and history of conversations with workers.",
    myMessages: language === "fr" ? "Mes échanges avec les ouvriers" : "My conversations with workers",
    myMessagesDesc:
      language === "fr"
        ? "Consultez l’historique de vos messages et coordonnées échangées."
        : "Review the history of your messages and shared details.",
    myFavorites: language === "fr" ? "Mes ouvriers favoris" : "My favourite workers",
    myFavoritesDesc:
      language === "fr"
        ? "Retrouvez rapidement les professionnels que vous souhaitez recontacter."
        : "Quickly find the professionals you want to contact again.",
    profileTitle: language === "fr" ? "Mon profil" : "My profile",
    profileDesc:
      language === "fr"
        ? "Mettez à jour vos coordonnées pour être facilement recontacté par les ouvriers."
        : "Keep your contact details up to date so workers can reach you easily.",
    goSearch: language === "fr" ? "Rechercher un ouvrier" : "Search for a worker",
    seeMyRequests: language === "fr" ? "Voir mes demandes" : "View my requests",
    seeMyMessages: language === "fr" ? "Voir mes échanges" : "View my conversations",
    seeMyFavorites: language === "fr" ? "Voir mes favoris" : "View my favourites",
    connectedLabel: language === "fr" ? "Connecté en tant que" : "Logged in as",
    logout: language === "fr" ? "Se déconnecter" : "Sign out",
    backTopLeft: language === "fr" ? "Retour" : "Back",

    // ✅ Avis
    reviewsTitle: language === "fr" ? "Avis reçus" : "Reviews received",
    reviewsDesc:
      language === "fr"
        ? "Voici les avis laissés par les ouvriers à propos de vous."
        : "Here are the reviews workers left about you.",
    reviewsEmpty: language === "fr" ? "Aucun avis pour le moment." : "No reviews yet.",
    reviewReply: language === "fr" ? "Réagir" : "Reply",
    replyPlaceholder: language === "fr" ? "Écrivez votre réaction..." : "Write your reply...",
    sendReply: language === "fr" ? "Envoyer" : "Send",
    published: language === "fr" ? "Publié" : "Published",
    private: language === "fr" ? "Non publié" : "Not published",
    loadReviewsError: language === "fr" ? "Impossible de charger vos avis." : "Unable to load your reviews.",
  };

  const displayName =
    clientInfo?.fullName ||
    clientInfo?.email ||
    (language === "fr" ? "Client ProxiServices" : "ProxiServices client");

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? "")
    .join("");

  const workerName = (r: ReviewRow) => {
    const w = r.worker;
    const fn = (w?.first_name || "").trim();
    const ln = (w?.last_name || "").trim();
    const full = `${fn} ${ln}`.trim();
    return full || (language === "fr" ? "Ouvrier" : "Worker");
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const openReply = async (reviewId: string) => {
    setReplyOpenFor(reviewId);
    setReplyText("");

    // Charger les réponses existantes
    try {
      const { data, error } = await supabase
        .from("op_worker_client_review_replies")
        .select("id, review_id, client_id, content, created_at")
        .eq("review_id", reviewId)
        .order("created_at", { ascending: true });

      if (error) throw error;

      setRepliesByReview((prev) => ({
        ...prev,
        [reviewId]: (data || []) as ReviewReplyRow[],
      }));
    } catch (e) {
      console.warn("Unable to load replies for review", reviewId, e);
    }
  };

  const sendReply = async () => {
    if (!replyOpenFor || !clientDb?.id) return;
    if (!replyText.trim()) return;

    setReplySending(true);
    try {
      const payload = {
        review_id: replyOpenFor,
        client_id: clientDb.id, // ✅ op_clients.id
        content: replyText.trim(), // ✅ content (PAS message)
      };

      const { data, error } = await supabase
        .from("op_worker_client_review_replies")
        .insert({
          ...payload,
          sender_role: "client",
        })
        .select("id, review_id, client_id, content, created_at")
        .single();

      if (error) throw error;

      setRepliesByReview((prev) => ({
        ...prev,
        [replyOpenFor]: [...(prev[replyOpenFor] || []), data as ReviewReplyRow],
      }));
      setReplyText("");
    } catch (e) {
      console.error("sendReply error", e);
    } finally {
      setReplySending(false);
    }
  };

  const avgRating = useMemo(() => {
    const vals = reviews.map((r) => r.rating).filter((x): x is number => typeof x === "number");
    if (vals.length === 0) return null;
    const sum = vals.reduce((a, b) => a + b, 0);
    return Math.round((sum / vals.length) * 10) / 10;
  }, [reviews]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        {/* En-tête / Hero */}
        <header className="mb-8 rounded-3xl bg-white/90 border border-slate-100 shadow-sm px-5 py-5 md:px-8 md:py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            {/* ✅ Ligne top-left: bouton retour + badge */}
            <div className="flex items-center gap-3 mb-3">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleBack}
                className="rounded-full text-xs text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                {t.backTopLeft}
              </Button>

              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700 border border-emerald-100">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {loadingUser ? (
                  language === "fr" ? "Connexion en cours..." : "Checking session..."
                ) : (
                  <>
                    {t.connectedLabel} <span className="font-semibold">{displayName}</span>
                    <span className="opacity-70">
                      {language === "fr" ? "(client / particulier)" : "(client / individual)"}
                    </span>
                  </>
                )}
              </div>
            </div>

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">{t.title}</h1>
            <p className="text-sm md:text-base text-slate-600 max-w-xl">{t.subtitle}</p>
          </div>

          <div className="flex flex-col items-stretch gap-3 md:items-end">
            <Button
              type="button"
              onClick={() => navigate("/search")}
              className="bg-pro-blue hover:bg-pro-blue/90 rounded-full px-5 shadow-md shadow-pro-blue/25 flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {t.goSearch}
            </Button>

            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs border-slate-200 text-slate-600 hover:border-red-400 hover:text-red-600"
              type="button"
              onClick={handleLogout}
            >
              {t.logout}
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[1.75fr,1.25fr] items-start">
          {/* Colonne gauche */}
          <div className="space-y-6">
            <Card className="p-6 md:p-7 rounded-3xl bg-white/90 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pro-blue/10 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-pro-blue" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-800">{t.quickActions}</h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="relative rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:border-pro-blue/60 hover:bg-white transition-shadow transition-colors shadow-xs hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-pro-blue/10 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-pro-blue" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{t.myRequests}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">{t.myRequestsDesc}</p>
                  <Button asChild variant="outline" size="sm" className="text-xs rounded-full border-slate-200">
                    <Link to="/mes-demandes" className="flex items-center gap-1">
                      {t.seeMyRequests}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>

                <div className="relative rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:border-emerald-500/70 hover:bg-white transition-shadow transition-colors shadow-xs hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{t.myMessages}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">{t.myMessagesDesc}</p>
                  <Button asChild variant="outline" size="sm" className="text-xs rounded-full border-slate-200">
                    <Link to="/mes-echanges" className="flex items-center gap-1">
                      {t.seeMyMessages}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>

                <div className="relative rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:border-rose-500/70 hover:bg-white transition-shadow transition-colors shadow-xs hover:shadow-md md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-rose-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{t.myFavorites}</h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">{t.myFavoritesDesc}</p>
                  <Button asChild variant="outline" size="sm" className="text-xs rounded-full border-slate-200">
                    <Link to="/mes-favoris" className="flex items-center gap-1">
                      {t.seeMyFavorites}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>

            {/* ✅ Avis */}
            <Card className="p-6 md:p-7 rounded-3xl bg-white/90 shadow-sm border border-slate-100">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">{t.reviewsTitle}</h2>
                  <p className="text-xs text-slate-500 mt-1">{t.reviewsDesc}</p>
                </div>

                <div className="text-right">
                  <div className="text-xs text-slate-500">{language === "fr" ? "Moyenne" : "Average"}</div>
                  <div className="flex items-center justify-end gap-1 text-sm font-semibold text-slate-900">
                    <Star className="w-4 h-4 text-orange-500" />
                    {avgRating ?? "—"}
                  </div>
                </div>
              </div>

              {reviewsLoading && (
                <div className="text-sm text-slate-500">
                  {language === "fr" ? "Chargement des avis..." : "Loading reviews..."}
                </div>
              )}

              {!reviewsLoading && reviewsError && (
                <div className="text-sm text-red-600 flex items-start gap-2">
                  <Info className="w-4 h-4 mt-0.5" />
                  <div>
                    <div>{t.loadReviewsError}</div>
                    <div className="text-xs text-red-400 mt-1">{reviewsError}</div>
                  </div>
                </div>
              )}

              {!reviewsLoading && !reviewsError && reviews.length === 0 && (
                <div className="text-sm text-slate-500">{t.reviewsEmpty}</div>
              )}

              {!reviewsLoading && !reviewsError && reviews.length > 0 && (
                <div className="space-y-3">
                  {reviews.map((r) => {
                    const isOpen = replyOpenFor === r.id;
                    const replies = repliesByReview[r.id] || [];
                    const wName = workerName(r);
                    const wJob = r.worker?.profession || null;

                    return (
                      <div key={r.id} className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-slate-900 truncate">{wName}</div>
                              {wJob && <span className="text-[11px] text-slate-500 truncate">• {wJob}</span>}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {formatDate(r.created_at)} •{" "}
                              <span className="font-medium text-slate-500">
                                {r.is_published ? t.published : t.private}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center gap-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                className={`w-4 h-4 ${
                                  (r.rating || 0) >= i + 1 ? "text-orange-500" : "text-slate-300"
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        {(r.title || r.content) && (
                          <div className="mt-3">
                            {r.title && <div className="text-sm font-semibold text-slate-900">{r.title}</div>}
                            {r.content && (
                              <div className="text-sm text-slate-700 mt-1 whitespace-pre-line">{r.content}</div>
                            )}
                          </div>
                        )}

                        {/* Réponses */}
                        {replies.length > 0 && (
                          <div className="mt-3 space-y-2">
                            {replies.map((rep) => (
                              <div key={rep.id} className="rounded-xl bg-white border border-slate-100 px-3 py-2">
                                <div className="text-[11px] text-slate-400">
                                  {language === "fr" ? "Votre réaction" : "Your reply"} • {formatDate(rep.created_at)}
                                </div>
                                <div className="text-sm text-slate-700 whitespace-pre-line">{rep.content}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="rounded-full text-xs border-slate-200"
                            onClick={() => (isOpen ? setReplyOpenFor(null) : openReply(r.id))}
                          >
                            {t.reviewReply}
                          </Button>
                        </div>

                        {isOpen && (
                          <div className="mt-3 rounded-2xl border border-slate-100 bg-white p-3">
                            <Textarea
                              rows={3}
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={t.replyPlaceholder}
                              disabled={replySending}
                              className="text-sm"
                            />
                            <div className="mt-2 flex justify-end">
                              <Button
                                type="button"
                                className="rounded-full bg-orange-500 hover:bg-orange-600 flex items-center gap-2"
                                onClick={sendReply}
                                disabled={replySending || !replyText.trim()}
                              >
                                <Send className="w-4 h-4" />
                                {t.sendReply}
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>

          {/* Colonne droite */}
          <div className="space-y-6">
            <Card className="p-6 rounded-3xl bg-white/90 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-pro-blue/10 flex items-center justify-center text-xs font-semibold text-pro-blue uppercase">
                    {initials || <User className="w-4 h-4" />}
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{t.profileTitle}</h2>
                    <p className="text-xs text-slate-500">{displayName}</p>
                    {clientInfo?.email && <p className="text-[11px] text-slate-400">{clientInfo.email}</p>}
                  </div>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-4">{t.profileDesc}</p>

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-[11px] text-slate-500 mb-4">
                {language === "fr"
                  ? "Email, téléphone, ville, préférences de contact… Ces informations sont partagées avec les ouvriers lorsque vous envoyez une demande."
                  : "Email, phone, city, contact preferences… These details are shared with workers when you send a request."}
              </div>

              <div className="flex gap-2">
                <Button
                  asChild
                  variant="outline"
                  className="flex-1 rounded-full text-sm border-slate-200 hover:border-pro-blue/70"
                >
                  <Link to="/mon-profil">{language === "fr" ? "Modifier mon profil" : "Edit my profile"}</Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="rounded-full text-xs text-slate-500 hover:text-red-600 hover:bg-red-50"
                  type="button"
                  onClick={handleLogout}
                >
                  {t.logout}
                </Button>
              </div>
            </Card>

            <Card className="p-4 rounded-3xl bg-slate-900 text-slate-100 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                    {language === "fr" ? "Conseil ProxiServices" : "ProxiServices tip"}
                  </p>
                  <p className="text-sm leading-relaxed">
                    {language === "fr"
                      ? "Plus votre demande est détaillée (photos, délais, budget estimatif), plus vous augmentez vos chances de recevoir des réponses rapides et pertinentes."
                      : "The more detailed your request is (photos, timeline, estimated budget), the more likely you are to receive quick and relevant replies."}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
