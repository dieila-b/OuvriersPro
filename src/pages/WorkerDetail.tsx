// src/pages/WorkerDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MessageCircle, MapPin, Star } from "lucide-react";

type WorkerProfile = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  profession: string | null;
  description: string | null;
  hourly_rate: number | null;
  currency: string | null;
};

type Review = {
  id: string;
  rating: number | null;
  comment: string | null;
  created_at: string;
  client_name: string | null;
};

type WorkerPhoto = {
  id: string;
  public_url: string | null;
  title: string | null;
};

const WorkerDetail: React.FC = () => {
  const { language } = useLanguage();
  const params = useParams();
  const workerId = (params.workerId as string) || (params.id as string);

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [loadingWorker, setLoadingWorker] = useState(true);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Formulaire de contact (colonne de droite)
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [requestType, setRequestType] = useState("Demande de devis");
  const [approxBudget, setApproxBudget] = useState("");
  const [desiredDate, setDesiredDate] = useState("");
  const [clientMessage, setClientMessage] = useState("");
  const [acceptedSharing, setAcceptedSharing] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Avis clients
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);

  // Photos
  const [photos, setPhotos] = useState<WorkerPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);

  // Chargement profil ouvrier
  useEffect(() => {
    const loadWorker = async () => {
      if (!workerId) {
        setWorkerError(
          language === "fr"
            ? "Aucun ouvrier spécifié."
            : "No worker specified."
        );
        setLoadingWorker(false);
        return;
      }

      setLoadingWorker(true);
      setWorkerError(null);

      const { data, error } = await supabase
        .from("op_ouvriers")
        .select(
          `
          id,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          country,
          region,
          city,
          commune,
          district,
          profession,
          description,
          hourly_rate,
          currency
        `
        )
        .eq("id", workerId)
        .maybeSingle();

      if (error || !data) {
        console.error("loadWorker error", error);
        setWorkerError(
          language === "fr"
            ? "Impossible de charger le profil de cet ouvrier."
            : "Unable to load this worker profile."
        );
      } else {
        setWorker(data as WorkerProfile);
      }

      setLoadingWorker(false);
    };

    loadWorker();
  }, [workerId, language]);

  // Chargement avis
  useEffect(() => {
    const loadReviews = async () => {
      if (!workerId) return;

      setReviewsLoading(true);
      setReviewsError(null);

      const { data, error } = await supabase
        .from("op_ouvrier_reviews")
        .select("*")
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("loadReviews error", error);
        setReviewsError(
          language === "fr"
            ? "Impossible de charger les avis."
            : "Unable to load reviews."
        );
      } else {
        const mapped: Review[] = (data || []).map((r: any) => ({
          id: r.id,
          rating: r.rating ?? null,
          comment: r.comment ?? null,
          created_at: r.created_at,
          client_name: r.client_name ?? r.name ?? null,
        }));
        setReviews(mapped);
      }

      setReviewsLoading(false);
    };

    loadReviews();
  }, [workerId, language]);

  // Chargement photos (utilise la colonne public_url)
  useEffect(() => {
    const loadPhotos = async () => {
      if (!workerId) return;

      setPhotosLoading(true);
      setPhotosError(null);

      const { data, error } = await supabase
        .from("op_ouvrier_photos")
        .select("id, public_url, title")
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false })
        .limit(6);

      if (error) {
        console.error("loadPhotos error", error);
        setPhotosError(
          language === "fr"
            ? "Impossible de charger les photos."
            : "Unable to load photos."
        );
      } else {
        const mapped: WorkerPhoto[] = (data || []).map((row: any) => ({
          id: row.id,
          public_url: row.public_url ?? null,
          title: row.title ?? null,
        }));
        setPhotos(mapped);
      }

      setPhotosLoading(false);
    };

    loadPhotos();
  }, [workerId, language]);

  const fullName =
    (worker?.first_name || "") +
    (worker?.last_name ? ` ${worker.last_name}` : "");

  const location = [
    worker?.country,
    worker?.region,
    worker?.city,
    worker?.commune,
    worker?.district,
  ]
    .filter(Boolean)
    .join(" • ");

  const whatsappUrl = worker?.phone
    ? (() => {
        const clean = worker.phone.replace(/\s+/g, "");
        const normalized = clean.startsWith("+") ? clean.slice(1) : clean;
        return `https://wa.me/${normalized}`;
      })()
    : "";

  const averageRating =
    reviews.length > 0
      ? Math.round(
          (reviews.reduce(
            (sum, r) => sum + (r.rating || 0),
            0
          ) /
            reviews.length) *
            10
        ) / 10
      : 0;

  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;

    if (!acceptedSharing) {
      setSubmitError(
        language === "fr"
          ? "Vous devez accepter que vos coordonnées soient transmises à cet ouvrier."
          : "You must accept sharing your details with this worker."
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        throw new Error(
          language === "fr"
            ? "Vous devez être connecté pour envoyer une demande."
            : "You must be logged in to send a request."
        );
      }

      // Récupérer ou créer le profil client
      let clientProfileId: string | null = null;

      const { data: existingClient, error: selectClientError } = await supabase
        .from("op_clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (selectClientError && selectClientError.code !== "PGRST116") {
        console.error("select client error", selectClientError);
        throw new Error(
          language === "fr"
            ? "Impossible de récupérer votre profil client."
            : "Unable to fetch your client profile."
        );
      }

      if (existingClient) {
        clientProfileId = existingClient.id;
      } else {
        const { data: newClient, error: insertClientError } = await supabase
          .from("op_clients")
          .insert({
            user_id: user.id,
            first_name: clientName || null,
            last_name: null,
            email: clientEmail || user.email || null,
            phone: clientPhone || null,
          })
          .select("id")
          .maybeSingle();

        if (insertClientError || !newClient) {
          console.error("insert client error", insertClientError);
          throw new Error(
            language === "fr"
              ? "Impossible de créer votre profil client."
              : "Unable to create your client profile."
          );
        }

        clientProfileId = newClient.id;
      }

      if (!clientProfileId) {
        throw new Error(
          language === "fr"
            ? "Profil client introuvable. Veuillez réessayer."
            : "Client profile not found. Please try again."
        );
      }

      // Message détaillé (comme dans le dashboard ouvrier)
      const detailedMessageLines: string[] = [];
      if (requestType) {
        detailedMessageLines.push(
          `${language === "fr" ? "Type de demande" : "Request type"} : ${
            requestType
          }`
        );
      }
      if (approxBudget) {
        detailedMessageLines.push(
          `${
            language === "fr"
              ? "Budget approximatif (facultatif)"
              : "Approx. budget (optional)"
          } : ${approxBudget}`
        );
      }
      if (desiredDate) {
        detailedMessageLines.push(
          `${
            language === "fr"
              ? "Date souhaitée (facultatif)"
              : "Desired date (optional)"
          } : ${desiredDate}`
        );
      }
      if (clientMessage) {
        detailedMessageLines.push(clientMessage);
      }
      const detailedMessage = detailedMessageLines.join("\n");

      const { error: contactError } = await supabase
        .from("op_ouvrier_contacts")
        .insert({
          worker_id: worker.id,
          client_id: clientProfileId,
          client_name: clientName || null,
          client_email: clientEmail || user.email || null,
          client_phone: clientPhone || null,
          message: detailedMessage || null,
          origin: "web",
          status: "new",
        });

      if (contactError) {
        console.error("insert contact error", contactError);
        throw new Error(
          language === "fr"
            ? "Une erreur est survenue lors de l'envoi de votre demande."
            : "An error occurred while sending your request."
        );
      }

      setSubmitSuccess(
        language === "fr"
          ? "Votre demande a été envoyée à cet ouvrier."
          : "Your request has been sent to this worker."
      );
      setRequestType("Demande de devis");
      setApproxBudget("");
      setDesiredDate("");
      setClientMessage("");
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;
    if (newRating <= 0) return;

    setSubmitReviewLoading(true);
    setReviewsError(null);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        throw new Error(
          language === "fr"
            ? "Vous devez être connecté pour laisser un avis."
            : "You must be logged in to leave a review."
        );
      }

      const { data: newReview, error: insertReviewError } = await supabase
        .from("op_ouvrier_reviews")
        .insert({
          worker_id: worker.id,
          rating: newRating,
          comment: newComment || null,
        })
        .select("*")
        .maybeSingle();

      if (insertReviewError || !newReview) {
        console.error("insert review error", insertReviewError);
        throw new Error(
          language === "fr"
            ? "Impossible d’enregistrer votre avis."
            : "Unable to save your review."
        );
      }

      setReviews((prev) => [
        {
          id: newReview.id,
          rating: newReview.rating ?? null,
          comment: newReview.comment ?? null,
          created_at: newReview.created_at,
          client_name: newReview.client_name ?? null,
        },
        ...prev,
      ]);
      setNewRating(0);
      setNewComment("");
    } catch (err: any) {
      console.error(err);
      setReviewsError(err.message || "Error");
    } finally {
      setSubmitReviewLoading(false);
    }
  };

  if (loadingWorker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr"
            ? "Chargement du profil ouvrier..."
            : "Loading worker profile..."}
        </div>
      </div>
    );
  }

  if (workerError || !worker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-sm text-red-600">
          {workerError ||
            (language === "fr"
              ? "Ouvrier introuvable."
              : "Worker not found.")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Bouton retour */}
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-4 inline-flex items-center text-xs text-slate-500 hover:text-slate-700"
        >
          ←{" "}
          {language === "fr"
            ? "Retour aux résultats"
            : "Back to search results"}
        </button>

        <div className="flex flex-col lg:flex-row gap-6">
          {/* Colonne gauche */}
          <div className="flex-1 space-y-4">
            {/* Header */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-pro-blue/10 flex items-center justify-center text-pro-blue font-semibold text-lg">
                    {fullName
                      ? fullName
                          .split(" ")
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "OP"}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      {fullName ||
                        (language === "fr" ? "Ouvrier" : "Worker")}
                    </h1>
                    {worker.profession && (
                      <p className="text-sm text-slate-600">
                        {worker.profession}
                      </p>
                    )}
                    {location && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {location}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="inline-flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span className="text-sm font-semibold">
                        {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {language === "fr" ? "avis" : "reviews"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {reviews.length}{" "}
                      {language === "fr"
                        ? "avis"
                        : reviews.length <= 1
                        ? "review"
                        : "reviews"}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">
                      0
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {language === "fr"
                        ? "ans d'expérience"
                        : "years experience"}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">
                      {worker.hourly_rate != null
                        ? `${worker.hourly_rate.toLocaleString()} ${
                            worker.currency || "GNF"
                          }`
                        : "—"}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {language === "fr" ? "par heure" : "per hour"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* À propos */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                {language === "fr" ? "À propos" : "About"}
              </h2>
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {worker.description ||
                  (language === "fr"
                    ? "Aucune description fournie pour le moment."
                    : "No description provided yet.")}
              </p>
            </div>

            {/* Portfolio placeholder */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                {language === "fr"
                  ? "Portfolio / Réalisations"
                  : "Portfolio / Works"}
              </h2>
              <p className="text-xs text-slate-500 mb-2">
                {language === "fr"
                  ? "Découvrez quelques projets réalisés par ce professionnel."
                  : "Discover some projects completed by this professional."}
              </p>
              <p className="text-sm text-slate-500">
                {language === "fr"
                  ? "Aucune réalisation publiée pour le moment."
                  : "No published work yet."}
              </p>
            </div>

            {/* Galerie photos */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                {language === "fr" ? "Galerie photos" : "Photo gallery"}
              </h2>
              <p className="text-xs text-slate-500 mb-2">
                {language === "fr"
                  ? "Découvrez quelques réalisations de cet ouvrier."
                  : "Discover some works from this worker."}
              </p>

              {photosError && (
                <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {photosError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {photosLoading && (
                  <>
                    <div className="aspect-[4/3] rounded-lg bg-slate-100 border border-slate-200" />
                    <div className="aspect-[4/3] rounded-lg bg-slate-100 border border-slate-200" />
                    <div className="aspect-[4/3] rounded-lg bg-slate-100 border border-slate-200" />
                  </>
                )}

                {!photosLoading && photos.length === 0 && (
                  <>
                    <div className="aspect-[4/3] rounded-lg bg-slate-100 border border-slate-200" />
                    <div className="aspect-[4/3] rounded-lg bg-slate-100 border border-slate-200" />
                    <div className="aspect-[4/3] rounded-lg bg-slate-100 border border-slate-200" />
                  </>
                )}

                {!photosLoading &&
                  photos.map((p) => (
                    <div
                      key={p.id}
                      className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                    >
                      {p.public_url ? (
                        <img
                          src={p.public_url}
                          alt={p.title || ""}
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                  ))}
              </div>
            </div>

            {/* Avis clients */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                {language === "fr" ? "Avis clients" : "Customer reviews"}
              </h2>

              {reviewsError && (
                <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {reviewsError}
                </div>
              )}

              {/* Résumé note + nb avis */}
              <div className="flex items-center gap-2 mb-3 text-sm">
                <div className="inline-flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-semibold">
                    {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                  </span>
                </div>
                <span className="text-xs text-slate-500">
                  {reviews.length}{" "}
                  {language === "fr"
                    ? "avis"
                    : reviews.length <= 1
                    ? "review"
                    : "reviews"}
                </span>
              </div>

              {/* Liste avis */}
              <div className="space-y-3 mb-4">
                {reviewsLoading && (
                  <div className="text-xs text-slate-500">
                    {language === "fr"
                      ? "Chargement des avis..."
                      : "Loading reviews..."}
                  </div>
                )}
                {!reviewsLoading && reviews.length === 0 && (
                  <div className="text-xs text-slate-500">
                    {language === "fr"
                      ? "Aucun avis pour le moment."
                      : "No review yet."}
                  </div>
                )}
                {!reviewsLoading &&
                  reviews.map((r) => (
                    <div
                      key={r.id}
                      className="border border-slate-100 rounded-lg px-3 py-2 text-xs"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-800">
                          {r.client_name || "Client"}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(r.created_at).toLocaleDateString(
                            language === "fr" ? "fr-FR" : "en-GB"
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${
                              (r.rating || 0) > i
                                ? "text-amber-500 fill-amber-400"
                                : "text-slate-200"
                            }`}
                          />
                        ))}
                      </div>
                      {r.comment && (
                        <p className="text-slate-700 whitespace-pre-line">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  ))}
              </div>

              {/* Formulaire avis */}
              <form onSubmit={handleSubmitReview} className="border-t pt-3 mt-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  {language === "fr"
                    ? "Laisser une note et un avis"
                    : "Leave a rating and review"}
                </div>
                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewRating(i + 1)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          newRating > i
                            ? "text-amber-500 fill-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    </button>
                  ))}
                </div>
                <Textarea
                  rows={3}
                  className="text-sm mb-2"
                  placeholder={
                    language === "fr" ? "Votre avis…" : "Your review…"
                  }
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                />
                <Button
                  type="submit"
                  size="sm"
                  className="bg-pro-blue hover:bg-blue-700"
                  disabled={submitReviewLoading || newRating === 0}
                >
                  {submitReviewLoading
                    ? language === "fr"
                      ? "Envoi de l’avis..."
                      : "Sending review..."
                    : language === "fr"
                    ? "Envoyer l’avis"
                    : "Submit review"}
                </Button>
              </form>
            </div>
          </div>

          {/* Colonne droite : coordonnées + formulaire */}
          <div className="w-full lg:w-[360px] space-y-4">
            {/* Coordonnées directes */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                {language === "fr"
                  ? "Coordonnées directes"
                  : "Direct contact"}
              </h2>
              <div className="space-y-2 text-xs">
                {worker.phone && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <a href={`tel:${worker.phone}`}>
                      <Phone className="w-3 h-3 mr-2" />
                      {worker.phone}
                    </a>
                  </Button>
                )}
                {worker.email && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <a href={`mailto:${worker.email}`}>
                      <Mail className="w-3 h-3 mr-2" />
                      {worker.email}
                    </a>
                  </Button>
                )}
                {whatsappUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-start"
                    asChild
                  >
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-3 h-3 mr-2" />
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>

            {/* Formulaire de contact */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                {language === "fr"
                  ? "Contacter cet ouvrier"
                  : "Contact this worker"}
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                {language === "fr"
                  ? "Remplissez le formulaire ci-dessous pour être recontacté."
                  : "Fill in the form below to be contacted back."}
              </p>

              {submitError && (
                <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {submitError}
                </div>
              )}
              {submitSuccess && (
                <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                  {submitSuccess}
                </div>
              )}

              <form onSubmit={handleSubmitContact} className="space-y-3 text-sm">
                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr" ? "Votre nom" : "Your name"}
                  </label>
                  <Input
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr" ? "Votre téléphone" : "Your phone"}
                  </label>
                  <Input
                    value={clientPhone}
                    onChange={(e) => setClientPhone(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr"
                      ? "Votre email (facultatif)"
                      : "Your email (optional)"}
                  </label>
                  <Input
                    type="email"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr"
                      ? "Type de demande"
                      : "Request type"}
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pro-blue"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                  >
                    <option value="Demande de devis">
                      {language === "fr"
                        ? "Demande de devis"
                        : "Quote request"}
                    </option>
                    <option value="Demande de rappel">
                      {language === "fr"
                        ? "Demande de rappel"
                        : "Call back request"}
                    </option>
                    <option value="Autre">
                      {language === "fr" ? "Autre" : "Other"}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr"
                      ? "Budget approximatif (facultatif)"
                      : "Approx. budget (optional)"}
                  </label>
                  <Input
                    type="number"
                    value={approxBudget}
                    onChange={(e) => setApproxBudget(e.target.value)}
                    placeholder="5000000"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr"
                      ? "Date souhaitée (facultatif)"
                      : "Desired date (optional)"}
                  </label>
                  <Input
                    type="date"
                    value={desiredDate}
                    onChange={(e) => setDesiredDate(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr"
                      ? "Votre message"
                      : "Your message"}
                  </label>
                  <Textarea
                    rows={4}
                    value={clientMessage}
                    onChange={(e) => setClientMessage(e.target.value)}
                    required
                    placeholder={
                      language === "fr"
                        ? "Décrivez vos besoins, les travaux à réaliser, les délais souhaités…"
                        : "Describe your needs, work to be done, expected deadlines…"
                    }
                  />
                </div>

                <div className="flex items-start gap-2 text-[11px]">
                  <input
                    id="share-consent"
                    type="checkbox"
                    className="mt-0.5"
                    checked={acceptedSharing}
                    onChange={(e) => setAcceptedSharing(e.target.checked)}
                  />
                  <label htmlFor="share-consent" className="text-slate-500">
                    {language === "fr"
                      ? "J’accepte que mes coordonnées soient transmises à cet ouvrier."
                      : "I agree that my contact details are shared with this worker."}
                  </label>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-pro-blue hover:bg-blue-700"
                  disabled={submitting}
                >
                  {submitting
                    ? language === "fr"
                      ? "Envoi de la demande..."
                      : "Sending request..."
                    : language === "fr"
                    ? "Envoyer la demande"
                    : "Send request"}
                </Button>
              </form>

              <p className="mt-3 text-[11px] text-slate-400">
                {language === "fr"
                  ? "Vos données sont uniquement transmises à ce professionnel."
                  : "Your data is only shared with this professional."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetail;
