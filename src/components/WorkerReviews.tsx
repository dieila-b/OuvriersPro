import React, { useState } from "react";
import { Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useWorkerReviews } from "@/hooks/useWorkerReviews";

type Props = {
  workerId: string;
};

const WorkerReviews: React.FC<Props> = ({ workerId }) => {
  const { language } = useLanguage();
  const {
    reviews,
    loading,
    error,
    upsertReview,
    isClient,
    currentUserId,
  } = useWorkerReviews(workerId);

  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const text = {
    title: language === "fr" ? "Avis des clients" : "Customer reviews",
    addTitle:
      language === "fr"
        ? "Laisser une note et un avis"
        : "Leave a rating and review",
    placeholder:
      language === "fr"
        ? "Décrivez votre expérience avec cet ouvrier (ponctualité, qualité du travail, communication...)"
        : "Describe your experience with this worker (quality, communication, etc.)",
    submit:
      language === "fr" ? "Envoyer mon avis" : "Submit my review",
    update:
      language === "fr" ? "Mettre à jour mon avis" : "Update my review",
    mustBeClient:
      language === "fr"
        ? "Vous devez être connecté en tant que client pour laisser un avis."
        : "You must be logged in as a client to leave a review.",
    noReviews:
      language === "fr"
        ? "Aucun avis pour le moment. Soyez le premier à partager votre expérience."
        : "No review yet. Be the first to share your experience.",
  };

  const existingUserReview = reviews.find(
    (r) => r.client_id === currentUserId
  );

  React.useEffect(() => {
    if (existingUserReview) {
      setRating(existingUserReview.rating);
      setComment(existingUserReview.comment ?? "");
    }
  }, [existingUserReview]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isClient) return;

    try {
      setSubmitting(true);
      await upsertReview(rating, comment.trim());
      // Optionnel : message toast
    } catch (err) {
      console.error("[WorkerReviews] submit error", err);
      // TODO: toast d'erreur
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (value: number, onChange?: (v: number) => void) => (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type={onChange ? "button" : "button"}
          disabled={!onChange}
          onClick={onChange ? () => onChange(i) : undefined}
          className="text-yellow-400 disabled:opacity-100"
        >
          <Star
            className={`w-4 h-4 ${
              i <= value ? "fill-yellow-400" : "fill-none"
            }`}
          />
        </button>
      ))}
    </div>
  );

  return (
    <section className="mt-8 space-y-6">
      {/* Liste des avis */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">
          {text.title}
        </h3>

        {loading && (
          <p className="text-sm text-slate-500">
            {language === "fr"
              ? "Chargement des avis..."
              : "Loading reviews..."}
          </p>
        )}

        {error && (
          <p className="text-sm text-red-600">
            {error}
          </p>
        )}

        {!loading && !error && reviews.length === 0 && (
          <p className="text-sm text-slate-500">
            {text.noReviews}
          </p>
        )}

        {!loading && !error && reviews.length > 0 && (
          <div className="space-y-4">
            {reviews.map((r) => (
              <div
                key={r.id}
                className="border border-slate-100 rounded-xl px-3 py-2.5 bg-slate-50/60"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="h-7 w-7 rounded-full bg-pro-blue/10 flex items-center justify-center text-xs font-semibold text-pro-blue uppercase">
                      {(r.client_name || "Client")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((n) => n[0])
                        .join("")}
                    </div>
                    <span className="text-xs font-medium text-slate-800">
                      {r.client_name || "Client OuvriersPro"}
                    </span>
                  </div>
                  {renderStars(r.rating)}
                </div>
                {r.comment && (
                  <p className="text-sm text-slate-700 whitespace-pre-line">
                    {r.comment}
                  </p>
                )}
                <p className="mt-1 text-[11px] text-slate-400">
                  {new Date(r.created_at).toLocaleDateString("fr-FR")}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Formulaire d'ajout / édition */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-900 mb-3">
          {text.addTitle}
        </h3>

        {!isClient && (
          <p className="text-sm text-slate-500">
            {text.mustBeClient}
          </p>
        )}

        {isClient && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-700">
                {language === "fr" ? "Votre note :" : "Your rating:"}
              </span>
              {renderStars(rating, setRating)}
              <span className="text-xs text-slate-500">
                {rating}/5
              </span>
            </div>

            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={text.placeholder}
              rows={4}
              className="text-sm"
            />

            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                disabled={submitting}
                className="bg-pro-blue text-white hover:bg-pro-blue/90"
              >
                {existingUserReview ? text.update : text.submit}
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
};

export default WorkerReviews;
