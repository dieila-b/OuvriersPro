// src/components/WorkerSearchSection.tsx
// VERSION OPTIMISÉE UI / CLEAN / ENTERPRISE

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { authCache } from "@/services/authCache";
import { favoritesRepository } from "@/services/favoritesRepository";

import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

import {
  Star,
  MapPin,
  Search,
  LayoutList,
  LayoutGrid,
  LocateFixed,
  RotateCcw,
  Heart,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";

/* =========================
   TYPES
========================= */

type WorkerCard = {
  id: string;
  name: string;
  job: string;
  region: string;
  city: string;
  hourlyRate: number;
  currency: string;
  rating: number;
  ratingCount: number;
  experienceYears: number;
  latitude: number | null;
  longitude: number | null;
  distanceKm: number | null;
};

type ViewMode = "list" | "grid";

type Filters = {
  keyword: string;
  job: string;
  region: string;
  maxPrice: number;
  minRating: number;
  view: ViewMode;
};

/* =========================
   CONFIG
========================= */

const DEFAULT_MAX_PRICE = 300000;

/* =========================
   COMPONENT
========================= */

const WorkerSearchSection: React.FC = () => {
  const { t, language } = useLanguage();
  const { connected } = useNetworkStatus();
  const { toast } = useToast();

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [workers, setWorkers] = useState<WorkerCard[]>([]);
  const [loading, setLoading] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    keyword: "",
    job: "all",
    region: "",
    maxPrice: DEFAULT_MAX_PRICE,
    minRating: 0,
    view: "grid",
  });

  const [favorites, setFavorites] = useState<Record<string, boolean>>({});

  /* =========================
     FETCH DATA
  ========================= */

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("op_ouvriers")
        .select("*")
        .eq("status", "approved");

      if (!error && data) {
        const mapped: WorkerCard[] = data.map((w: any) => ({
          id: w.id,
          name: `${w.first_name ?? ""} ${w.last_name ?? ""}`.trim() || "Ouvrier",
          job: w.profession || "",
          region: w.region || "",
          city: w.city || "",
          hourlyRate: w.hourly_rate || 0,
          currency: w.currency || "GNF",
          rating: w.average_rating || 0,
          ratingCount: w.rating_count || 0,
          experienceYears: w.years_experience || 0,
          latitude: w.latitude,
          longitude: w.longitude,
          distanceKm: null,
        }));

        setWorkers(mapped);
      }

      setLoading(false);
    };

    fetchWorkers();
  }, []);

  /* =========================
     FILTER
  ========================= */

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      return (
        (!filters.keyword ||
          `${w.name} ${w.job}`.toLowerCase().includes(filters.keyword.toLowerCase())) &&
        (filters.job === "all" || w.job === filters.job) &&
        (!filters.region || w.region === filters.region) &&
        w.hourlyRate <= filters.maxPrice &&
        w.rating >= filters.minRating
      );
    });
  }, [workers, filters]);

  /* =========================
     FAVORITES
  ========================= */

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  /* =========================
     UI HELPERS
  ========================= */

  const formatCurrency = (v: number) =>
    `${v.toLocaleString("fr-FR")} GNF`;

  const renderStars = (rating: number) =>
    [...Array(5)].map((_, i) => (
      <Star
        key={i}
        className={`h-3.5 w-3.5 ${
          i < Math.round(rating)
            ? "text-amber-400 fill-amber-400"
            : "text-slate-300"
        }`}
      />
    ));

  /* =========================
     UI
  ========================= */

  return (
    <section className="w-full bg-slate-50 py-6">
      <div className="mx-auto max-w-[1600px] px-4">

        {/* HEADER */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Trouver un professionnel
            </h2>
            <p className="text-sm text-slate-500">
              Recherche rapide et intelligente
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant={filters.view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters((f) => ({ ...f, view: "list" }))}
            >
              <LayoutList size={16} />
            </Button>

            <Button
              variant={filters.view === "grid" ? "default" : "outline"}
              size="sm"
              onClick={() => setFilters((f) => ({ ...f, view: "grid" }))}
            >
              <LayoutGrid size={16} />
            </Button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-5">
          <Input
            placeholder="Rechercher..."
            value={filters.keyword}
            onChange={(e) =>
              setFilters((f) => ({ ...f, keyword: e.target.value }))
            }
          />

          <Input
            placeholder="Région"
            value={filters.region}
            onChange={(e) =>
              setFilters((f) => ({ ...f, region: e.target.value }))
            }
          />

          <Slider
            defaultValue={[filters.maxPrice]}
            max={DEFAULT_MAX_PRICE}
            step={10000}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, maxPrice: v[0] }))
            }
          />

          <Slider
            defaultValue={[filters.minRating]}
            max={5}
            step={0.5}
            onValueChange={(v) =>
              setFilters((f) => ({ ...f, minRating: v[0] }))
            }
          />

          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                keyword: "",
                job: "all",
                region: "",
                maxPrice: DEFAULT_MAX_PRICE,
                minRating: 0,
                view: "grid",
              })
            }
          >
            <RotateCcw size={16} />
          </Button>
        </div>

        {/* RESULTS */}
        {loading && (
          <div className="text-center text-sm text-slate-500">
            Chargement...
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center text-sm text-slate-500">
            Aucun résultat
          </div>
        )}

        {/* GRID */}
        {filters.view === "grid" && (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((w) => (
              <div
                key={w.id}
                className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex justify-between">
                  <div>
                    <div className="font-semibold">{w.name}</div>
                    <div className="text-xs text-slate-500">{w.job}</div>
                  </div>

                  <button onClick={() => toggleFavorite(w.id)}>
                    <Heart
                      className={`${
                        favorites[w.id] ? "text-red-500 fill-red-500" : ""
                      }`}
                    />
                  </button>
                </div>

                <div className="mt-3 text-sm text-slate-600">
                  <MapPin size={14} /> {w.city}
                </div>

                <div className="mt-2 flex items-center gap-1">
                  {renderStars(w.rating)}
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="font-bold text-blue-600">
                    {formatCurrency(w.hourlyRate)}
                  </div>

                  <Button
                    size="sm"
                    onClick={() => navigate(`/ouvrier/${w.id}`)}
                  >
                    Voir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* LIST */}
        {filters.view === "list" && (
          <div className="space-y-3">
            {filtered.map((w) => (
              <div
                key={w.id}
                className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm"
              >
                <div>
                  <div className="font-semibold">{w.name}</div>
                  <div className="text-xs text-slate-500">{w.job}</div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-sm font-bold text-blue-600">
                    {formatCurrency(w.hourlyRate)}
                  </div>

                  <Button size="sm" onClick={() => navigate(`/ouvrier/${w.id}`)}>
                    Voir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default WorkerSearchSection;
