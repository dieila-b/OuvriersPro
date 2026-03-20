import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { MapPin, Star, Phone, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Worker = {
  id: string;
  first_name: string;
  last_name: string;
  profession: string;
  district: string;
  avatar_url?: string;
  rating?: number;
};

const WorkerSearchSection = () => {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [district, setDistrict] = useState("");

  useEffect(() => {
    const fetchWorkers = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("op_ouvriers")
        .select("*")
        .eq("status", "approved");

      if (!error && data) {
        setWorkers(data as Worker[]);
      }

      setLoading(false);
    };

    fetchWorkers();
  }, []);

  const filtered = useMemo(() => {
    return workers.filter((w) => {
      const matchSearch =
        !search ||
        w.profession?.toLowerCase().includes(search.toLowerCase());

      const matchDistrict =
        !district ||
        w.district?.toLowerCase().includes(district.toLowerCase());

      return matchSearch && matchDistrict;
    });
  }, [workers, search, district]);

  return (
    <section className="w-full bg-pro-bg py-10 sm:py-14">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* 🔍 FILTRES STICKY */}
        <div className="sticky top-2 z-20 bg-white/90 backdrop-blur border border-pro-border rounded-2xl p-3 sm:p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

            <Input
              placeholder="Métier (plombier, électricien...)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-xl"
            />

            <Input
              placeholder="Localisation"
              value={district}
              onChange={(e) => setDistrict(e.target.value)}
              className="h-11 rounded-xl"
            />

            <Button className="h-11 bg-pro-blue text-white flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filtres
            </Button>
          </div>
        </div>

        {/* 🧱 LISTE PRESTATAIRES */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* 💀 SKELETON */}
          {loading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="animate-pulse bg-white p-4 rounded-2xl shadow-sm border border-pro-border"
              >
                <div className="flex gap-4">
                  <div className="w-16 h-16 bg-gray-200 rounded-xl" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-1/2" />
                    <div className="h-3 bg-gray-200 rounded w-1/3" />
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}

          {/* ✅ CARDS */}
          {!loading &&
            filtered.map((w) => (
              <div
                key={w.id}
                className="
                  bg-white p-4 rounded-2xl
                  shadow-sm hover:shadow-md
                  transition-all
                  border border-pro-border
                  flex gap-4
                "
              >
                {/* PHOTO */}
                <img
                  src={
                    w.avatar_url ||
                    "https://via.placeholder.com/100x100.png?text=👤"
                  }
                  className="w-16 h-16 rounded-xl object-cover"
                />

                <div className="flex-1">

                  {/* NOM + BADGE */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-pro-dark">
                        {w.first_name} {w.last_name}
                      </h3>
                      <p className="text-sm text-pro-muted">
                        {w.profession}
                      </p>
                    </div>

                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      Vérifié
                    </span>
                  </div>

                  {/* RATING + DISTANCE */}
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-yellow-500" />
                      {w.rating || 4.5}
                    </div>

                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {w.district}
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="mt-3 flex gap-2">
                    <Button className="h-9 px-4 text-xs bg-pro-blue text-white rounded-xl">
                      Contacter
                    </Button>

                    <Button
                      variant="outline"
                      className="h-9 px-4 text-xs rounded-xl"
                    >
                      Voir profil
                    </Button>
                  </div>
                </div>
              </div>
            ))}
        </div>

        {/* 🚫 EMPTY STATE */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            Aucun prestataire trouvé
          </div>
        )}
      </div>
    </section>
  );
};

export default WorkerSearchSection;
