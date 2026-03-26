// src/pages/WorkerDetail.tsx
import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import { favoritesRepository } from "@/services/favoritesRepository";
import { syncService } from "@/services/syncService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ReportAccountDialog from "@/components/ReportAccountDialog";
import {
  Mail,
  Phone,
  MessageCircle,
  MapPin,
  Star,
  ExternalLink,
  AlertTriangle,
  X,
  WifiOff,
  Heart,
  Loader2,
  Clock3,
} from "lucide-react";
import { useUiMode } from "@/hooks/useUiMode";

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
  sync_status?: "pending" | "synced";
};

type WorkerPhoto = {
  id: string;
  public_url: string | null;
  title: string | null;
};

type VoteType = "like" | "useful" | "not_useful";

type ReviewVoteRow = {
  review_id: string;
  voter_user_id: string;
  vote_type: VoteType;
};

type ViewerRole = "client" | "worker" | null;

type CachedClientRequest = {
  id: string;
  created_at: string | null;
  worker_name: string | null;
  status: string | null;
  message: string | null;
  origin: string | null;
  sync_status?: "pending" | "synced";
};

const WORKER_CACHE_KEY_PREFIX = "cached_worker_profile";
const WORKER_REVIEWS_CACHE_KEY_PREFIX = "cached_worker_reviews";
const WORKER_PHOTOS_CACHE_KEY_PREFIX = "cached_worker_photos";
const REQUESTS_CACHE_PREFIX = "cached_client_requests";

const getWorkerCacheKey = (workerId?: string | null) =>
  workerId ? `${WORKER_CACHE_KEY_PREFIX}:${workerId}` : WORKER_CACHE_KEY_PREFIX;

const getWorkerReviewsCacheKey = (workerId?: string | null) =>
  workerId ? `${WORKER_REVIEWS_CACHE_KEY_PREFIX}:${workerId}` : WORKER_REVIEWS_CACHE_KEY_PREFIX;

const getWorkerPhotosCacheKey = (workerId?: string | null) =>
  workerId ? `${WORKER_PHOTOS_CACHE_KEY_PREFIX}:${workerId}` : WORKER_PHOTOS_CACHE_KEY_PREFIX;

const getRequestsCacheKey = (userId?: string | null) =>
  userId ? `${REQUESTS_CACHE_PREFIX}:${userId}` : REQUESTS_CACHE_PREFIX;

const createOfflineId = (prefix: string) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

const normalizeReview = (row: any): Review => ({
  id: row.id,
  rating: row.rating ?? null,
  comment: row.comment ?? null,
  created_at: row.created_at,
  client_name: row.client_name ?? row.name ?? row.author_name ?? null,
  sync_status: "synced",
});

const areReviewsLikelySame = (localReview: Review, serverReview: Review) => {
  const localComment = String(localReview.comment || "").trim();
  const serverComment = String(serverReview.comment || "").trim();
  const localRating = Number(localReview.rating || 0);
  const serverRating = Number(serverReview.rating || 0);

  const localTime = new Date(localReview.created_at).getTime();
  const serverTime = new Date(serverReview.created_at).getTime();

  return (
    localRating === serverRating &&
    localComment === serverComment &&
    Math.abs(localTime - serverTime) <= 10 * 60 * 1000
  );
};

