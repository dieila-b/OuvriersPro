// src/pages/ClientFavoritesList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, ArrowLeft, Loader2, MapPin } from "lucide-react";

type Favorite = {
  id: string;
  worker_id: string;
  worker_name: string | null;
  profession: string | null;
  created_at: string;
};

const ClientFavoritesList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [items, setItems] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    title:
      language === "fr"
        ? "Mes ouvriers favoris"
        : "My favourite workers",
    subtitle:
      language === "fr"
        ? "Les professionnels que vous avez ajoutés en favoris pour les retrouver plus rapidement."
        : "The professionals you marked as favorites to find them quickly.",
    empty:
      language === "fr"
        ? "Vous n’avez pas encore d’ouvrier en favori."
        : "You don’t have any favourite worker yet.",
    seeProfile:
      language === "fr" ? "Voir la fiche" : "View profile",
    addedOn:
      language === "fr" ? "Ajouté le" : "Added on",
    back:
      language === "fr"
        ? "Retour à mon espace client"
        : "Back to my client space",
  };

  useEffect(() => {
    const fetchFavorites = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("op_ouvrier_favorites")
        .select("id, worker_id, worker_name, profession, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading favorites:", error);
        setItems([]);
      } else {
        setItems((data || []) as Favorite[]);
      }
      setLoading(false);
    };

    fetchFavorites();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Bouton retour */}
        <Button
          variant="ghost"
          className="mb-4 flex items-center gap-2"
          onClick={() => navigate("/espace-client")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t.back}</span>
        </Button>

        {/* En-tête */}
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm border border-slate-100 mb-3">
            <Heart className="w-3 h-3 text-rose-500" />
            <span>
              {language === "fr"
                ? "Vos ouvriers sauvegardés"
                : "Your saved workers"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {t.title}
          </h1>
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
            <div className="py-8 text-center text-sm text-slate-500">
              {t.empty}
            </div>
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
                        <p className="text-xs text-slate-600 mb-2">
                          {fav.profession}
                        </p>
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

                    <div className="mt-4 flex justify-between items-center">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="text-xs rounded-full"
                      >
                        <Link to={`/ouvrier/${fav.worker_id}`}>
                          {t.seeProfile}
                        </Link>
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
