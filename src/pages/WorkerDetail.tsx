// src/pages/WorkerDetail.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReportWorkerButton from "@/components/workers/ReportWorkerButton";
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Star,
  ExternalLink,
  Image as ImageIcon,
} from "lucide-react";

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

  latitude: number | null;
  longitude: number | null;
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
  description?: string | null;
};

type VoteType = "like" | "useful" | "not_useful";

type ReviewVoteRow = {
  review_id: string;
  voter_user_id: string;
  vote_type: VoteType;
};

type ViewerRole = "client" | "worker" | null;

// --------------------
// Portfolio types
// --------------------
type PortfolioRow = {
  id: string;
  worker_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  date_completed: string | null;
  cover_photo_url: string | null;
  created_at: string;

  // Optionnels (si tu les ajoutes à la table)
  category?: string | null;
  price?: number | null;
  currency?: string | null;
};

type PortfolioPhotoKind = "before" | "after" | "other";

type PortfolioPhotoJoinRow = {
  portfolio_id: string;
  kind: PortfolioPhotoKind;
  sort_order: number | null;
  photo: {
    id: string;
    public_url: string | null;
    title: string | null;
    description: string | null;
  } | null;
};

type PortfolioMedia = {
  before: WorkerPhoto[];
  after: WorkerPhoto[];
  other: WorkerPhoto[];
};

