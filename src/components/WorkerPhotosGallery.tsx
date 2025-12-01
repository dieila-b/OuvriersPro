// src/components/WorkerPhotosGallery.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";

type WorkerPhotosGalleryProps = {
  workerId: string;
};

type PhotoRow = {
  id: string;
  storage_path: string;
  public_url: string | null;
  is_cover: boolean;
  created_at: string;
};

const BUCKET_NAME = "op-ouvrier-photos";

const WorkerPhotosGallery: React.FC<WorkerPhotosGalleryProps> = ({
  workerId,
}) => {
  const { language } = useLanguage();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = {
    title: language === "fr" ? "Galerie de réalisations" : "Work gallery",
    empty:
      language === "fr"
        ? "Aucune photo n'a encore été ajoutée."
        : "No photos have been added yet.",
    error:
      language === "fr"
        ? "Impossible de charger la galerie pour le moment."
        : "Unable to load the gallery at the moment.",
  };

  useEffect(() => {
    if (!workerId) return;

    const loadPhotos = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data, error } = await supabase
          .from("op_ouvrier_photos")
          .select("id, storage_path, public_url, is_cover, created_at")
          .eq("worker_id", workerId)
          .order("is_cover", { ascending: false })
          .order("created_at", { ascending: false });

        if (error) {
          console.error("load photos error", error);
          setError(text.error);
          setPhotos([]);
          return;
        }

        const rows = (data ?? []) as PhotoRow[];

        // Compléter les URLs publiques si non stockées
        const withUrls = rows.map((p) => {
          if (p.public_url) return p;

          const { data: urlData } = supabase.storage
            .from(BUCKET_NAME)
            .getPublicUrl(p.storage_path);

          return {
            ...p,
            public_url: urlData?.publicUrl ?? null,
          };
        });

        setPhotos(withUrls);
      } catch (e) {
        console.error("load photos exception", e);
        setError(text.error);
        setPhotos([]);
      } finally {
        setLoading(false);
      }
    };

    loadPhotos();
  }, [workerId, text.error]);

  return (
    <Card className="p-6">
      <h2 className="text-xl font-semibold mb-4">{text.title}</h2>

      {loading && (
        <p className="text-sm text-muted-foreground">
          {language === "fr" ? "Chargement des photos..." : "Loading photos..."}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive mb-2">
          {error}
        </p>
      )}

      {!loading && !error && photos.length === 0 && (
        <p className="text-sm text-muted-foreground">{text.empty}</p>
      )}

      {!loading && !error && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative overflow-hidden rounded-lg border border-border bg-muted/30"
            >
              {photo.public_url ? (
                <img
                  src={photo.public_url}
                  alt=""
                  className="w-full h-32 sm:h-36 md:h-40 object-cover"
                />
              ) : (
                <div className="w-full h-32 sm:h-36 md:h-40 flex items-center justify-center text-xs text-muted-foreground">
                  {language === "fr"
                    ? "Prévisualisation indisponible"
                    : "Preview unavailable"}
                </div>
              )}
              {photo.is_cover && (
                <span className="absolute top-1 left-1 bg-black/60 text-[10px] text-white px-1.5 py-0.5 rounded">
                  {language === "fr" ? "Couverture" : "Cover"}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default WorkerPhotosGallery;
