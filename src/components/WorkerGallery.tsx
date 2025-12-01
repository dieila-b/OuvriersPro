// src/components/WorkerGallery.tsx
import React, { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Image as ImageIcon, Trash2, UploadCloud } from "lucide-react";

type WorkerGalleryProps = {
  workerId: string;
};

type PhotoRow = {
  id: string;
  worker_id: string;
  storage_path: string;
  title: string | null;
  description: string | null;
  created_by: string | null;
  created_at: string | null;
};

type PhotoWithUrl = PhotoRow & {
  publicUrl: string;
};

const BUCKET_NAME = "ouvrier-gallery";

const WorkerGallery: React.FC<WorkerGalleryProps> = ({ workerId }) => {
  const { language } = useLanguage();

  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [photos, setPhotos] = useState<PhotoWithUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);

  const text = {
    title: language === "fr" ? "Galerie photos" : "Photo gallery",
    subtitle:
      language === "fr"
        ? "Découvrez quelques réalisations de cet ouvrier."
        : "Discover some of this worker's projects.",
    noPhotos:
      language === "fr"
        ? "Aucune photo ajoutée pour le moment."
        : "No photos yet.",
    loading: language === "fr" ? "Chargement des photos..." : "Loading photos...",
    error:
      language === "fr"
        ? "Impossible de charger les photos."
        : "Unable to load photos.",
    uploadTitle:
      language === "fr"
        ? "Ajouter des photos de vos travaux"
        : "Upload your work photos",
    uploadHint:
      language === "fr"
        ? "Vous pouvez sélectionner plusieurs images à la fois."
        : "You can select multiple images at once.",
    fileLabel: language === "fr" ? "Photos" : "Pictures",
    titleLabel: language === "fr" ? "Titre (facultatif)" : "Title (optional)",
    descLabel:
      language === "fr"
        ? "Description (facultatif, appliquée à toutes les photos sélectionnées)"
        : "Description (optional, applied to all selected photos)",
    selectFiles: language === "fr" ? "Sélectionner des fichiers" : "Choose files",
    uploading:
      language === "fr" ? "Téléversement en cours..." : "Uploading...",
    uploadBtn: language === "fr" ? "Envoyer les photos" : "Upload photos",
    mustLogin:
      language === "fr"
        ? "Vous devez être connecté pour ajouter des photos."
        : "You must be logged in to upload photos.",
    uploadSuccess:
      language === "fr"
        ? "Photos ajoutées avec succès."
        : "Photos uploaded successfully.",
    uploadError:
      language === "fr"
        ? "Erreur lors de l'ajout des photos."
        : "Error while uploading photos.",
    delete: language === "fr" ? "Supprimer" : "Delete",
  };

  // 🔐 Auth (pour l'upload / suppression)
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error) {
          console.error("auth error", error);
          setCurrentUser(null);
        } else if (data?.user) {
          setCurrentUser(data.user);
        } else {
          setCurrentUser(null);
        }
      } catch (e) {
        console.error("auth check exception", e);
        setCurrentUser(null);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // 🔄 Charger les photos
  const loadPhotos = async () => {
    if (!workerId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("op_ouvrier_photos")
        .select(
          "id, worker_id, storage_path, title, description, created_by, created_at"
        )
        .eq("worker_id", workerId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("load photos error", error);
        setError(text.error);
        setPhotos([]);
        return;
      }

      const rows = (data ?? []) as PhotoRow[];

      const withUrls: PhotoWithUrl[] = rows.map((row) => {
        const { data: urlData } = supabase.storage
          .from(BUCKET_NAME)
          .getPublicUrl(row.storage_path);

        return {
          ...row,
          publicUrl: urlData.publicUrl,
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

  useEffect(() => {
    loadPhotos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const handleFilesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadFiles(e.target.files);
    setUploadMsg(null);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploadMsg(null);
    setError(null);

    if (!currentUser) {
      setUploadMsg(text.mustLogin);
      return;
    }

    if (!uploadFiles || uploadFiles.length === 0) {
      return;
    }

    setUploading(true);

    try {
      const filesArray = Array.from(uploadFiles);
      for (const file of filesArray) {
        const path = `${workerId}/${Date.now()}-${file.name}`;

        // Upload dans le bucket
        const { error: uploadError } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(path, file);

        if (uploadError) {
          console.error("upload error", uploadError);
          throw uploadError;
        }

        // Insertion en base
        const { error: insertError } = await supabase
          .from("op_ouvrier_photos")
          .insert({
            worker_id: workerId,
            storage_path: path,
            title: uploadTitle || null,
            description: uploadDescription || null,
            created_by: currentUser.id,
          });

        if (insertError) {
          console.error("insert photo error", insertError);
          throw insertError;
        }
      }

      setUploadMsg(text.uploadSuccess);
      setUploadFiles(null);
      setUploadTitle("");
      setUploadDescription("");
      const input = document.getElementById(
        "worker-gallery-files"
      ) as HTMLInputElement | null;
      if (input) input.value = "";

      await loadPhotos();
    } catch (e) {
      console.error("upload exception", e);
      setUploadMsg(text.uploadError);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (photo: PhotoWithUrl) => {
    if (!currentUser) return;
    // Optionnel : vérifier que currentUser.id === photo.created_by
    try {
      // Supprimer le fichier dans le bucket
      await supabase.storage.from(BUCKET_NAME).remove([photo.storage_path]);

      // Supprimer la ligne en base
      const { error } = await supabase
        .from("op_ouvrier_photos")
        .delete()
        .eq("id", photo.id);

      if (error) {
        console.error("delete photo error", error);
        return;
      }

      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (e) {
      console.error("delete photo exception", e);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <ImageIcon className="w-5 h-5 text-primary" />
          {text.title}
        </h2>
      </div>
      <p className="text-sm text-muted-foreground mb-4">{text.subtitle}</p>

      {/* Liste / grille de photos */}
      {loading && (
        <p className="text-sm text-muted-foreground mb-2">
          {text.loading}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive mb-2">{error}</p>
      )}

      {!loading && !error && photos.length === 0 && (
        <p className="text-sm text-muted-foreground mb-4">
          {text.noPhotos}
        </p>
      )}

      {!loading && !error && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group overflow-hidden rounded-lg border bg-muted/40"
            >
              <img
                src={photo.publicUrl}
                alt={photo.title || "Photo"}
                className="w-full h-32 object-cover"
              />
              {photo.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                  {photo.title}
                </div>
              )}

              {currentUser && photo.created_by === currentUser.id && (
                <button
                  type="button"
                  onClick={() => handleDelete(photo)}
                  className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  title={text.delete}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Formulaire d'upload (réservé aux utilisateurs connectés) */}
      <div className="mt-4 pt-4 border-t border-border">
        <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
          <UploadCloud className="w-4 h-4 text-primary" />
          {text.uploadTitle}
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          {text.uploadHint}
        </p>

        {!authChecked ? (
          <p className="text-sm text-muted-foreground">
            {language === "fr"
              ? "Vérification de la session..."
              : "Checking session..."}
          </p>
        ) : !currentUser ? (
          <p className="text-sm text-muted-foreground">
            {text.mustLogin}
          </p>
        ) : (
          <form onSubmit={handleUpload} className="space-y-3">
            <div>
              <label
                htmlFor="worker-gallery-files"
                className="block text-sm font-medium mb-1"
              >
                {text.fileLabel}
              </label>
              <Input
                id="worker-gallery-files"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {text.titleLabel}
              </label>
              <Input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                {text.descLabel}
              </label>
              <Textarea
                rows={2}
                value={uploadDescription}
                onChange={(e) => setUploadDescription(e.target.value)}
              />
            </div>

            {uploadMsg && (
              <p className="text-sm mt-1">
                {uploadMsg.startsWith("Erreur") ||
                uploadMsg.startsWith("Error")
                  ? uploadMsg
                  : uploadMsg}
              </p>
            )}

            <Button type="submit" disabled={uploading || !uploadFiles}>
              {uploading ? text.uploading : text.uploadBtn}
            </Button>
          </form>
        )}
      </div>
    </Card>
  );
};

export default WorkerGallery;