const WorkerDetail: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const params = useParams();
  const workerId = (params.workerId as string) || (params.id as string);

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [loadingWorker, setLoadingWorker] = useState(true);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // Auth
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<ViewerRole>(null);

  // Formulaire de contact
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

  // Avis
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);

  // Votes
  const [myVoteByReviewId, setMyVoteByReviewId] = useState<Record<string, VoteType | null>>({});
  const [countsByReviewId, setCountsByReviewId] = useState<
    Record<string, { like: number; useful: number; not_useful: number }>
  >({});
  const [voteError, setVoteError] = useState<string | null>(null);

  // Photos (galerie)
  const [photos, setPhotos] = useState<WorkerPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);

  // Portfolio (réalisations)
  const [portfolio, setPortfolio] = useState<PortfolioRow[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [portfolioError, setPortfolioError] = useState<string | null>(null);
  const [portfolioMediaById, setPortfolioMediaById] = useState<Record<string, PortfolioMedia>>({});

  const tVotes = useMemo(() => {
    return {
      like: language === "fr" ? "J’aime" : "Like",
      useful: language === "fr" ? "Utile" : "Useful",
      notUseful: language === "fr" ? "Pas utile" : "Not useful",
      mustLogin: language === "fr" ? "Connectez-vous pour réagir." : "Log in to react.",
      voteError:
        language === "fr"
          ? "Impossible d’enregistrer votre réaction."
          : "Unable to save your reaction.",
    };
  }, [language]);

  const tMap = useMemo(() => {
    return {
      title: language === "fr" ? "Localisation" : "Location",
      subtitle:
        language === "fr"
          ? "Localisation approximative / zone d’intervention."
          : "Approximate location / service area.",
      open: language === "fr" ? "Ouvrir dans Google Maps" : "Open in Google Maps",
      missing:
        language === "fr" ? "Localisation non renseignée." : "Location not provided.",
    };
  }, [language]);

  const tPortfolio = useMemo(() => {
    return {
      title: language === "fr" ? "Portfolio" : "Portfolio",
      subtitle:
        language === "fr"
          ? "Réalisations, avant/après, détails, prix, etc."
          : "Works, before/after, details, price, etc.",
      empty:
        language === "fr"
          ? "Aucune réalisation pour le moment."
          : "No work items yet.",
      before: language === "fr" ? "Avant" : "Before",
      after: language === "fr" ? "Après" : "After",
      gallery: language === "fr" ? "Galerie" : "Gallery",
      price: language === "fr" ? "Prix" : "Price",
      category: language === "fr" ? "Catégorie" : "Category",
      completed: language === "fr" ? "Terminé" : "Completed",
      location: language === "fr" ? "Lieu" : "Location",
    };
  }, [language]);

  // Auth user id
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted) return;
      setAuthUserId(data.user?.id ?? null);
    };

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      if (!mounted) return;
      setAuthUserId(session?.user?.id ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  // Détecter le rôle (conservé)
  useEffect(() => {
    let cancelled = false;

    const detectRole = async () => {
      if (!authUserId) {
        if (!cancelled) setViewerRole(null);
        return;
      }

      try {
        const { data: clientRow, error: clientErr } = await supabase
          .from("op_clients")
          .select("id")
          .eq("user_id", authUserId)
          .maybeSingle();

        if (cancelled) return;

        if (!clientErr && clientRow?.id) {
          setViewerRole("client");
          return;
        }

        const { data: workerRow, error: workerErr } = await supabase
          .from("op_ouvriers")
          .select("id")
          .eq("user_id", authUserId)
          .maybeSingle();

        if (cancelled) return;

        if (!workerErr && workerRow?.id) {
          setViewerRole("worker");
          return;
        }

        setViewerRole(null);
      } catch (e) {
        console.error("detectRole error", e);
        setViewerRole(null);
      }
    };

    detectRole();

    return () => {
      cancelled = true;
    };
  }, [authUserId]);

  // -----------------------
  // Load worker (profil)
  // -----------------------
  useEffect(() => {
    const loadWorker = async () => {
      if (!workerId) {
        setWorkerError(language === "fr" ? "Aucun ouvrier spécifié." : "No worker specified.");
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
          currency,
          latitude,
          longitude
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

  // -----------------------
  // Reviews
  // -----------------------
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
        setReviewsError(language === "fr" ? "Impossible de charger les avis." : "Unable to load reviews.");
      } else {
        const mapped: Review[] = (data || []).map((r: any) => ({
          id: r.id,
          rating: r.rating ?? null,
          comment: r.comment ?? null,
          created_at: r.created_at,
          client_name: r.client_name ?? r.name ?? r.author_name ?? null,
        }));
        setReviews(mapped);
      }

      setReviewsLoading(false);
    };

    loadReviews();
  }, [workerId, language]);

  // -----------------------
  // Photos (galerie simple)
  // -----------------------
  useEffect(() => {
    const loadPhotos = async () => {
      if (!workerId) return;

      setPhotosLoading(true);
      setPhotosError(null);

      const { data, error } = await supabase
        .from("op_ouvrier_photos")
        .select("id, public_url, title, description")
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false })
        .limit(12);

      if (error) {
        console.error("loadPhotos error", error);
        setPhotosError(language === "fr" ? "Impossible de charger les photos." : "Unable to load photos.");
      } else {
        setPhotos((data || []) as WorkerPhoto[]);
      }

      setPhotosLoading(false);
    };

    loadPhotos();
  }, [workerId, language]);

  // -----------------------
  // Portfolio (réalisations + medias)
  // - Table principale: op_ouvrier_portfolio
  // - Table optionnelle de liaison: op_ouvrier_portfolio_photos
  // -----------------------
  useEffect(() => {
    const loadPortfolio = async () => {
      if (!workerId) return;

      setPortfolioLoading(true);
      setPortfolioError(null);

      try {
        // 1) Réalisations
        const { data: rows, error: pErr } = await supabase
          .from("op_ouvrier_portfolio")
          .select(
            `
            id,
            worker_id,
            title,
            description,
            location,
            date_completed,
            cover_photo_url,
            created_at
          `
          )
          .eq("worker_id", workerId)
          .order("created_at", { ascending: false })
          .limit(12);

        if (pErr) throw pErr;

        const items = (rows || []) as PortfolioRow[];
        setPortfolio(items);

        // Reset medias map
        if (!items.length) {
          setPortfolioMediaById({});
          setPortfolioLoading(false);
          return;
        }

        // 2) Tenter de charger la liaison portfolio->photos (avant/après/galerie)
        //    Si la table n'existe pas, on fallback sans casser.
        const portfolioIds = items.map((x) => x.id);

        const { data: joinRows, error: jErr } = await supabase
          .from("op_ouvrier_portfolio_photos")
          .select(
            `
            portfolio_id,
            kind,
            sort_order,
            photo:op_ouvrier_photos (
              id,
              public_url,
              title,
              description
            )
          `
          )
          .in("portfolio_id", portfolioIds);

        if (jErr) {
          // Fallback propre: on n'a pas la table de liaison (ou pas de droits),
          // on garde les items avec cover_photo_url seulement.
          console.warn("Portfolio join table not available or not permitted:", jErr?.message);
          const fallbackMap: Record<string, PortfolioMedia> = {};
          for (const it of items) {
            fallbackMap[it.id] = { before: [], after: [], other: [] };
          }
          setPortfolioMediaById(fallbackMap);
          setPortfolioLoading(false);
          return;
        }

        const map: Record<string, PortfolioMedia> = {};
        for (const it of items) map[it.id] = { before: [], after: [], other: [] };

        const normalized = (joinRows || []) as PortfolioPhotoJoinRow[];
        // Tri stable sort_order puis created
        normalized
          .slice()
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .forEach((r) => {
            if (!r?.portfolio_id || !map[r.portfolio_id]) return;
            const kind = (r.kind || "other") as PortfolioPhotoKind;
            const photo = r.photo
              ? ({
                  id: r.photo.id,
                  public_url: r.photo.public_url,
                  title: r.photo.title,
                  description: r.photo.description,
                } as WorkerPhoto)
              : null;
            if (!photo) return;

            if (kind === "before") map[r.portfolio_id].before.push(photo);
            else if (kind === "after") map[r.portfolio_id].after.push(photo);
            else map[r.portfolio_id].other.push(photo);
          });

        setPortfolioMediaById(map);
      } catch (e: any) {
        console.error("loadPortfolio error", e);
        setPortfolioError(
          language === "fr"
            ? "Impossible de charger le portfolio."
            : "Unable to load portfolio."
        );
      } finally {
        setPortfolioLoading(false);
      }
    };

    loadPortfolio();
  }, [workerId, language]);

  const fullName = (worker?.first_name || "") + (worker?.last_name ? ` ${worker.last_name}` : "");

  const location = [worker?.country, worker?.region, worker?.city, worker?.commune, worker?.district]
    .filter(Boolean)
    .join(" • ");

  const locationQuery = useMemo(() => {
    const parts = [worker?.district, worker?.commune, worker?.city, worker?.region, worker?.country].filter(Boolean);
    return parts.join(", ");
  }, [worker?.district, worker?.commune, worker?.city, worker?.region, worker?.country]);

  const hasCoords = Number.isFinite(worker?.latitude as any) && Number.isFinite(worker?.longitude as any);

  const googleMapsUrl = useMemo(() => {
    if (hasCoords && worker?.latitude != null && worker?.longitude != null) {
      return `https://www.google.com/maps?q=${worker.latitude},${worker.longitude}`;
    }
    if (locationQuery) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(locationQuery)}`;
    }
    return "";
  }, [hasCoords, worker?.latitude, worker?.longitude, locationQuery]);

  const googleMapsEmbedUrl = useMemo(() => {
    if (hasCoords && worker?.latitude != null && worker?.longitude != null) {
      return `https://www.google.com/maps?q=${worker.latitude},${worker.longitude}&output=embed`;
    }
    if (locationQuery) {
      return `https://www.google.com/maps?q=${encodeURIComponent(locationQuery)}&output=embed`;
    }
    return "";
  }, [hasCoords, worker?.latitude, worker?.longitude, locationQuery]);

  const whatsappUrl = worker?.phone
    ? (() => {
        const clean = worker.phone.replace(/\s+/g, "");
        const normalized = clean.startsWith("+") ? clean.slice(1) : clean;
        return `https://wa.me/${normalized}`;
      })()
    : "";

  const averageRating =
    reviews.length > 0
      ? Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
      : 0;

  // -----------------------
  // Votes (op_review_votes)
  // -----------------------
  const loadVotesAndCounts = async () => {
    const reviewIds = reviews.map((r) => r.id);
    if (reviewIds.length === 0) {
      setMyVoteByReviewId({});
      setCountsByReviewId({});
      return;
    }

    const initCounts: Record<string, { like: number; useful: number; not_useful: number }> = {};
    for (const id of reviewIds) initCounts[id] = { like: 0, useful: 0, not_useful: 0 };

    const { data: allVotes, error: votesError } = await supabase
      .from("op_review_votes")
      .select("review_id, voter_user_id, vote_type")
      .in("review_id", reviewIds);

    if (votesError) {
      console.error("loadCounts error", votesError);
      throw votesError;
    }

    const myVotesMap: Record<string, VoteType | null> = {};
    for (const v of (allVotes ?? []) as ReviewVoteRow[]) {
      const rid = v.review_id;
      if (!initCounts[rid]) continue;

      if (v.vote_type === "like") initCounts[rid].like += 1;
      if (v.vote_type === "useful") initCounts[rid].useful += 1;
      if (v.vote_type === "not_useful") initCounts[rid].not_useful += 1;

      if (authUserId && v.voter_user_id === authUserId) {
        myVotesMap[rid] = v.vote_type;
      }
    }

    for (const id of reviewIds) if (!(id in myVotesMap)) myVotesMap[id] = null;

    setCountsByReviewId(initCounts);
    setMyVoteByReviewId(authUserId ? myVotesMap : {});
  };

  const reviewsKey = useMemo(() => reviews.map((r) => r.id).join(","), [reviews]);

  useEffect(() => {
    setVoteError(null);
    loadVotesAndCounts().catch((e) => console.error("loadVotesAndCounts error", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewsKey, authUserId]);

  const toggleVote = async (reviewId: string, voteType: VoteType) => {
    if (!authUserId) {
      setVoteError(tVotes.mustLogin);
      return;
    }

    setVoteError(null);
    const current = myVoteByReviewId[reviewId] ?? null;

    if (current === voteType) {
      const { error } = await supabase
        .from("op_review_votes")
        .delete()
        .eq("review_id", reviewId)
        .eq("voter_user_id", authUserId);

      if (error) {
        console.error("toggleVote delete error", error);
        setVoteError(`${tVotes.voteError} (${error.code ?? "no_code"}: ${error.message})`);
        return;
      }

      setMyVoteByReviewId((prev) => ({ ...prev, [reviewId]: null }));
      setCountsByReviewId((prev) => {
        const base = prev[reviewId] ?? { like: 0, useful: 0, not_useful: 0 };
        return { ...prev, [reviewId]: { ...base, [voteType]: Math.max(0, base[voteType] - 1) } };
      });
      return;
    }

    const payload = { review_id: reviewId, voter_user_id: authUserId, vote_type: voteType };
    const { error: upsertError } = await supabase.from("op_review_votes").upsert(payload, {
      onConflict: "review_id,voter_user_id",
    });

    if (upsertError) {
      console.error("toggleVote upsert error", upsertError);
      setVoteError(`${tVotes.voteError} (${upsertError.code ?? "no_code"}: ${upsertError.message})`);
      return;
    }

    setMyVoteByReviewId((prev) => ({ ...prev, [reviewId]: voteType }));
    setCountsByReviewId((prev) => {
      const base = prev[reviewId] ?? { like: 0, useful: 0, not_useful: 0 };
      const next = { ...base };
      if (current) next[current] = Math.max(0, next[current] - 1);
      next[voteType] = next[voteType] + 1;
      return { ...prev, [reviewId]: next };
    });
  };

  // -----------------------
  // Contact / review submit
  // -----------------------
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

      const detailedMessageLines: string[] = [];
      if (requestType)
        detailedMessageLines.push(`${language === "fr" ? "Type de demande" : "Request type"} : ${requestType}`);
      if (approxBudget)
        detailedMessageLines.push(
          `${language === "fr" ? "Budget approximatif (facultatif)" : "Approx. budget (optional)"} : ${approxBudget}`
        );
      if (desiredDate)
        detailedMessageLines.push(
          `${language === "fr" ? "Date souhaitée (facultatif)" : "Desired date (optional)"} : ${desiredDate}`
        );
      if (clientMessage) detailedMessageLines.push(clientMessage);
      const detailedMessage = detailedMessageLines.join("\n");

      const { error: contactError } = await supabase.from("op_ouvrier_contacts").insert({
        worker_id: worker.id,
        client_id: clientProfileId,
        full_name: clientName || (user.user_metadata as any)?.full_name || user.email || null,
        email: clientEmail || user.email || null,
        phone: clientPhone || null,
        message: detailedMessage || "",
        status: "new",
        origin: "web",
        client_name: clientName || null,
        client_email: clientEmail || user.email || null,
        client_phone: clientPhone || null,
        worker_name: fullName || null,
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
          language === "fr" ? "Impossible d’enregistrer votre avis." : "Unable to save your review."
        );
      }

      setReviews((prev) => [
        {
          id: newReview.id,
          rating: newReview.rating ?? null,
          comment: newReview.comment ?? null,
          created_at: newReview.created_at,
          client_name: newReview.author_name ?? null,
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
          {language === "fr" ? "Chargement du profil ouvrier..." : "Loading worker profile..."}
        </div>
      </div>
    );
  }

  if (workerError || !worker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-sm text-red-600">
          {workerError || (language === "fr" ? "Ouvrier introuvable." : "Worker not found.")}
        </div>
      </div>
    );
  }

  const hasAnyLocation = Boolean(locationQuery) || hasCoords;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <button
          type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/search"))}
          className="mb-4 inline-flex items-center text-xs text-slate-500 hover:text-slate-700"
        >
          ← {language === "fr" ? "Retour" : "Back"}
        </button>

        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 space-y-4">
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
                      {fullName || (language === "fr" ? "Ouvrier" : "Worker")}
                    </h1>
                    {worker.profession && <p className="text-sm text-slate-600">{worker.profession}</p>}
                    {location && (
                      <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                        <MapPin className="w-3 h-3" />
                        {location}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 text-center text-xs">
                  <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="inline-flex items-center gap-1 text-amber-500">
                      <Star className="w-4 h-4 fill-amber-400" />
                      <span className="text-sm font-semibold">
                        {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">{language === "fr" ? "avis" : "reviews"}</div>
                    <div className="text-[11px] text-slate-400">
                      {reviews.length}{" "}
                      {language === "fr" ? "avis" : reviews.length <= 1 ? "review" : "reviews"}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">0</div>
                    <div className="text-[11px] text-slate-500">
                      {language === "fr" ? "ans d'expérience" : "years experience"}
                    </div>
                  </div>

                  <div className="flex flex-col items-center justify-center px-3 py-2 rounded-lg bg-slate-50 border border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">
                      {worker.hourly_rate != null
                        ? `${worker.hourly_rate.toLocaleString()} ${worker.currency || "GNF"}`
                        : "—"}
                    </div>
                    <div className="text-[11px] text-slate-500">{language === "fr" ? "par heure" : "per hour"}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Google Maps */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">{tMap.title}</h2>
              <p className="text-xs text-slate-500 mb-3">{tMap.subtitle}</p>

              {!hasAnyLocation ? (
                <div className="text-xs text-slate-500">{tMap.missing}</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <Button variant="outline" size="sm" asChild className="text-xs">
                      <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-3 h-3 mr-2" />
                        {tMap.open}
                      </a>
                    </Button>

                    <div className="text-xs text-slate-500">
                      {hasCoords && worker.latitude != null && worker.longitude != null ? (
                        <span className="font-medium text-slate-700">
                          {worker.latitude.toFixed(6)}, {worker.longitude.toFixed(6)}
                        </span>
                      ) : (
                        <span className="font-medium text-slate-700">{locationQuery}</span>
                      )}
                    </div>
                  </div>

                  <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                    <iframe
                      title="Google Maps"
                      src={googleMapsEmbedUrl}
                      className="w-full h-[320px]"
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                </>
              )}
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

            {/* ✅ PORTFOLIO (Réalisations + Avant/Après + Galerie) */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800 mb-1">{tPortfolio.title}</h2>
                  <p className="text-xs text-slate-500">{tPortfolio.subtitle}</p>
                </div>
              </div>

              {portfolioError && (
                <div className="mt-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {portfolioError}
                </div>
              )}

              <div className="mt-4">
                {portfolioLoading && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="h-40 rounded-xl bg-slate-100 border border-slate-200" />
                    <div className="h-40 rounded-xl bg-slate-100 border border-slate-200" />
                  </div>
                )}

                {!portfolioLoading && portfolio.length === 0 && (
                  <div className="text-xs text-slate-500">{tPortfolio.empty}</div>
                )}

                {!portfolioLoading && portfolio.length > 0 && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {portfolio.map((item) => {
                      const media = portfolioMediaById[item.id] || { before: [], after: [], other: [] };

                      const beforeCover = media.before.find((x) => x.public_url)?.public_url || null;
                      const afterCover = media.after.find((x) => x.public_url)?.public_url || null;

                      // Cover priorité: cover_photo_url > before > other > after
                      const cover =
                        item.cover_photo_url ||
                        beforeCover ||
                        media.other.find((x) => x.public_url)?.public_url ||
                        afterCover ||
                        null;

                      const hasBeforeAfter = Boolean(beforeCover || afterCover);

                      const dateLabel = item.date_completed
                        ? new Date(item.date_completed).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB")
                        : null;

                      return (
                        <div key={item.id} className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                          <div className="flex">
                            <div className="w-[140px] sm:w-[180px] bg-slate-50 border-r border-slate-200">
                              {cover ? (
                                <img src={cover} alt={item.title || ""} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full min-h-[140px] flex items-center justify-center text-slate-400">
                                  <ImageIcon className="w-6 h-6" />
                                </div>
                              )}
                            </div>

                            <div className="flex-1 p-3">
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <div className="text-sm font-semibold text-slate-900 truncate">
                                    {item.title || (language === "fr" ? "Réalisation" : "Work item")}
                                  </div>

                                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                                    {item.location ? (
                                      <span className="inline-flex items-center gap-1">
                                        <span className="font-medium text-slate-700">{tPortfolio.location}:</span>{" "}
                                        {item.location}
                                      </span>
                                    ) : null}

                                    {dateLabel ? (
                                      <span className="inline-flex items-center gap-1">
                                        <span className="font-medium text-slate-700">{tPortfolio.completed}:</span>{" "}
                                        {dateLabel}
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </div>

                              {item.description ? (
                                <p className="mt-2 text-xs text-slate-700 whitespace-pre-line line-clamp-3">
                                  {item.description}
                                </p>
                              ) : null}

                              {/* Avant/Après */}
                              {hasBeforeAfter && (
                                <div className="mt-3 grid grid-cols-2 gap-2">
                                  <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                                    <div className="px-2 py-1 text-[10px] font-medium text-slate-600 border-b border-slate-200">
                                      {tPortfolio.before}
                                    </div>
                                    <div className="aspect-[4/3]">
                                      {beforeCover ? (
                                        <img src={beforeCover} alt="Before" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                          <ImageIcon className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="rounded-lg border border-slate-200 overflow-hidden bg-slate-50">
                                    <div className="px-2 py-1 text-[10px] font-medium text-slate-600 border-b border-slate-200">
                                      {tPortfolio.after}
                                    </div>
                                    <div className="aspect-[4/3]">
                                      {afterCover ? (
                                        <img src={afterCover} alt="After" className="w-full h-full object-cover" />
                                      ) : (
                                        <div className="w-full h-full flex items-center justify-center text-slate-400">
                                          <ImageIcon className="w-4 h-4" />
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Galerie liée à la réalisation */}
                              {(media.other.length > 0 || media.before.length > 1 || media.after.length > 1) && (
                                <div className="mt-3">
                                  <div className="text-[10px] font-medium text-slate-600 mb-1">
                                    {tPortfolio.gallery}
                                  </div>
                                  <div className="flex gap-2 overflow-x-auto pb-1">
                                    {[...media.before, ...media.after, ...media.other]
                                      .filter((x) => x.public_url)
                                      .slice(0, 10)
                                      .map((ph) => (
                                        <div
                                          key={ph.id}
                                          className="w-16 h-16 rounded-lg overflow-hidden border border-slate-200 bg-slate-50 flex-shrink-0"
                                          title={ph.title || ""}
                                        >
                                          <img
                                            src={ph.public_url as string}
                                            alt={ph.title || ""}
                                            className="w-full h-full object-cover"
                                          />
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Galerie photos (générale) */}
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
                      {p.public_url && (
                        <img src={p.public_url} alt={p.title || ""} className="w-full h-full object-cover" />
                      )}
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

              <div className="flex items-center gap-2 mb-3 text-sm">
                <div className="inline-flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-semibold">{averageRating > 0 ? averageRating.toFixed(1) : "—"}</span>
                </div>
                <span className="text-xs text-slate-500">
                  {reviews.length} {language === "fr" ? "avis" : reviews.length <= 1 ? "review" : "reviews"}
                </span>
              </div>

              {voteError && (
                <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {voteError}
                </div>
              )}

              <div className="space-y-3 mb-4">
                {reviewsLoading && (
                  <div className="text-xs text-slate-500">
                    {language === "fr" ? "Chargement des avis..." : "Loading reviews..."}
                  </div>
                )}

                {!reviewsLoading && reviews.length === 0 && (
                  <div className="text-xs text-slate-500">
                    {language === "fr" ? "Aucun avis pour le moment." : "No review yet."}
                  </div>
                )}

                {!reviewsLoading &&
                  reviews.map((r) => {
                    const myVote = myVoteByReviewId[r.id] ?? null;
                    const counts = countsByReviewId[r.id] ?? { like: 0, useful: 0, not_useful: 0 };

                    return (
                      <div key={r.id} className="border border-slate-100 rounded-lg px-3 py-2 text-xs">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-slate-800">{r.client_name || "Client"}</span>
                          <span className="text-[11px] text-slate-400">
                            {new Date(r.created_at).toLocaleDateString(language === "fr" ? "fr-FR" : "en-GB")}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                (r.rating || 0) > i ? "text-amber-500 fill-amber-400" : "text-slate-200"
                              }`}
                            />
                          ))}
                        </div>

                        {r.comment && <p className="text-slate-700 whitespace-pre-line">{r.comment}</p>}

                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant={myVote === "like" ? "default" : "outline"}
                            className="h-8 px-3 text-xs"
                            onClick={() => toggleVote(r.id, "like")}
                            disabled={!authUserId}
                            title={!authUserId ? tVotes.mustLogin : undefined}
                          >
                            {tVotes.like} ({counts.like})
                          </Button>

                          <Button
                            type="button"
                            variant={myVote === "useful" ? "default" : "outline"}
                            className="h-8 px-3 text-xs"
                            onClick={() => toggleVote(r.id, "useful")}
                            disabled={!authUserId}
                            title={!authUserId ? tVotes.mustLogin : undefined}
                          >
                            {tVotes.useful} ({counts.useful})
                          </Button>

                          <Button
                            type="button"
                            variant={myVote === "not_useful" ? "default" : "outline"}
                            className="h-8 px-3 text-xs"
                            onClick={() => toggleVote(r.id, "not_useful")}
                            disabled={!authUserId}
                            title={!authUserId ? tVotes.mustLogin : undefined}
                          >
                            {tVotes.notUseful} ({counts.not_useful})
                          </Button>
                        </div>
                      </div>
                    );
                  })}
              </div>

              <form onSubmit={handleSubmitReview} className="border-t pt-3 mt-3">
                <div className="text-xs font-semibold text-slate-700 mb-2">
                  {language === "fr" ? "Laisser une note et un avis" : "Leave a rating and review"}
                </div>

                <div className="flex items-center gap-1 mb-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <button key={i} type="button" onClick={() => setNewRating(i + 1)} className="focus:outline-none">
                      <Star
                        className={`w-4 h-4 ${newRating > i ? "text-amber-500 fill-amber-400" : "text-slate-200"}`}
                      />
                    </button>
                  ))}
                </div>

                <Textarea
                  rows={3}
                  className="text-sm mb-2"
                  placeholder={language === "fr" ? "Votre avis…" : "Your review…"}
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

          {/* Colonne droite */}
          <div className="w-full lg:w-[360px] space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                {language === "fr" ? "Coordonnées directes" : "Direct contact"}
              </h2>

              {/* ✅ SIGNALER (toujours visible) */}
              <div className="mb-3">
                <ReportWorkerButton
                  workerId={worker.id}
                  workerName={fullName || null}
                  className="w-full justify-start"
                />
              </div>

              <div className="space-y-2 text-xs">
                {worker.phone && (
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href={`tel:${worker.phone}`}>
                      <Phone className="w-3 h-3 mr-2" />
                      {worker.phone}
                    </a>
                  </Button>
                )}
                {worker.email && (
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href={`mailto:${worker.email}`}>
                      <Mail className="w-3 h-3 mr-2" />
                      {worker.email}
                    </a>
                  </Button>
                )}
                {whatsappUrl && (
                  <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                    <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                      <MessageCircle className="w-3 h-3 mr-2" />
                      WhatsApp
                    </a>
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                {language === "fr" ? "Contacter cet ouvrier" : "Contact this worker"}
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
                  <Input value={clientName} onChange={(e) => setClientName(e.target.value)} required />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr" ? "Votre téléphone" : "Your phone"}
                  </label>
                  <Input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} required />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr" ? "Votre email (facultatif)" : "Your email (optional)"}
                  </label>
                  <Input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr" ? "Type de demande" : "Request type"}
                  </label>
                  <select
                    className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pro-blue"
                    value={requestType}
                    onChange={(e) => setRequestType(e.target.value)}
                  >
                    <option value="Demande de devis">{language === "fr" ? "Demande de devis" : "Quote request"}</option>
                    <option value="Demande de rappel">{language === "fr" ? "Demande de rappel" : "Call back request"}</option>
                    <option value="Autre">{language === "fr" ? "Autre" : "Other"}</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr" ? "Budget approximatif (facultatif)" : "Approx. budget (optional)"}
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
                    {language === "fr" ? "Date souhaitée (facultatif)" : "Desired date (optional)"}
                  </label>
                  <Input type="date" value={desiredDate} onChange={(e) => setDesiredDate(e.target.value)} />
                </div>

                <div>
                  <label className="text-xs text-slate-500 block mb-1">
                    {language === "fr" ? "Votre message" : "Your message"}
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

                <Button type="submit" className="w-full bg-pro-blue hover:bg-blue-700" disabled={submitting}>
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
