// src/pages/ClientRequestsList.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import { syncService, type OfflineQueueItem } from "@/services/syncService";
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

const REQUESTS_CACHE_PREFIX = "cached_client_requests";

const getRequestsCacheKey = (userId?: string | null) =>
  userId ? `${REQUESTS_CACHE_PREFIX}:${userId}` : REQUESTS_CACHE_PREFIX;

const sortRequestsDesc = (items: ClientRequest[]) =>
  [...items].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0;
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0;
    return tb - ta;
  });

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
    noLocalSession:
      language === "fr"
        ? "Aucune session locale trouvée."
        : "No local session found.",
    loadError:
      language === "fr"
        ? "Impossible de charger vos demandes."
        : "Unable to load your requests.",
  };

  const loadCachedRequests = useCallback(async (userId: string): Promise<ClientRequest[]> => {
    return (await localStore.get<ClientRequest[]>(getRequestsCacheKey(userId))) || [];
  }, []);

  const saveCachedRequests = useCallback(async (userId: string, items: ClientRequest[]) => {
    await localStore.set(getRequestsCacheKey(userId), sortRequestsDesc(items));
  }, []);

  const normalizeServerRequests = useCallback((items: ClientRequest[]): ClientRequest[] => {
    return items.map((item) => ({
      ...item,
      sync_status: "synced",
    }));
  }, []);

  const readQueue = useCallback(async (): Promise<OfflineQueueItem[]> => {
    return await syncService.getQueue();
  }, []);

  const getPendingOfflineRequests = useCallback(
    async (userId: string): Promise<ClientRequest[]> => {
      const queue = await readQueue();

      return queue
        .filter(
          (item) =>
            item.action_type === "CREATE_CONTACT_REQUEST" &&
            item.table_name === "op_ouvrier_contacts" &&
            (item.status === "pending" ||
              item.status === "processing" ||
              item.status === "failed") &&
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
    },
    [readQueue]
  );

  const mergePendingRequests = useCallback((items: ClientRequest[]) => {
    const map = new Map<string, ClientRequest>();

    for (const item of items) {
      const key = String(item.id || "");
      if (!key) continue;

      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          ...item,
          sync_status: "pending",
          status: item.status || "pending_sync",
          origin: item.origin || "offline",
        });
        continue;
      }

      map.set(key, {
        ...existing,
        ...item,
        sync_status: "pending",
        status: item.status || existing.status || "pending_sync",
        origin: item.origin || existing.origin || "offline",
      });
    }

    return sortRequestsDesc(Array.from(map.values()));
  }, []);

  const areRequestsLikelySame = useCallback((offlineReq: ClientRequest, serverReq: ClientRequest) => {
    const offlineWorker = String(offlineReq.worker_name || "").trim().toLowerCase();
    const serverWorker = String(serverReq.worker_name || "").trim().toLowerCase();

    const offlineMessage = String(offlineReq.message || "").trim();
    const serverMessage = String(serverReq.message || "").trim();

    const offlineTime = offlineReq.created_at ? new Date(offlineReq.created_at).getTime() : 0;
    const serverTime = serverReq.created_at ? new Date(serverReq.created_at).getTime() : 0;

    const timeCloseEnough = Math.abs(serverTime - offlineTime) <= 10 * 60 * 1000;

    return offlineWorker === serverWorker && offlineMessage === serverMessage && timeCloseEnough;
  }, []);

  const mergeRequests = useCallback(
    (serverItems: ClientRequest[], pendingItems: ClientRequest[]) => {
      const dedupedPending = pendingItems.filter(
        (pending) => !serverItems.some((server) => areRequestsLikelySame(pending, server))
      );

      const byId = new Map<string, ClientRequest>();

      for (const item of [...dedupedPending, ...serverItems]) {
        const key = String(item.id || "");
        if (!key) continue;

        const existing = byId.get(key);

        if (!existing) {
          byId.set(key, item);
          continue;
        }

        byId.set(key, {
          ...existing,
          ...item,
          sync_status:
            item.sync_status === "pending" || existing.sync_status === "pending"
              ? "pending"
              : item.sync_status ?? existing.sync_status ?? "synced",
        });
      }

      return sortRequestsDesc(Array.from(byId.values()));
    },
    [areRequestsLikelySame]
  );

  const resolveCurrentUserId = useCallback(async (): Promise<string | null> => {
    try {
      if (connected) {
        const { data } = await supabase.auth.getUser();
        const liveUserId = data.user?.id ?? null;
        if (liveUserId) return liveUserId;
      }
    } catch {
      // noop
    }

    return (await authCache.getUserId()) ?? null;
  }, [connected]);

  const resolveClientProfileId = useCallback(async (userId: string): Promise<string | null> => {
    if (!connected) return null;

    const { data, error } = await supabase
      .from("op_clients")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    return data?.id ?? null;
  }, [connected]);

  const refreshRequests = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const currentUserId = await resolveCurrentUserId();

      if (!currentUserId) {
        throw new Error(text.noLocalSession);
      }

      const readLocalOnly = async () => {
        const cached = await loadCachedRequests(currentUserId);

        const cachedPending = cached.filter(
          (r) => r.sync_status === "pending" || r.status === "pending_sync"
        );
        const cachedSynced = cached
          .filter((r) => r.sync_status !== "pending" && r.status !== "pending_sync")
          .map((r) => ({ ...r, sync_status: "synced" as const }));

        const queuePending = await getPendingOfflineRequests(currentUserId);
        const localPending = mergePendingRequests([...cachedPending, ...queuePending]);

        const merged = mergeRequests(cachedSynced, localPending);

        setRequests(merged);
        setFromCache(true);
        await saveCachedRequests(currentUserId, merged);
      };

      if (!connected) {
        await readLocalOnly();
        return;
      }

      try {
        await syncService.syncNow();
      } catch (syncError) {
        console.warn("[ClientRequestsList] syncNow failed:", syncError);
      }

      const clientProfileId = await resolveClientProfileId(currentUserId);

      if (!clientProfileId) {
        await readLocalOnly();
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("op_ouvrier_contacts")
        .select("id, created_at, worker_name, status, message, origin")
        .eq("client_id", clientProfileId)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error(fetchError);
        await readLocalOnly();
        return;
      }

      const serverItems = normalizeServerRequests((data as ClientRequest[]) || []);
      const cached = await loadCachedRequests(currentUserId);
      const cachedPending = cached.filter(
        (r) => r.sync_status === "pending" || r.status === "pending_sync"
      );
      const queuePending = await getPendingOfflineRequests(currentUserId);
      const localPending = mergePendingRequests([...cachedPending, ...queuePending]);

      const merged = mergeRequests(serverItems, localPending);

      setRequests(merged);
      setFromCache(false);
      await saveCachedRequests(currentUserId, merged);
    } catch (err: any) {
      console.error(err);

      const currentUserId = await resolveCurrentUserId();

      if (currentUserId) {
        const cached = await loadCachedRequests(currentUserId);
        const cachedPending = cached.filter(
          (r) => r.sync_status === "pending" || r.status === "pending_sync"
        );
        const cachedSynced = cached
          .filter((r) => r.sync_status !== "pending" && r.status !== "pending_sync")
          .map((r) => ({ ...r, sync_status: "synced" as const }));

        const queuePending = await getPendingOfflineRequests(currentUserId);
        const localPending = mergePendingRequests([...cachedPending, ...queuePending]);
        const merged = mergeRequests(cachedSynced, localPending);

        setRequests(merged);
        setFromCache(true);
        await saveCachedRequests(currentUserId, merged);

        if (!merged.length) {
          setError(err?.message || text.loadError);
        }
      } else {
        setRequests([]);
        setError(err?.message || text.loadError);
      }
    } finally {
      setLoading(false);
    }
  }, [
    connected,
    getPendingOfflineRequests,
    loadCachedRequests,
    mergePendingRequests,
    mergeRequests,
    normalizeServerRequests,
    resolveClientProfileId,
    resolveCurrentUserId,
    saveCachedRequests,
    text.loadError,
    text.noLocalSession,
  ]);

  useEffect(() => {
    if (!initialized) return;
    void refreshRequests();
  }, [initialized, connected, language, refreshRequests]);

  useEffect(() => {
    const onSyncSignal = () => {
      void refreshRequests();
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void refreshRequests();
      }
    };

    window.addEventListener("storage", onSyncSignal);
    window.addEventListener("focus", onSyncSignal);
    window.addEventListener("online", onSyncSignal);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("storage", onSyncSignal);
      window.removeEventListener("focus", onSyncSignal);
      window.removeEventListener("online", onSyncSignal);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refreshRequests]);

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
  }, [connected, refreshRequests]);

  const renderStatus = (req: ClientRequest) => {
    if (req.sync_status === "pending" || req.status === "pending_sync") {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
          <Clock3 className="w-3 h-3 mr-1" />
          {text.pendingSync}
        </Badge>
      );
    }

    const value = (req.status || "").toLowerCase().trim();

    if (value === "new" || value === "nouveau") {
      return (
        <Badge variant="outline" className="border-blue-500 text-blue-600">
          {text.statusNew}
        </Badge>
      );
    }

    if (
      value === "in_progress" ||
      value === "en_cours" ||
      value === "in progress" ||
      value === "en cours"
    ) {
      return (
        <Badge variant="outline" className="border-amber-500 text-amber-600">
          {text.statusInProgress}
        </Badge>
      );
    }

    if (
      value === "done" ||
      value === "terminee" ||
      value === "terminée" ||
      value === "completed"
    ) {
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
                          {req.worker_name || (language === "fr" ? "Ouvrier" : "Worker")}
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
                      ) : req.origin ? (
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">
                          {req.origin}
                        </span>
                      ) : null}
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
