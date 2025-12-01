// src/components/WorkerReviews.tsx
import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star as StarIcon } from "lucide-react";

type WorkerReviewsProps = {
  workerId: string;
};

type ReviewRow = {
  id: string;
  worker_id: string;
  client_id: string | null;
  author_name: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
};

const WorkerReviews: React.FC<WorkerReviewsProps> = ({ workerId }) => {
  const { language } = useLanguage();

  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [reviews, setReviews] = useState<ReviewRow[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const text = {
    title: language === "fr" ? "Avis clients" : "Customer reviews",
    noReviews:
      language === "fr" ? "Aucun avis pour le moment." : "No reviews yet.",
    leaveTitle:
      language === "fr"
        ? "Laisser une note et un avis"
        : "Leave a rating and a review",
    mustLogin:
      language === "fr"
        ? "Vous devez être connecté pour laisser un avis."
        : "You must be logged in to leave a review.",
    yourRating: language === "fr" ? "Votre note" : "Your rating",
    yourComment: language === "fr" ? "Votre avis" : "Your review",
    send: language === "fr" ? "Envoyer l'avis" : "Submit review",
    sending: language === "fr" ? "Envoi en cours..." : "Submitting...",
    errorLoad:
      language === "fr"
        ? "Impossible de charger les avis pour le moment."
        : "Unable to load reviews at the moment.",
    errorSubmit:
      language === "fr"
        ? "Impossible d'enregistrer votre avis pour le moment."
        : "Unable to save your review at the moment.",
    successSubmit:
      language === "fr"
        ? "Merci, votre avis a bien été enregistré."
        : "Thank you, your review has been saved.",
    requiredRating:
      language === "fr"
        ? "Merci de sélectionner une note."
        : "Please select a rating.",
    checkingSession:
      language === "fr"
        ? "Vérification de la session..."
        : "Checking session...",
    loadingReviews:
      language === "fr" ? "Chargement des avis..." : "Loading reviews...",
    averageLabel:
      language === "fr" ? "Note moyenne" : "Average rating",
    reviewsCountLabel:
      language === "fr" ? "avis" : "reviews",
  };

  // 🔐 Vérifier la session (pour le formulaire uniquement)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("auth error", error);
          setIsAuthenticated(false);
          setCurrentUser(null);
        } else if (data?.user) {
          setIsAuthenticated(true);
          setCurrentUser(data.user);
        } else {
          setIsAuthenticated(false);
          setCurrentUser(null);
        }
      } catch (e) {
        console.error("auth check exception", e);
        setIsAuthenticated(false);
        setCurrentUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // 🔄 Charger les avis existants (toujours, même sans login)
  const loadReviews = async () => {
    if (!workerId) return;

    setLoadingReviews(true);
    setReviewsError(null);

    try {
      const { data, error } = await supabase
        .from("op_ouvrier_reviews")
        .select(
          "id, worker_id, client_id, author_name, rating, comment, created_at"
        )
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("load reviews error", error);
        setReviewsError(text.errorLoad);
        setReviews([]);
        return;
      }

      setReviews((data ?? []) as ReviewRow[]);
    } catch (e) {
      console.error("load reviews exception", e);
      setReviewsError(text.errorLoad);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    loadReviews();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  // ⭐ clic sur les étoiles (formulaire)
  const displayRating = hoverRating ?? rating;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!currentUser) {
      setSubmitError(text.mustLogin);
      return;
    }

    if (!rating) {
      setSubmitError(text.requiredRating);
      return;
    }

    setSubmitting(true);

    try {
      const displayName =
        (currentUser.user_metadata?.full_name as string | undefined) ||
        (currentUser.user_metadata?.name as string | undefined) ||
        currentUser.email ||
        (language === "fr" ? "Client OuvriersPro" : "OuvriersPro client");

      const { error } = await supabase.from("op_ouvrier_reviews").insert({
        worker_id: workerId,
        client_id: currentUser.id, // RLS : client_id = auth.uid()
        author_name: displayName,
        rating,
        comment: comment.trim() || null,
      });

      if (error) {
        console.error("insert review error", error);
        setSubmitError(text.errorSubmit);
      } else {
        setSubmitSuccess(text.successSubmit);
        setRating(0);
        setHoverRating(null);
        setComment("");
        await loadReviews(); // rafraîchir liste + stats
      }
    } catch (e) {
      console.error("insert review exception", e);
      setSubmitError(text.errorSubmit);
    } finally {
      setSubmitting(false);
    }
  };

  // 📊 Calcul local de la note moyenne & nombre d'avis
  const reviewsCount = reviews.length;
  const averageRating =
    reviewsCount > 0
      ? Number(
          (
            reviews.reduce(
              (sum, r) => sum + (r.rating ?? 0),
              0
            ) / reviewsCount
          ).toFixed(1)
        )
      : null;

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">{text.title}</h2>

      {/* Résumé note moyenne + nombre d'avis */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1">
          <StarIcon className="w-5 h-5 text-yellow-500 fill-yellow-500" />
          <span className="text-lg font-semibold">
            {averageRating !== null ? averageRating.toFixed(1) : "—"}
          </span>
        </div>
        <span className="text-sm text-muted-foreground">
          {reviewsCount > 0
            ? `${reviewsCount} ${text.reviewsCountLabel}`
            : text.noReviews}
        </span>
      </div>

      {/* Liste des avis */}
      {loadingReviews && (
        <p className="text-sm text-muted-foreground">
          {text.loadingReviews}
        </p>
      )}

      {reviewsError && (
        <p className="text-sm text-destructive mb-4">{reviewsError}</p>
      )}

      {!loadingReviews && !reviewsError && reviewsCount > 0 && (
        <div className="space-y-4 mb-6">
          {reviews.map((review) => (
            <div
              key={review.id}
              className="p-4 bg-muted/30 rounded-lg border border-border"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-medium">
                  {review.author_name ||
                    (language === "fr"
                      ? "Client anonyme"
                      : "Anonymous client")}
                </span>
                <div className="flex items-center gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      className={`w-4 h-4 ${
                        i < (review.rating || 0)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
              </div>
              {review.comment && (
                <p className="text-sm text-muted-foreground">
                  {review.comment}
                </p>
              )}
              {review.created_at && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {new Date(review.created_at).toLocaleDateString(
                    language === "fr" ? "fr-FR" : "en-US",
                    {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    }
                  )}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulaire de dépôt d'avis */}
      <div className="mt-4 pt-4 border-t border-border">
        <h3 className="text-base font-semibold mb-3">
          {text.leaveTitle}
        </h3>

        {!authChecked ? (
          <p className="text-sm text-muted-foreground">
            {text.checkingSession}
          </p>
        ) : !isAuthenticated ? (
          <p className="text-sm text-muted-foreground">
            {text.mustLogin}
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Note */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {text.yourRating}
              </label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setRating(value)}
                    onMouseEnter={() => setHoverRating(value)}
                    onMouseLeave={() => setHoverRating(null)}
                    className="p-0.5"
                  >
                    <StarIcon
                      className={`w-6 h-6 ${
                        value <= displayRating
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Commentaire */}
            <div>
              <label className="block text-sm font-medium mb-1">
                {text.yourComment}
              </label>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
            </div>

            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
            {submitSuccess && (
              <p className="text-sm text-emerald-600">{submitSuccess}</p>
            )}

            <Button type="submit" disabled={submitting}>
              {submitting ? text.sending : text.send}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
};

export default WorkerReviews;
