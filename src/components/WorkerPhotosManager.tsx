// src/components/WorkerPhotosManager.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

type WorkerPhotosManagerProps = {
  workerId: string; // id de op_ouvriers
};

type PhotoRow = {
  id: string;
  storage_path: string;
  public_url: string | null;
  is_cover: boolean;
  created_at: string;
};

const BUCKET_NAME = "op-ouvrier-photos";

const WorkerPhotosManager: React.FC<WorkerPhotosManagerProps> = ({
  workerId,
}) => {
  const { language } = useLanguage();
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = {
    title: language === "fr" ? "Mes photos de réalisations" : "My work photos",
    info:
      language === "fr"
        ? "Ajoutez des photos de vos réalisations pour rassurer les clients."
        : "Add photos of your work to reassure clients.",
    uploadLabel:
      language === "fr"
        ? "Ajouter des photos"
        : "Add photos",
    delete:
      language === "fr"
        ? "Supprimer"
        : "Delete",
    errorLoad:
      language === "fr"
        ? "Impossible de charger vos photos."
        : "Unable to load your photos.",
    errorUpload:
      language === "fr"
        ? "Le téléversement a échoué."
        : "Upload failed.",
    errorDelete:
      language === "fr"
        ? "La suppression a échoué."
        : "Deletion failed.",
  };

  const loadPhotos = async () => {
    if (!workerId) return;
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
        setError(text.errorLoad);
        setPhotos([]);
        return;
      }

      const rows = (data ?? []) as PhotoRow[];

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
      setError(text.errorLoad);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const handleUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || !workerId) return;

    setUploading(true);
    setError(null);

    try {
      const { data: authData, error: authError } =
        await supabase.auth.getUser();
      if (authError || !authData?.user) {
        console.error("Auth error", authError);
        setError(
          language === "fr"
            ? "Votre session a expiré. Merci de vous reconnecter."
            : "Your session has expired. Please log in again."
        );
        setUploading(false);
        return;
      }

      // Upload des fichiers un par un
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random()
          .toString(36)
          .substring(2, 8)}.${ext ?? "jpg"}`;
        const storagePath = `workers/${workerId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(storagePath, file);

        if (uploadError) {
          console.error("upload error", uploadError);
          setError(text.errorUpload);
          continue;
        }

        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(storagePath);

        const { error: insertError } = await supabase
          .from("op_ouvrier_photos")
          .insert({
            worker_id: workerId,
            storage_path: storagePath,
            public_url: urlData?.publicUrl ?? null,
            created_by: authData.user.id,
          });

        if (insertError) {
          console.error("insert photo row error", insertError);
          setError(text.errorUpload);
        }
      }

      await loadPhotos();
      e.target.value = ""; // reset input
    } catch (err) {
      console.error("upload exception", err);
      setError(text.errorUpload);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: PhotoRow) => {
    setError(null);

    try {
      // Supprimer dans Storage
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([photo.storage_path]);

      if (storageError) {
        console.error("storage delete error", storageError);
        setError(text.errorDelete);
        return;
      }

      // Supprimer la ligne DB
      const { error: dbError } = await supabase
        .from("op_ouvrier_photos")
        .delete()
        .eq("id", photo.id);

      if (dbError) {
        console.error("db delete error", dbError);
        setError(text.errorDelete);
        return;
      }

      await loadPhotos();
    } catch (e) {
      console.error("delete exception", e);
      setError(text.errorDelete);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">
            {text.title}
          </h2>
          <p className="text-xs text-muted-foreground">
            {text.info}
          </p>
        </div>
        <div>
          <label className="inline-flex items-center gap-2 px-3 py-2 border border-input rounded-md text-sm cursor-pointer hover:bg-muted/60">
            <span>
              {uploading
                ? language === "fr"
                  ? "Téléversement..."
                  : "Uploading..."
                : text.uploadLabel}
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={handleUpload}
            />
          </label>
        </div>
      </div>

      {error && (
        <div className="mb-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading && (
        <p className="text-sm text-muted-foreground mb-2">
          {language === "fr"
            ? "Chargement de vos photos..."
            : "Loading your photos..."}
        </p>
      )}

      {!loading && photos.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {language === "fr"
            ? "Vous n'avez pas encore ajouté de photos."
            : "You have not added any photos yet."}
        </p>
      )}

      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative overflow-hidden rounded-lg border border-border bg-muted/30 group"
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

              <button
                type="button"
                onClick={() => handleDelete(photo)}
                className="absolute top-1 right-1 inline-flex items-center justify-center w-6 h-6 rounded-full bg-black/60 text-white text-[10px] opacity-80 hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default WorkerPhotosManager;