const mergeServerAndPendingReviews = (serverReviews: Review[], cachedReviews: Review[]) => {
  const pendingOnly = cachedReviews.filter((r) => r.sync_status === "pending");

  const dedupedPending = pendingOnly.filter(
    (pendingReview) =>
      !serverReviews.some((serverReview) => areReviewsLikelySame(pendingReview, serverReview))
  );

  return [...dedupedPending, ...serverReviews].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

const WorkerDetail: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const params = useParams();
  const workerId = (params.workerId as string) || (params.id as string);

  const { connected, initialized } = useNetworkStatus();
  const { isMobileUI } = useUiMode();

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [loadingWorker, setLoadingWorker] = useState(true);
  const [workerError, setWorkerError] = useState<string | null>(null);
  const [usedWorkerCache, setUsedWorkerCache] = useState(false);

  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [viewerRole, setViewerRole] = useState<ViewerRole>(null);

  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [favoriteInfo, setFavoriteInfo] = useState<string | null>(null);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);
  const [favoritesLoadedFromCache, setFavoritesLoadedFromCache] = useState(false);

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

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [newRating, setNewRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [submitReviewLoading, setSubmitReviewLoading] = useState(false);
  const [usedReviewsCache, setUsedReviewsCache] = useState(false);

  const [myVoteByReviewId, setMyVoteByReviewId] = useState<Record<string, VoteType | null>>({});
  const [countsByReviewId, setCountsByReviewId] = useState<
    Record<string, { like: number; useful: number; not_useful: number }>
  >({});
  const [voteError, setVoteError] = useState<string | null>(null);

  const [photos, setPhotos] = useState<WorkerPhoto[]>([]);
  const [photosLoading, setPhotosLoading] = useState(false);
  const [photosError, setPhotosError] = useState<string | null>(null);
  const [usedPhotosCache, setUsedPhotosCache] = useState(false);

  const [contactOpen, setContactOpen] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);

  useEffect(() => {
    const opened = contactOpen || galleryOpen;
    if (!opened) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [contactOpen, galleryOpen]);

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
      offline:
        language === "fr"
          ? "Les réactions nécessitent une connexion Internet."
          : "Reactions require an internet connection.",
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
      missing: language === "fr" ? "Localisation non renseignée." : "Location not provided.",
      offline:
        language === "fr"
          ? "La carte intégrée nécessite Internet. Les informations de localisation restent visibles."
          : "The embedded map requires internet. Location information remains visible.",
    };
  }, [language]);

  const tReport = useMemo(() => {
    return {
      report: language === "fr" ? "Signaler ce profil" : "Report this profile",
      loginToReport: language === "fr" ? "Se connecter pour signaler" : "Log in to report",
    };
  }, [language]);

  const tGallery = useMemo(() => {
    return {
      title: language === "fr" ? "Galerie photos" : "Photo gallery",
      subtitle:
        language === "fr"
          ? "Découvrez quelques réalisations de cet ouvrier."
          : "Discover some works from this worker.",
      open: language === "fr" ? "Mes réalisations" : "My work",
      close: language === "fr" ? "Fermer" : "Close",
      empty:
        language === "fr"
          ? "Aucune réalisation publiée pour le moment."
          : "No work published yet.",
      offline:
        language === "fr"
          ? "Affichage des photos déjà synchronisées localement."
          : "Showing photos already synced locally.",
    };
  }, [language]);

  const tContact = useMemo(() => {
    return {
      cta: language === "fr" ? "Demander une intervention" : "Request an intervention",
      title: language === "fr" ? "Contacter cet ouvrier" : "Contact this worker",
      subtitle:
        language === "fr"
          ? "Remplissez le formulaire ci-dessous pour être recontacté."
          : "Fill in the form below to be contacted back.",
      close: language === "fr" ? "Fermer" : "Close",
      sentAutoClose:
        language === "fr" ? "Votre demande a été envoyée. Fermeture…" : "Request sent. Closing…",
      offline:
        language === "fr"
          ? "Vous pouvez enregistrer votre demande hors connexion. Elle sera conservée localement pour synchronisation ultérieure."
          : "You can save your request offline. It will be stored locally for later sync.",
      offlineSaved:
        language === "fr"
          ? "Demande enregistrée localement. Elle apparaît maintenant dans vos demandes hors ligne."
          : "Request saved locally. It now appears in your offline requests.",
      loginRequiredOffline:
        language === "fr"
          ? "Vous devez avoir déjà été connecté sur cet appareil pour enregistrer une demande hors ligne."
          : "You must have already been logged in on this device to save an offline request.",
    };
  }, [language]);

  const tOffline = useMemo(() => {
    return {
      title: language === "fr" ? "Mode hors connexion" : "Offline mode",
      profile:
        language === "fr"
          ? "Affichage du profil synchronisé jusqu’à la dernière connexion."
          : "Showing the profile synced up to the last connection.",
      reviews:
        language === "fr"
          ? "Affichage des avis synchronisés jusqu’à la dernière connexion."
          : "Showing the reviews synced up to the last connection.",
      cacheProfile:
        language === "fr"
          ? "Profil chargé depuis le cache local."
          : "Profile loaded from local cache.",
      cacheReviews:
        language === "fr"
          ? "Avis chargés depuis le cache local."
          : "Reviews loaded from local cache.",
      cachePhotos:
        language === "fr"
          ? "Photos chargées depuis le cache local."
          : "Photos loaded from local cache.",
      pendingReview:
        language === "fr"
          ? "Avis enregistré localement, en attente de synchronisation."
          : "Review saved locally, pending synchronization.",
    };
  }, [language]);

  const tFavorite = useMemo(() => {
    return {
      add: language === "fr" ? "Ajouter aux favoris" : "Add to favourites",
      remove: language === "fr" ? "Retirer des favoris" : "Remove from favourites",
      loading: language === "fr" ? "Mise à jour..." : "Updating...",
      loginRequired:
        language === "fr"
          ? "Connectez-vous pour ajouter ce prestataire à vos favoris."
          : "Log in to add this provider to your favourites.",
      addedOnline:
        language === "fr"
          ? "Prestataire ajouté aux favoris."
          : "Provider added to favourites.",
      removedOnline:
        language === "fr"
          ? "Prestataire retiré des favoris."
          : "Provider removed from favourites.",
      addedOffline:
        language === "fr"
          ? "Favori enregistré hors ligne. Il sera synchronisé automatiquement."
          : "Favourite saved offline. It will sync automatically.",
      removedOffline:
        language === "fr"
          ? "Retrait enregistré hors ligne. Il sera synchronisé automatiquement."
          : "Offline removal saved. It will sync automatically.",
      cacheLoaded:
        language === "fr"
          ? "État des favoris chargé depuis le cache local."
          : "Favourite state loaded from local cache.",
    };
  }, [language]);

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      try {
        const cachedUserId = await authCache.getUserId();

        if (!connected) {
          if (!mounted) return;
          setAuthUserId(cachedUserId ?? null);
          return;
        }

        const { data } = await supabase.auth.getUser();
        const liveUserId = data.user?.id ?? null;

        if (!mounted) return;

        if (liveUserId) {
          setAuthUserId(liveUserId);
          return;
        }

        setAuthUserId(cachedUserId ?? null);
      } catch {
        const cachedUserId = await authCache.getUserId();
        if (!mounted) return;
        setAuthUserId(cachedUserId ?? null);
      }
    };

    if (initialized) {
      void load();
    }

    const { data: sub } = supabase.auth.onAuthStateChange(async (_evt, session) => {
      if (!mounted) return;

      if (session?.user?.id) {
        setAuthUserId(session.user.id);
        return;
      }

      const cachedUserId = await authCache.getUserId();
      if (!mounted) return;
      setAuthUserId(cachedUserId ?? null);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, [initialized, connected]);

  useEffect(() => {
    let cancelled = false;

    const detectRole = async () => {
      if (!authUserId) {
        if (!cancelled) setViewerRole(null);
        return;
      }

      if (!connected) {
        const cachedRole = await authCache.getRole();
        if (cancelled) return;

        if (cachedRole === "client") {
          setViewerRole("client");
          return;
        }

        if (cachedRole === "worker") {
          setViewerRole("worker");
          return;
        }

        setViewerRole(null);
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

        const cachedRole = await authCache.getRole();
        if (cancelled) return;

        if (cachedRole === "client") {
          setViewerRole("client");
          return;
        }

        if (cachedRole === "worker") {
          setViewerRole("worker");
          return;
        }

        setViewerRole(null);
      } catch (e) {
        console.error("detectRole error", e);

        const cachedRole = await authCache.getRole();
        if (cancelled) return;

        if (cachedRole === "client") {
          setViewerRole("client");
          return;
        }

        if (cachedRole === "worker") {
          setViewerRole("worker");
          return;
        }

        setViewerRole(null);
      }
    };

    void detectRole();

    return () => {
      cancelled = true;
    };
  }, [authUserId, connected]);

  useEffect(() => {
    const loadWorker = async () => {
      if (!workerId) {
        setWorkerError(language === "fr" ? "Aucun ouvrier spécifié." : "No worker specified.");
        setLoadingWorker(false);
        return;
      }

      setLoadingWorker(true);
      setWorkerError(null);
      setUsedWorkerCache(false);

      const cacheKey = getWorkerCacheKey(workerId);

      const readCache = async () => {
        const cached = await localStore.get<WorkerProfile>(cacheKey);
        if (cached) {
          setWorker(cached);
          setUsedWorkerCache(true);
          setWorkerError(null);
          return true;
        }
        return false;
      };

      try {
        if (!connected) {
          const ok = await readCache();
          if (!ok) {
            setWorkerError(
              language === "fr"
                ? "Profil non disponible hors connexion."
                : "Profile unavailable offline."
            );
          }
          return;
        }

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
          const ok = await readCache();
          if (!ok) {
            setWorkerError(
              language === "fr"
                ? "Impossible de charger le profil de cet ouvrier."
                : "Unable to load this worker profile."
            );
          }
        } else {
          const nextWorker = data as WorkerProfile;
          setWorker(nextWorker);
          setUsedWorkerCache(false);
          await localStore.set(cacheKey, nextWorker);
        }
      } catch (e) {
        console.error("loadWorker exception", e);
        const ok = await readCache();
        if (!ok) {
          setWorkerError(
            language === "fr"
              ? "Impossible de charger le profil de cet ouvrier."
              : "Unable to load this worker profile."
          );
        }
      } finally {
        setLoadingWorker(false);
      }
    };

    if (initialized) {
      void loadWorker();
    }
  }, [workerId, language, connected, initialized]);

  useEffect(() => {
    let cancelled = false;

    const loadFavoriteState = async () => {
      setFavoriteError(null);
      setFavoriteInfo(null);
      setFavoritesLoadedFromCache(false);

      if (!initialized || !workerId) return;

      const resolvedUserId = authUserId || (await authCache.getUserId());
      if (!resolvedUserId) {
        if (!cancelled) {
          setIsFavorite(false);
          setFavoriteId(null);
        }
        return;
      }

      try {
        const result = await favoritesRepository.loadFavorites(resolvedUserId, connected);
        if (cancelled) return;

        const match = result.items.find((item) => item.worker_id === workerId) || null;
        setIsFavorite(!!match);
        setFavoriteId(match?.id ?? null);
        setFavoritesLoadedFromCache(result.fromCache);

        if (result.fromCache) {
          setFavoriteInfo(tFavorite.cacheLoaded);
        }
      } catch (error) {
        console.error("[WorkerDetail] loadFavoriteState error:", error);
        if (cancelled) return;
        setIsFavorite(false);
        setFavoriteId(null);
      }
    };

    void loadFavoriteState();

    return () => {
      cancelled = true;
    };
  }, [authUserId, connected, initialized, workerId, tFavorite.cacheLoaded]);

  const fetchReviews = async (wid: string) => {
    setReviewsLoading(true);
    setReviewsError(null);
    setUsedReviewsCache(false);

    const cacheKey = getWorkerReviewsCacheKey(wid);

    const readCache = async () => {
      const cached = await localStore.get<Review[]>(cacheKey);
      if (cached) {
        const normalizedCached = [...cached].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        setReviews(normalizedCached);
        setUsedReviewsCache(true);
        return true;
      }
      setReviews([]);
      setUsedReviewsCache(true);
      return false;
    };

    try {
      if (!connected) {
        await readCache();
        return;
      }

      const { data, error } = await supabase
        .from("op_ouvrier_reviews")
        .select("*")
        .eq("worker_id", wid)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("loadReviews error", error);
        const ok = await readCache();
        if (!ok) {
          setReviewsError(
            language === "fr" ? "Impossible de charger les avis." : "Unable to load reviews."
          );
        }
      } else {
        const serverMapped: Review[] = (data || []).map((r: any) => normalizeReview(r));
        const cachedReviews = (await localStore.get<Review[]>(cacheKey)) || [];
        const merged = mergeServerAndPendingReviews(serverMapped, cachedReviews);

        setReviews(merged);
        setUsedReviewsCache(false);
        await localStore.set(cacheKey, merged);
      }
    } catch (e) {
      console.error("fetchReviews error", e);
      const ok = await readCache();
      if (!ok) {
        setReviewsError(
          language === "fr" ? "Impossible de charger les avis." : "Unable to load reviews."
        );
      }
    } finally {
      setReviewsLoading(false);
    }
  };

  useEffect(() => {
    if (!workerId || !initialized) return;
    void fetchReviews(workerId);
  }, [workerId, language, connected, initialized]);

  useEffect(() => {
    const loadPhotos = async () => {
      if (!workerId) return;

      setPhotosLoading(true);
      setPhotosError(null);
      setUsedPhotosCache(false);

      const cacheKey = getWorkerPhotosCacheKey(workerId);

      const readCache = async () => {
        const cached = await localStore.get<WorkerPhoto[]>(cacheKey);
        if (cached) {
          setPhotos(cached);
          setUsedPhotosCache(true);
          return true;
        }
        setPhotos([]);
        setUsedPhotosCache(true);
        return false;
      };

      try {
        if (!connected) {
          await readCache();
          return;
        }

        const { data, error } = await supabase
          .from("op_ouvrier_photos")
          .select("id, public_url, title")
          .eq("worker_id", workerId)
          .order("created_at", { ascending: false })
          .limit(12);

        if (error) {
          console.error("loadPhotos error", error);
          const ok = await readCache();
          if (!ok) {
            setPhotosError(
              language === "fr" ? "Impossible de charger les photos." : "Unable to load photos."
            );
          }
        } else {
          const nextPhotos = (data || []) as WorkerPhoto[];
          setPhotos(nextPhotos);
          setUsedPhotosCache(false);
          await localStore.set(cacheKey, nextPhotos);
        }
      } catch (e) {
        console.error("loadPhotos exception", e);
        const ok = await readCache();
        if (!ok) {
          setPhotosError(
            language === "fr" ? "Impossible de charger les photos." : "Unable to load photos."
          );
        }
      } finally {
        setPhotosLoading(false);
      }
    };

    if (initialized) {
      void loadPhotos();
    }
  }, [workerId, language, connected, initialized]);

  const fullName =
    (worker?.first_name || "") + (worker?.last_name ? ` ${worker.last_name}` : "");

  const location = [
    worker?.country,
    worker?.region,
    worker?.city,
    worker?.commune,
    worker?.district,
  ]
    .filter(Boolean)
    .join(" • ");

  const locationQuery = useMemo(() => {
    const parts = [
      worker?.district,
      worker?.commune,
      worker?.city,
      worker?.region,
      worker?.country,
    ].filter(Boolean);
    return parts.join(", ");
  }, [worker?.district, worker?.commune, worker?.city, worker?.region, worker?.country]);

  const hasCoords =
    Number.isFinite(worker?.latitude as any) && Number.isFinite(worker?.longitude as any);

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
      ? Math.round(
          (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10
        ) / 10
      : 0;

  const canReportWorker =
    Boolean(authUserId) &&
    viewerRole !== "worker" &&
    (!worker?.user_id || worker.user_id !== authUserId);

  const reportTargetId = (worker?.user_id ?? worker?.id) as string;

  const loadVotesAndCounts = async () => {
    const reviewIds = reviews
      .filter((r) => r.sync_status !== "pending")
      .map((r) => r.id);

    if (reviewIds.length === 0) {
      setMyVoteByReviewId({});
      setCountsByReviewId({});
      return;
    }

    if (!connected) {
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
    void loadVotesAndCounts().catch((e) => console.error("loadVotesAndCounts error", e));
  }, [reviewsKey, authUserId, connected]);

  const toggleVote = async (reviewId: string, voteType: VoteType) => {
    if (!connected) {
      setVoteError(tVotes.offline);
      return;
    }

    if (!authUserId) {
      setVoteError(tVotes.mustLogin);
      return;
    }

    const targetReview = reviews.find((r) => r.id === reviewId);
    if (targetReview?.sync_status === "pending") {
      setVoteError(
        language === "fr"
          ? "Les réactions sont disponibles après synchronisation de l’avis."
          : "Reactions are available after the review is synchronized."
      );
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
        return {
          ...prev,
          [reviewId]: { ...base, [voteType]: Math.max(0, base[voteType] - 1) },
        };
      });
      return;
    }

    const payload = { review_id: reviewId, voter_user_id: authUserId, vote_type: voteType };
    const { error: upsertError } = await supabase
      .from("op_review_votes")
      .upsert(payload, { onConflict: "review_id,voter_user_id" });

    if (upsertError) {
      console.error("toggleVote upsert error", upsertError);
      setVoteError(
        `${tVotes.voteError} (${upsertError.code ?? "no_code"}: ${upsertError.message})`
      );
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

  const resetContactForm = () => {
    setRequestType("Demande de devis");
    setApproxBudget("");
    setDesiredDate("");
    setClientMessage("");
  };

  const openContact = useCallback(() => {
    setSubmitError(null);
    setSubmitSuccess(null);
    setContactOpen(true);
  }, []);

  const closeContact = useCallback(() => {
    setContactOpen(false);
  }, []);

  const openGallery = useCallback(() => {
    setGalleryOpen(true);
  }, []);

  const closeGallery = useCallback(() => {
    setGalleryOpen(false);
  }, []);

  const handleToggleFavorite = useCallback(async () => {
    if (!worker) return;

    const resolvedUserId = authUserId || (await authCache.getUserId());

    if (!resolvedUserId) {
      navigate(`/login?redirect=${encodeURIComponent(`/ouvrier/${worker.id}`)}`);
      return;
    }

    setFavoriteLoading(true);
    setFavoriteError(null);
    setFavoriteInfo(null);

    try {
      if (isFavorite) {
        await favoritesRepository.removeFavorite({
          userId: resolvedUserId,
          connected,
          workerId: worker.id,
          favoriteId,
        });

        setIsFavorite(false);
        setFavoriteId(null);
        setFavoriteInfo(connected ? tFavorite.removedOnline : tFavorite.removedOffline);
      } else {
        const result = await favoritesRepository.addFavorite({
          userId: resolvedUserId,
          connected,
          workerId: worker.id,
          workerName: fullName || (language === "fr" ? "Ouvrier" : "Worker"),
          profession: worker.profession ?? null,
        });

        setIsFavorite(true);
        setFavoriteId(result.id);
        setFavoriteInfo(connected ? tFavorite.addedOnline : tFavorite.addedOffline);
      }
    } catch (error: any) {
      console.error("[WorkerDetail] favorite toggle error:", error);
      setFavoriteError(
        error?.message ||
          (language === "fr"
            ? "Impossible de mettre à jour les favoris."
            : "Unable to update favourites.")
      );
    } finally {
      setFavoriteLoading(false);
    }
  }, [
    worker,
    authUserId,
    connected,
    favoriteId,
    isFavorite,
    tFavorite,
    fullName,
    language,
    navigate,
  ]);

  const addCachedClientRequest = async (userId: string, request: CachedClientRequest) => {
    const cacheKey = getRequestsCacheKey(userId);
    const existing = (await localStore.get<CachedClientRequest[]>(cacheKey)) || [];

    const next = [request, ...existing.filter((item) => item.id !== request.id)];

    next.sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });

    await localStore.set(cacheKey, next);
  };

  const buildDetailedMessage = () => {
    const detailedMessageLines: string[] = [];
    if (requestType) {
      detailedMessageLines.push(
        `${language === "fr" ? "Type de demande" : "Request type"} : ${requestType}`
      );
    }
    if (approxBudget) {
      detailedMessageLines.push(
        `${language === "fr" ? "Budget approximatif" : "Approx. budget"} : ${approxBudget}`
      );
    }
    if (desiredDate) {
      detailedMessageLines.push(
        `${language === "fr" ? "Date souhaitée" : "Desired date"} : ${desiredDate}`
      );
    }
    if (clientMessage) {
      detailedMessageLines.push(clientMessage);
    }
    return detailedMessageLines.join("\n");
  };

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
      const detailedMessage = buildDetailedMessage();

      if (!connected) {
        const cachedUserId = authUserId || (await authCache.getUserId());

        if (!cachedUserId) {
          throw new Error(tContact.loginRequiredOffline);
        }

        const offlineContactId = createOfflineId("offline_contact");
        const offlineClientId = `local_client_${cachedUserId}`;
        const createdAt = new Date().toISOString();

        const payload = {
          id: offlineContactId,
          user_id: cachedUserId,
          worker_id: worker.id,
          client_id: offlineClientId,
          full_name: clientName || null,
          email: clientEmail || null,
          phone: clientPhone || null,
          message: detailedMessage || "",
          status: "new",
          origin: "offline",
          client_name: clientName || null,
          client_email: clientEmail || null,
          client_phone: clientPhone || null,
          worker_name: fullName || null,
          created_at: createdAt,
        };

        await syncService.enqueue({
          id: createOfflineId("queue"),
          action_type: "CREATE_CONTACT_REQUEST",
          table_name: "op_ouvrier_contacts",
          payload_json: payload,
          created_at: createdAt,
        });

        await addCachedClientRequest(cachedUserId, {
          id: offlineContactId,
          created_at: createdAt,
          worker_name: fullName || (language === "fr" ? "Ouvrier" : "Worker"),
          status: "pending_sync",
          message: detailedMessage || "",
          origin: "offline",
          sync_status: "pending",
        });

        setSubmitSuccess(tContact.offlineSaved);
        resetContactForm();

        window.setTimeout(() => {
          closeContact();
          setSubmitSuccess(null);
        }, 1100);

        return;
      }

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
            : "Client profile not found."
        );
      }

      const insertPayload = {
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
      };

      const { data: insertedContact, error: contactError } = await supabase
        .from("op_ouvrier_contacts")
        .insert(insertPayload)
        .select("id, created_at, worker_name, status, message, origin")
        .maybeSingle();

      if (contactError) {
        console.error("insert contact error", contactError);
        throw new Error(
          language === "fr"
            ? "Une erreur est survenue lors de l'envoi de votre demande."
            : "An error occurred while sending your request."
        );
      }

      const userIdForCache = user.id;
      await addCachedClientRequest(userIdForCache, {
        id: insertedContact?.id || createOfflineId("synced_contact"),
        created_at: insertedContact?.created_at || new Date().toISOString(),
        worker_name: insertedContact?.worker_name || fullName || null,
        status: insertedContact?.status || "new",
        message: insertedContact?.message || detailedMessage || "",
        origin: insertedContact?.origin || "web",
        sync_status: "synced",
      });

      setSubmitSuccess(
        language === "fr" ? "Votre demande a été envoyée." : "Your request was sent."
      );
      resetContactForm();

      window.setTimeout(() => {
        closeContact();
        setSubmitSuccess(null);
      }, 900);
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

    if (newRating <= 0) {
      setReviewsError(
        language === "fr" ? "Veuillez sélectionner une note." : "Please select a rating."
      );
      return;
    }

    setSubmitReviewLoading(true);
    setReviewsError(null);

    try {
      const resolvedUserId = authUserId || (await authCache.getUserId());

      if (!resolvedUserId) {
        throw new Error(
          language === "fr"
            ? "Veuillez vous connecter pour laisser un avis."
            : "Please log in to leave a review."
        );
      }

      if (!connected) {
        const localReviewId = createOfflineId("offline_review");
        const createdAt = new Date().toISOString();

        const offlineReview: Review = {
          id: localReviewId,
          rating: newRating,
          comment: newComment?.trim() ? newComment.trim() : null,
          created_at: createdAt,
          client_name: language === "fr" ? "Vous" : "You",
          sync_status: "pending",
        };

        const nextReviews = [offlineReview, ...reviews].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        setReviews(nextReviews);
        setUsedReviewsCache(true);
        await localStore.set(getWorkerReviewsCacheKey(worker.id), nextReviews);

        await syncService.enqueue({
          id: createOfflineId("queue"),
          action_type: "CREATE_WORKER_REVIEW",
          table_name: "op_ouvrier_reviews",
          payload_json: {
            id: localReviewId,
            local_review_id: localReviewId,
            user_id: resolvedUserId,
            worker_id: worker.id,
            rating: newRating,
            comment: newComment?.trim() ? newComment.trim() : null,
            client_name: language === "fr" ? "Vous" : "You",
            created_at: createdAt,
          },
          created_at: createdAt,
        });

        setNewRating(0);
        setNewComment("");
        setReviewsError(
          language === "fr"
            ? "Avis enregistré hors ligne. Il sera synchronisé automatiquement."
            : "Review saved offline. It will sync automatically."
        );
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData.session?.user ?? null;

      if (!user) {
        throw new Error(
          language === "fr"
            ? "Veuillez vous connecter pour laisser un avis."
            : "Please log in to leave a review."
        );
      }

      const payloadBase: any = {
        client_id: user.id,
        worker_id: worker.id,
        rating: newRating,
        comment: newComment?.trim() ? newComment.trim() : null,
      };

      const payloadWithStatus = { ...payloadBase, status: "pending" };

      let insertError: any = null;
      let inserted: any = null;

      const attempt1 = await supabase
        .from("op_ouvrier_reviews")
        .insert(payloadWithStatus)
        .select("id")
        .maybeSingle();
      insertError = attempt1.error;
      inserted = attempt1.data;

      if (insertError && /column .*status/i.test(insertError.message || "")) {
        const attempt2 = await supabase
          .from("op_ouvrier_reviews")
          .insert(payloadBase)
          .select("id")
          .maybeSingle();
        insertError = attempt2.error;
        inserted = attempt2.data;
      }

      if (insertError || !inserted?.id) {
        console.error("insert review error", insertError);
        throw new Error(
          language === "fr"
            ? "Impossible d’enregistrer votre avis."
            : "Unable to save your review."
        );
      }

      await fetchReviews(worker.id);
      setNewRating(0);
      setNewComment("");
    } catch (err: any) {
      console.error(err);
      setReviewsError(err.message || "Error");
    } finally {
      setSubmitReviewLoading(false);
    }
  };

  if (loadingWorker || !initialized) {
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

        {!connected && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{tOffline.title}</div>
              <div className="text-xs text-amber-800 mt-1">{tOffline.profile}</div>
            </div>
          </div>
        )}

        {(usedWorkerCache || usedReviewsCache || usedPhotosCache || favoritesLoadedFromCache) && (
          <div className="mb-4 space-y-2">
            {usedWorkerCache && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                {tOffline.cacheProfile}
              </div>
            )}
            {usedReviewsCache && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                {tOffline.cacheReviews}
              </div>
            )}
            {usedPhotosCache && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                {tOffline.cachePhotos}
              </div>
            )}
            {favoritesLoadedFromCache && (
              <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
                {tFavorite.cacheLoaded}
              </div>
            )}
          </div>
        )}

        {isMobileUI && (
          <div className="fixed left-0 right-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <div className="max-w-6xl mx-auto space-y-2">
              <Button
                type="button"
                variant={isFavorite ? "outline" : "secondary"}
                className={`w-full shadow-lg ${
                  isFavorite
                    ? "border-rose-200 bg-white text-rose-600 hover:bg-rose-50"
                    : "bg-white text-slate-900 hover:bg-slate-100"
                }`}
                onClick={handleToggleFavorite}
                disabled={favoriteLoading}
              >
                {favoriteLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {tFavorite.loading}
                  </>
                ) : (
                  <>
                    <Heart className={`mr-2 h-4 w-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`} />
                    {isFavorite ? tFavorite.remove : tFavorite.add}
                  </>
                )}
              </Button>

              <Button
                type="button"
                className="w-full bg-pro-blue hover:bg-blue-700 shadow-lg"
                onClick={openContact}
              >
                {tContact.cta}
              </Button>
            </div>
          </div>
        )}

        <div className={`flex flex-col lg:flex-row gap-6 ${isMobileUI ? "pb-32" : "pb-0"}`}>
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
                    <div className="text-[11px] text-slate-500">
                      {language === "fr" ? "avis" : "reviews"}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {reviews.length} {language === "fr" ? "avis" : reviews.length <= 1 ? "review" : "reviews"}
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
                    <div className="text-[11px] text-slate-500">
                      {language === "fr" ? "par heure" : "per hour"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">{tMap.title}</h2>
              <p className="text-xs text-slate-500 mb-3">{tMap.subtitle}</p>

              {!hasAnyLocation ? (
                <div className="text-xs text-slate-500">{tMap.missing}</div>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    {googleMapsUrl && (
                      <Button variant="outline" size="sm" asChild className="text-xs">
                        <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3 mr-2" />
                          {tMap.open}
                        </a>
                      </Button>
                    )}

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

                  {!connected ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-800">
                      {tMap.offline}
                    </div>
                  ) : (
                    <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <iframe
                        title="Google Maps"
                        src={googleMapsEmbedUrl}
                        className="w-full h-[320px]"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

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

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-1">
                {language === "fr" ? "Avis clients" : "Customer reviews"}
              </h2>

              {!connected && (
                <div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  {tOffline.reviews}
                </div>
              )}

              {reviewsError && (
                <div className="mb-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {reviewsError}
                </div>
              )}

              <div className="flex items-center gap-2 mb-3 text-sm">
                <div className="inline-flex items-center gap-1 text-amber-500">
                  <Star className="w-4 h-4 fill-amber-400" />
                  <span className="font-semibold">
                    {averageRating > 0 ? averageRating.toFixed(1) : "—"}
                  </span>
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
                    const counts = countsByReviewId[r.id] ?? {
                      like: 0,
                      useful: 0,
                      not_useful: 0,
                    };

                    return (
                      <div
                        key={r.id}
                        className={`border rounded-lg px-3 py-2 text-xs ${
                          r.sync_status === "pending"
                            ? "border-amber-200 bg-amber-50/50"
                            : "border-slate-100"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1 gap-2">
                          <span className="font-semibold text-slate-800">
                            {r.client_name || "Client"}
                          </span>

                          <div className="flex items-center gap-2">
                            {r.sync_status === "pending" && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">
                                <Clock3 className="w-3 h-3" />
                                {language === "fr" ? "En attente" : "Pending"}
                              </span>
                            )}
                            <span className="text-[11px] text-slate-400">
                              {new Date(r.created_at).toLocaleDateString(
                                language === "fr" ? "fr-FR" : "en-GB"
                              )}
                            </span>
                          </div>
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

                        {r.comment && <p className="text-slate-700 whitespace-pre-line">{r.comment}</p>}

                        {r.sync_status === "pending" ? (
                          <div className="mt-3 text-[11px] text-amber-700">{tOffline.pendingReview}</div>
                        ) : (
                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant={myVote === "like" ? "default" : "outline"}
                              className="h-8 px-3 text-xs"
                              onClick={() => toggleVote(r.id, "like")}
                              disabled={!authUserId || !connected}
                              title={
                                !connected
                                  ? tVotes.offline
                                  : !authUserId
                                  ? tVotes.mustLogin
                                  : undefined
                              }
                            >
                              {tVotes.like} ({counts.like})
                            </Button>

                            <Button
                              type="button"
                              variant={myVote === "useful" ? "default" : "outline"}
                              className="h-8 px-3 text-xs"
                              onClick={() => toggleVote(r.id, "useful")}
                              disabled={!authUserId || !connected}
                              title={
                                !connected
                                  ? tVotes.offline
                                  : !authUserId
                                  ? tVotes.mustLogin
                                  : undefined
                              }
                            >
                              {tVotes.useful} ({counts.useful})
                            </Button>

                            <Button
                              type="button"
                              variant={myVote === "not_useful" ? "default" : "outline"}
                              className="h-8 px-3 text-xs"
                              onClick={() => toggleVote(r.id, "not_useful")}
                              disabled={!authUserId || !connected}
                              title={
                                !connected
                                  ? tVotes.offline
                                  : !authUserId
                                  ? tVotes.mustLogin
                                  : undefined
                              }
                            >
                              {tVotes.notUseful} ({counts.not_useful})
                            </Button>
                          </div>
                        )}
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
                    <button
                      key={i}
                      type="button"
                      onClick={() => setNewRating(i + 1)}
                      className="focus:outline-none"
                    >
                      <Star
                        className={`w-4 h-4 ${
                          newRating > i ? "text-amber-500 fill-amber-400" : "text-slate-200"
                        }`}
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
                      ? connected
                        ? "Envoi de l’avis..."
                        : "Enregistrement local..."
                      : connected
                      ? "Sending review..."
                      : "Saving locally..."
                    : language === "fr"
                    ? connected
                      ? "Envoyer l’avis"
                      : "Enregistrer hors ligne"
                    : connected
                    ? "Submit review"
                    : "Save offline"}
                </Button>
              </form>
            </div>
          </div>

          <div className="w-full lg:w-[360px] space-y-4">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                {language === "fr" ? "Coordonnées directes" : "Direct contact"}
              </h2>

              {(favoriteError || favoriteInfo) && (
                <div className="mb-3 space-y-2">
                  {favoriteError && (
                    <div className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
                      {favoriteError}
                    </div>
                  )}
                  {favoriteInfo && (
                    <div className="rounded-lg border border-sky-100 bg-sky-50 px-3 py-2 text-xs text-sky-700">
                      {favoriteInfo}
                    </div>
                  )}
                </div>
              )}

              <div className="mb-3">
                {canReportWorker ? (
                  <ReportAccountDialog
                    reportedUserId={reportTargetId}
                    reportedRole="worker"
                    triggerLabel={tReport.report}
                    className="w-full justify-start"
                  />
                ) : authUserId ? null : (
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => navigate("/login")}
                  >
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    {tReport.loginToReport}
                  </Button>
                )}
              </div>

              <div className="mb-3">
                <Button
                  type="button"
                  variant={isFavorite ? "outline" : "secondary"}
                  className={`w-full justify-start ${
                    isFavorite
                      ? "border-rose-200 text-rose-600 hover:bg-rose-50"
                      : "hover:bg-slate-100"
                  }`}
                  onClick={handleToggleFavorite}
                  disabled={favoriteLoading}
                >
                  {favoriteLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {tFavorite.loading}
                    </>
                  ) : (
                    <>
                      <Heart
                        className={`w-4 h-4 mr-2 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`}
                      />
                      {isFavorite ? tFavorite.remove : tFavorite.add}
                    </>
                  )}
                </Button>
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

              <div className="mt-3 space-y-2">
                <Button
                  type="button"
                  className="w-full bg-pro-blue hover:bg-blue-700"
                  onClick={openContact}
                >
                  {tContact.cta}
                </Button>
                <Button type="button" variant="outline" className="w-full" onClick={openGallery}>
                  {tGallery.open}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {contactOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={closeContact} />

            <div
              className={isMobileUI ? "absolute inset-x-0 bottom-0" : "absolute inset-0 flex items-center justify-center p-4"}
            >
              <div
                className={[
                  "bg-white border border-slate-200 shadow-xl overflow-auto",
                  isMobileUI
                    ? "rounded-t-2xl w-full max-h-[85vh]"
                    : "rounded-2xl w-full max-w-[560px] max-h-[85vh]",
                ].join(" ")}
                role="dialog"
                aria-modal="true"
              >
                <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{tContact.title}</div>
                    <div className="text-xs text-slate-500">{tContact.subtitle}</div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={closeContact}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {!connected && (
                    <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                      {tContact.offline}
                    </div>
                  )}

                  {submitError && (
                    <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                      {submitError}
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                      {submitSuccess}
                      {connected ? (
                        <span className="ml-2 text-emerald-600">{tContact.sentAutoClose}</span>
                      ) : null}
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
                        {language === "fr" ? "Type de demande" : "Request type"}
                      </label>
                      <select
                        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-pro-blue"
                        value={requestType}
                        onChange={(e) => setRequestType(e.target.value)}
                      >
                        <option value="Demande de devis">
                          {language === "fr" ? "Demande de devis" : "Quote request"}
                        </option>
                        <option value="Demande de rappel">
                          {language === "fr" ? "Demande de rappel" : "Call back request"}
                        </option>
                        <option value="Autre">{language === "fr" ? "Autre" : "Other"}</option>
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
                        id="share-consent-modal"
                        type="checkbox"
                        className="mt-0.5"
                        checked={acceptedSharing}
                        onChange={(e) => setAcceptedSharing(e.target.checked)}
                      />
                      <label htmlFor="share-consent-modal" className="text-slate-500">
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
                          ? connected
                            ? "Envoi de la demande..."
                            : "Enregistrement local..."
                          : connected
                          ? "Sending request..."
                          : "Saving locally..."
                        : language === "fr"
                        ? connected
                          ? "Envoyer la demande"
                          : "Enregistrer hors ligne"
                        : connected
                        ? "Send request"
                        : "Save offline"}
                    </Button>
                  </form>

                  <p className="mt-3 text-[11px] text-slate-400">
                    {language === "fr"
                      ? connected
                        ? "Vos données sont uniquement transmises à ce professionnel."
                        : "Votre demande sera conservée localement sur cet appareil."
                      : connected
                      ? "Your data is only shared with this professional."
                      : "Your request will be kept locally on this device."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {galleryOpen && (
          <div className="fixed inset-0 z-50">
            <div className="absolute inset-0 bg-black/40" onClick={closeGallery} />

            <div
              className={isMobileUI ? "absolute inset-x-0 bottom-0" : "absolute inset-0 flex items-center justify-center p-4"}
            >
              <div
                className={[
                  "bg-white border border-slate-200 shadow-xl overflow-auto",
                  isMobileUI
                    ? "rounded-t-2xl w-full max-h-[85vh]"
                    : "rounded-2xl w-full max-w-[960px] max-h-[85vh]",
                ].join(" ")}
                role="dialog"
                aria-modal="true"
              >
                <div className="p-4 border-b border-slate-100 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{tGallery.title}</div>
                    <div className="text-xs text-slate-500">{tGallery.subtitle}</div>
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={closeGallery}>
                    <X className="w-5 h-5" />
                  </Button>
                </div>

                <div className="p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                  {!connected && (
                    <div className="mb-3 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded px-3 py-2">
                      {tGallery.offline}
                    </div>
                  )}

                  {photosError && (
                    <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
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
                      <div className="sm:col-span-3 text-xs text-slate-500 border border-slate-100 bg-slate-50 rounded-lg px-3 py-2">
                        {tGallery.empty}
                      </div>
                    )}

                    {!photosLoading &&
                      photos.map((p) => (
                        <div
                          key={p.id}
                          className="aspect-[4/3] rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                        >
                          {p.public_url && (
                            <img
                              src={p.public_url}
                              alt={p.title || ""}
                              className="w-full h-full object-cover"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerDetail;
