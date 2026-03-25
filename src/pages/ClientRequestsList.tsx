// src/pages/ClientRequestsList.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  FileText,
  Wrench,
  WifiOff,
  Database,
  Clock3,
} from "lucide-react";

type ClientRequest = {
  id: string;
  created_at: string | null;
  worker_name: string | null;
  status: string | null;
  message: string | null;
  origin: string | null;
  sync_status?: "pending" | "synced";
};

type OfflineQueueItem = {
  id: string;
  action_type:
    | "CREATE_CONTACT_REQUEST"
    | "ADD_FAVORITE"
    | "REMOVE_FAVORITE"
    | "SEND_CLIENT_MESSAGE";
  table_name: "op_ouvrier_contacts" | "op_ouvrier_favorites" | "op_client_worker_messages";
  payload_json: Record<string, any>;
  created_at: string;
  status: "pending";
  retry_count: number;
};

const REQUESTS_CACHE_PREFIX = "cached_client_requests";
const OFFLINE_QUEUE_KEY = "offline_queue_v1";

const getRequestsCacheKey = (userId?: string | null) =>
  userId ? `${REQUESTS_CACHE_PREFIX}:${userId}` : REQUESTS_CACHE_PREFIX;

const ClientRequestsList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { connected, initialized } = useNetworkStatus();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [fromCache, setFromCache] = useState(false);

  const reconcileTimerRef = useRef<number | null>(null);

  const text = {
    title: language === "fr" ? "Mes demandes envoyées" : "My requests",
    subtitle:
      language === "fr"
        ? "Retrouvez ici toutes vos demandes envoyées aux ouvriers via la plateforme."
        : "See all your requests sent to workers through the platform.",
    noData:
      language === "fr"
        ? "Vous n'avez pas encore envoyé de demande."
        : "You have not sent any request yet.",
    back: language === "fr" ? "Retour à mon espace" : "Back to my space",
    statusNew: language === "fr" ? "Nouvelle" : "New",
    statusInProgress: language === "fr" ? "En cours" : "In progress",
    statusDone: language === "fr" ? "Terminée" : "Completed",
    statusUnknown: language === "fr" ? "Statut inconnu" : "Unknown status",
    sentOn: language === "fr" ? "Envoyée le" : "Sent on",
    worker: language === "fr" ? "Ouvrier" : "Worker",

    offlineTitle: language === "fr" ? "Mode hors connexion" : "Offline mode",
    offlineDesc:
      language === "fr"
        ? "Vos demandes restent consultables. Les nouvelles demandes enregistrées hors ligne apparaissent en attente de synchronisation."
        : "Your requests remain available. New offline requests appear as pending sync.",
    cacheLabel:
      language === "fr"
        ? "Demandes chargées depuis le cache local."
        : "Requests loaded from local cache.",
    pendingSync:
      language === "fr"
        ? "En attente de synchronisation"
        : "Pending synchronization",
    pendingShort: language === "fr" ? "En attente" : "Pending",
    synced: language === "fr" ? "Synchronisée" : "Synced",
  };

  const readQueue = async (): Promise<OfflineQueueItem[]> => {
    return (await localStore.get<OfflineQueueItem[]>(OFFLINE_QUEUE_KEY)) || [];
  };

  const loadCachedRequests = async (userId: string): Promise<ClientRequest[]> => {
    return (await localStore.get<ClientRequest[]>(getRequestsCacheKey(userId))) || [];
  };

  const saveCachedRequests = async (userId: string, items: ClientRequest[]) => {
    await localStore.set(getRequestsCacheKey(userId), items);
  };

  const normalizeServerRequests = (items: ClientRequest[]): ClientRequest[] => {
    return items.map((item) => ({
      ...item,
      sync_status: "synced",
    }));
  };

  const getPendingOfflineRequests = async (userId: string): Promise<ClientRequest[]> => {
    const queue = await readQueue();

    return queue
      .filter(
        (item) =>
          item.action_type === "CREATE_CONTACT_REQUEST" &&
          item.status === "pending" &&
          String(item.payload_json?.user_id || "") === String(userId)
      )
      .map((item) => ({
        id: String(item.payload_json?.id || item.id),
        created_at: item.payload_json?.created_at || item.created_at || null,
        worker_name: item.payload_json?.worker_name || null,
        status: "pending_sync",
        message: item.payload_json?.message || null,
        origin: item.payload_json?.origin || "offline",
        sync_status: "pending" as const,
      }));
  };

  const areRequestsLikelySame = (offlineReq: ClientRequest, serverReq: ClientRequest) => {
    const offlineWorker = String(offlineReq.worker_name || "").trim().toLowerCase();
    const serverWorker = String(serverReq.worker_name || "").trim().toLowerCase();

    const offlineMessage = String(offlineReq.message || "").trim();
    const serverMessage = String(serverReq.message || "").trim();

    const offlineOrigin = String(offlineReq.origin || "").trim().toLowerCase();
    const serverOrigin = String(serverReq.origin || "").trim().toLowerCase();

    const offlineTime = offlineReq.created_at ? new Date(offlineReq.created_at).getTime() : 0;
    const serverTime = serverReq.created_at ? new Date(serverReq.created_at).getTime() : 0;

    const timeCloseEnough = Math.abs(serverTime - offlineTime) <= 10 * 60 * 1000;

    return (
      offlineWorker === serverWorker &&
      offlineMessage === serverMessage &&
      offlineOrigin !== "web" &&
      timeCloseEnough
    );
  };

  const mergeRequests = (serverItems: ClientRequest[], pendingItems: ClientRequest[]) => {
    const dedupedPending = pendingItems.filter(
      (pending) => !serverItems.some((server) => areRequestsLikelySame(pending, server))
    );

    return [...dedupedPending, ...serverItems].sort((a, b) => {
      const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
      const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
      return tb - ta;
    });
  };

  const refreshRequests = async () => {
    setLoading(true);
    setError(null);

    try {
      const currentUserId = await authCache.getUserId();

      if (!currentUserId) {
        throw new Error(
          language === "fr"
            ? "Aucune session locale trouvée."
            : "No local session found."
        );
      }

      const readLocalOnly = async () => {
        const cached = await loadCachedRequests(currentUserId);
        const pending = await getPendingOfflineRequests(currentUserId);
        const merged = mergeRequests(cached.filter((r) => r.sync_status !== "pending"), pending);

        setRequests(merged);
        setFromCache(true);

        await saveCachedRequests(
          currentUserId,
          merged.filter((r) => r.sync_status !== "pending")
        );
      };

      if (!connected) {
        await readLocalOnly();
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("op_ouvrier_contacts")
        .select("id, created_at, worker_name, status, message, origin")
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error(fetchError);
        await readLocalOnly();
        return;
      }

      const serverItems = normalizeServerRequests((data as ClientRequest[]) || []);
      const pending = await getPendingOfflineRequests(currentUserId);
      const merged = mergeRequests(serverItems, pending);

      setRequests(merged);
      setFromCache(false);

      await saveCachedRequests(currentUserId, serverItems);
    } catch (err: any) {
      console.error(err);

      const currentUserId = await authCache.getUserId();
      if (currentUserId) {
        const cached = await loadCachedRequests(currentUserId);
        const pending = await getPendingOfflineRequests(currentUserId);
        const merged = mergeRequests(cached.filter((r) => r.sync_status !== "pending"), pending);

        setRequests(merged);
        setFromCache(true);

        if (!merged.length) {
          setError(
            language === "fr"
              ? "Impossible de charger vos demandes."
              : "Unable to load your requests."
          );
        }
      } else {
        setRequests([]);
        setError(
          language === "fr"
            ? "Impossible de charger vos demandes."
            : "Unable to load your requests."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!initialized) return;
    void refreshRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, connected, language]);

  useEffect(() => {
    const onSyncSignal = () => {
      void refreshRequests();
    };

    window.addEventListener("storage", onSyncSignal);
    window.addEventListener("focus", onSyncSignal);
    window.addEventListener("visibilitychange", onSyncSignal);

    return () => {
      window.removeEventListener("storage", onSyncSignal);
      window.removeEventListener("focus", onSyncSignal);
      window.removeEventListener("visibilitychange", onSyncSignal);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, language]);

  useEffect(() => {
    if (!connected) return;

    if (reconcileTimerRef.current != null) {
      window.clearInterval(reconcileTimerRef.current);
      reconcileTimerRef.current = null;
    }

    reconcileTimerRef.current = window.setInterval(() => {
      void refreshRequests();
    }, 4000);

    return () => {
      if (reconcileTimerRef.current != null) {
        window.clearInterval(reconcileTimerRef.current);
        reconcileTimerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, language]);

  const renderStatus = (req: ClientRequest) => {
    if (req.sync_status === "pending" || req.status === "pending_sync") {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
          <Clock3 className="w-3 h-3 mr-1" />
          {text.pendingSync}
        </Badge>
      );
    }

    const value = (req.status || "").toLowerCase();

    if (value === "new" || value === "nouveau") {
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          {text.statusNew}
        </Badge>
      );
    }
    if (value === "in_progress" || value === "en_cours") {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          {text.statusInProgress}
        </Badge>
      );
    }
    if (value === "done" || value === "terminee") {
      return (
        <Badge variant="outline" className="border-emerald-500 text-emerald-600">
          {text.statusDone}
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="border-slate-400 text-slate-600">
        {text.statusUnknown}
      </Badge>
    );
  };

  const hasPendingItems = useMemo(
    () => requests.some((req) => req.sync_status === "pending"),
    [requests]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate("/espace-client")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {text.back}
        </Button>

        {!connected && initialized && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{text.offlineTitle}</div>
              <div className="text-xs text-amber-800 mt-1">{text.offlineDesc}</div>
            </div>
          </div>
        )}

        {fromCache && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">
            <Database className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{text.cacheLabel}</div>
            </div>
          </div>
        )}

        {hasPendingItems && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <div className="font-medium">{text.pendingSync}</div>
            <div className="text-xs text-amber-800 mt-1">
              {language === "fr"
                ? "Certaines demandes sont encore stockées localement et seront envoyées automatiquement dès le retour du réseau."
                : "Some requests are still stored locally and will be sent automatically when the network returns."}
            </div>
          </div>
        )}

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-pro-blue" />
            {text.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{text.subtitle}</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            <span>{language === "fr" ? "Chargement..." : "Loading..."}</span>
          </div>
        ) : error ? (
          <div className="py-6 text-sm text-red-600">{error}</div>
        ) : requests.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-slate-500">{text.noData}</p>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((req) => {
              const created =
                req.created_at &&
                new Date(req.created_at).toLocaleString(
                  language === "fr" ? "fr-FR" : "en-US",
                  {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                );

              return (
                <Card
                  key={req.id}
                  className={`p-4 border bg-white ${
                    req.sync_status === "pending"
                      ? "border-amber-200 bg-amber-50/40"
                      : "border-slate-200"
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Wrench className="w-4 h-4 text-pro-blue" />
                        <span className="font-medium text-slate-900">
                          {req.worker_name || "Ouvrier"}
                        </span>
                      </div>

                      {created && (
                        <p className="text-xs text-slate-500">
                          {text.sentOn} {created}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {renderStatus(req)}

                      {req.sync_status === "pending" ? (
                        <span className="text-[11px] uppercase tracking-wide text-amber-700 font-medium">
                          {text.pendingShort}
                        </span>
                      ) : req.origin && (
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">
                          {req.origin}
                        </span>
                      )}
                    </div>
                  </div>

                  {req.message && (
                    <p className="mt-3 text-sm text-slate-700 whitespace-pre-line line-clamp-4">
                      {req.message}
                    </p>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientRequestsList;
