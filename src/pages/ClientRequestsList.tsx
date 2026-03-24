// src/pages/ClientRequestsList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, FileText, Wrench, WifiOff } from "lucide-react";

type ClientRequest = {
  id: string;
  created_at: string | null;
  worker_name: string | null;
  status: string | null;
  message: string | null;
  origin: string | null;
};

const REQUESTS_CACHE_PREFIX = "cached_client_requests";

const getRequestsCacheKey = (userId?: string | null) =>
  userId ? `${REQUESTS_CACHE_PREFIX}:${userId}` : REQUESTS_CACHE_PREFIX;

const ClientRequestsList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { connected, initialized } = useNetworkStatus();

  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ClientRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usedCache, setUsedCache] = useState(false);

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
    loading: language === "fr" ? "Chargement..." : "Loading...",
    loadError:
      language === "fr"
        ? "Impossible de charger vos demandes."
        : "Unable to load your requests.",
    offlineTitle: language === "fr" ? "Mode hors connexion" : "Offline mode",
    offlineDesc:
      language === "fr"
        ? "Vos demandes déjà synchronisées restent consultables localement."
        : "Your previously synced requests remain available locally.",
    cacheInfo:
      language === "fr"
        ? "Affichage des demandes enregistrées localement."
        : "Showing locally saved requests.",
  };

  useEffect(() => {
    const fetchRequests = async () => {
      setLoading(true);
      setError(null);
      setUsedCache(false);

      try {
        const userId = await authCache.getUserId();
        const cacheKey = getRequestsCacheKey(userId);

        const readCache = async () => {
          const cached = await localStore.get<ClientRequest[]>(cacheKey);
          if (cached) {
            setRequests(cached);
            setUsedCache(true);
          } else {
            setRequests([]);
            setUsedCache(true);
          }
        };

        if (!connected) {
          await readCache();
          return;
        }

        const { data, error } = await supabase
          .from("op_ouvrier_contacts")
          .select("id, created_at, worker_name, status, message, origin")
          .order("created_at", { ascending: false });

        if (error) throw error;

        const nextRequests = (data as ClientRequest[]) || [];
        setRequests(nextRequests);
        setUsedCache(false);
        await localStore.set(cacheKey, nextRequests);
      } catch (err: any) {
        console.error(err);
        setError(text.loadError);

        try {
          const userId = await authCache.getUserId();
          const cacheKey = getRequestsCacheKey(userId);
          const cached = await localStore.get<ClientRequest[]>(cacheKey);

          if (cached) {
            setRequests(cached);
            setUsedCache(true);
          } else {
            setRequests([]);
            setUsedCache(false);
          }
        } catch (cacheError) {
          console.error("Requests cache fallback error:", cacheError);
          setRequests([]);
          setUsedCache(false);
        }
      } finally {
        setLoading(false);
      }
    };

    if (initialized) {
      void fetchRequests();
    }
  }, [language, connected, initialized, text.loadError]);

  const renderStatus = (status: string | null) => {
    const value = (status || "").toLowerCase();

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

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-pro-blue" />
            {text.title}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{text.subtitle}</p>
        </div>

        {!connected && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{text.offlineTitle}</div>
              <div className="text-xs text-amber-800 mt-1">{text.offlineDesc}</div>
            </div>
          </div>
        )}

        {usedCache && (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            {text.cacheInfo}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500">
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            <span>{text.loading}</span>
          </div>
        ) : error && !usedCache ? (
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
                  className="p-4 border border-slate-200 bg-white"
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

                    <div className="flex items-center gap-2">
                      {renderStatus(req.status)}
                      {req.origin && (
                        <span className="text-[11px] uppercase tracking-wide text-slate-400">
                          {req.origin}
                        </span>
                      )}
                    </div>
                  </div>

                  {req.message && (
                    <p className="mt-3 text-sm text-slate-700 line-clamp-3">
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
