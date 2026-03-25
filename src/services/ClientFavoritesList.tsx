// src/pages/ClientFavoritesList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { useNetworkStatus } from "@/services/networkService";
import { authCache } from "@/services/authCache";
import { favoritesRepository, type Favorite } from "@/services/favoritesRepository";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Loader2, WifiOff, Trash2 } from "lucide-react";

const ClientFavoritesList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const { connected, initialized } = useNetworkStatus();

  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const t = {
    title: language === "fr" ? "Mes ouvriers favoris" : "My favourite workers",
    subtitle:
      language === "fr"
        ? "Les professionnels que vous avez ajoutés en favoris pour les retrouver plus rapidement."
        : "The professionals you marked as favorites to find them quickly.",
    empty:
      language === "fr"
        ? "Vous n’avez pas encore d’ouvrier en favori."
        : "You don’t have any favourite worker yet.",
    seeProfile: language === "fr" ? "Voir la fiche" : "View profile",
    addedOn: language === "fr" ? "Ajouté le" : "Added on",
    back:
      language === "fr"
        ? "Retour à mon espace client"
        : "Back to my client space",
    offlineTitle: language === "fr" ? "Mode hors connexion" : "Offline mode",
    offlineDesc:
      language === "fr"
        ? "Vos favoris restent consultables. Les suppressions seront synchronisées dès le retour du réseau."
        : "Your favorites remain available. Removals will sync when the network comes back.",
    cacheLabel:
      language === "fr"
        ? "Liste chargée depuis le cache local."
        : "List loaded from local cache.",
    remove: language === "fr" ? "Retirer" : "Remove",
    removing: language === "fr" ? "Retrait..." : "Removing...",
  };

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);

      try {
        const cachedUserId = await authCache.getUserId();
        if (!mounted) return;

        setUserId(cachedUserId ?? null);

        if (!cachedUserId) {
          setItems([]);
          setFromCache(false);
          return;
        }

        const result = await favoritesRepository.loadFavorites(cachedUserId, connected);
        if (!mounted) return;

        setItems(result.items);
        setFromCache(result.fromCache);
      } catch (error) {
        console.error("[ClientFavoritesList] load error:", error);
        if (!mounted) return;
        setItems([]);
        setFromCache(true);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    if (initialized) {
      void load();
    }

    return () => {
      mounted = false;
    };
  }, [connected, initialized]);

  const handleRemove = async (fav: Favorite) => {
    if (!userId) return;

    setRemovingId(fav.id);
    const previous = items;
    setItems((prev) => prev.filter((item) => item.worker_id !== fav.worker_id));

    try {
      await favoritesRepository.removeFavorite({
        userId,
        connected,
        workerId: fav.worker_id,
        favoriteId: fav.id,
      });
    } catch (error) {
      console.error("[ClientFavoritesList] remove error:", error);
      setItems(previous);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4 flex items-center gap-2"
          onClick={() => navigate("/espace-client")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t.back}</span>
        </Button>

        {!connected && initialized && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
            <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <div className="font-medium">{t.offlineTitle}</div>
              <div className="text-xs text-amber-800 mt-1">{t.offlineDesc}</div>
            </div>
          </div>
        )}

        {fromCache && (
          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-800">
            {t.cacheLabel}
          </div>
        )}

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm border border-slate-100 mb-3">
            <Heart className="w-3 h-3 text-rose-500" />
            <span>
              {language === "fr"
                ? "Vos ouvriers sauvegardés"
                : "Your saved workers"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">{t.title}</h1>
          <p className="text-sm text-slate-600">{t.subtitle}</p>
        </header>

        <Card className="p-4 md:p-6 bg-white shadow-sm border-slate-200 rounded-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-sm">
                {language === "fr" ? "Chargement..." : "Loading..."}
              </span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">{t.empty}</div>
          ) : (
            <ul className="grid gap-4 md:grid-cols-2">
              {items.map((fav) => (
                <li key={fav.id}>
                  <Card className="p-4 bg-slate-50/60 border-slate-200 rounded-xl h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h2 className="text-sm font-semibold text-slate-900">
                          {fav.worker_name || "Ouvrier"}
                        </h2>
                        <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      </div>

                      {fav.profession && (
                        <p className="text-xs text-slate-600 mb-2">{fav.profession}</p>
                      )}

                      <p className="text-[11px] text-slate-400">
                        {t.addedOn}{" "}
                        {new Date(fav.created_at).toLocaleDateString(
                          language === "fr" ? "fr-FR" : "en-US",
                          {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          }
                        )}
                      </p>
                    </div>

                    <div className="mt-4 flex justify-between items-center gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-full"
                      >
                        <Link to={`/ouvrier/${fav.worker_id}`}>{t.seeProfile}</Link>
                      </Button>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-xs rounded-full text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        disabled={removingId === fav.id}
                        onClick={() => handleRemove(fav)}
                      >
                        {removingId === fav.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
                            {t.removing}
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5 mr-1" />
                            {t.remove}
                          </>
                        )}
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClientFavoritesList;
