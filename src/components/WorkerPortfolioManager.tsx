// src/components/WorkerPortfolioManager.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type WorkerPortfolioManagerProps = {
  workerId: string;
};

type PortfolioItem = {
  id: string;
  worker_id: string;
  title: string | null;
  description: string | null;
  location: string | null;
  date_completed: string | null;
  cover_photo_url: string | null;
  created_at: string;
};

const WorkerPortfolioManager: React.FC<WorkerPortfolioManagerProps> = ({
  workerId,
}) => {
  const { language } = useLanguage();

  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [dateCompleted, setDateCompleted] = useState("");
  const [coverPhotoUrl, setCoverPhotoUrl] = useState("");

  const text = {
    title:
      language === "fr"
        ? "Mes réalisations / portfolio"
        : "My work / portfolio",
    info:
      language === "fr"
        ? "Ajoutez quelques projets terminés pour mieux présenter votre expérience."
        : "Add some completed projects to better showcase your experience.",
    formTitle:
      language === "fr"
        ? "Ajouter une réalisation"
        : "Add a project",
    labelProjectTitle:
      language === "fr" ? "Titre du projet" : "Project title",
    labelDescription:
      language === "fr" ? "Description" : "Description",
    labelLocation:
      language === "fr" ? "Lieu (quartier, ville…)" : "Location (district, city…)",
    labelDate:
      language === "fr"
        ? "Date de fin (facultatif)"
        : "Completion date (optional)",
    labelCoverUrl:
      language === "fr"
        ? "URL photo de couverture (facultatif)"
        : "Cover photo URL (optional)",
    addBtn: language === "fr" ? "Ajouter au portfolio" : "Add to portfolio",
    addingBtn:
      language === "fr" ? "Enregistrement..." : "Saving...",
    noItems:
      language === "fr"
        ? "Vous n'avez pas encore ajouté de réalisations."
        : "You have not added any projects yet.",
    errorLoad:
      language === "fr"
        ? "Impossible de charger votre portfolio."
        : "Unable to load your portfolio.",
    errorSave:
      language === "fr"
        ? "Impossible d'enregistrer cette réalisation."
        : "Unable to save this project.",
    delete: language === "fr" ? "Supprimer" : "Delete",
    errorDelete:
      language === "fr"
        ? "Impossible de supprimer cette réalisation."
        : "Unable to delete this project.",
  };

  const loadItems = async () => {
    if (!workerId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("op_ouvrier_portfolio")
        .select(
          `
          id,
          worker_id,
          title,
          description,
          location,
          date_completed,
          cover_photo_url,
          created_at
        `
        )
        .eq("worker_id", workerId)
        .order("date_completed", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("load portfolio error", error);
        setError(text.errorLoad);
        setItems([]);
        return;
      }

      setItems((data as PortfolioItem[]) ?? []);
    } catch (e) {
      console.error("load portfolio exception", e);
      setError(text.errorLoad);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setDateCompleted("");
    setCoverPhotoUrl("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerId) return;
    if (!title.trim() && !description.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const { error } = await supabase.from("op_ouvrier_portfolio").insert({
        worker_id: workerId,
        title: title.trim() || null,
        description: description.trim() || null,
        location: location.trim() || null,
        date_completed: dateCompleted || null,
        cover_photo_url: coverPhotoUrl.trim() || null,
      });

      if (error) {
        console.error("insert portfolio error", error);
        setError(text.errorSave);
      } else {
        resetForm();
        await loadItems();
      }
    } catch (err) {
      console.error("insert portfolio exception", err);
      setError(text.errorSave);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: PortfolioItem) => {
    setError(null);
    try {
      const { error } = await supabase
        .from("op_ouvrier_portfolio")
        .delete()
        .eq("id", item.id);

      if (error) {
        console.error("delete portfolio error", error);
        setError(text.errorDelete);
        return;
      }

      await loadItems();
    } catch (err) {
      console.error("delete portfolio exception", err);
      setError(text.errorDelete);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col gap-3 mb-4">
        <div>
          <h2 className="text-lg font-semibold">{text.title}</h2>
          <p className="text-xs text-muted-foreground">{text.info}</p>
        </div>
      </div>

      {/* Formulaire ajout */}
      <form onSubmit={handleSubmit} className="space-y-3 mb-6">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {text.labelProjectTitle}
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                language === "fr"
                  ? "Ex : Rénovation salle de bain"
                  : "e.g. Bathroom renovation"
              }
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {text.labelLocation}
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={
                language === "fr"
                  ? "Ex : Ratoma • Kipé"
                  : "e.g. Downtown • District 3"
              }
            />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {text.labelDate}
            </label>
            <Input
              type="date"
              value={dateCompleted}
              onChange={(e) => setDateCompleted(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              {text.labelCoverUrl}
            </label>
            <Input
              value={coverPhotoUrl}
              onChange={(e) => setCoverPhotoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">
            {text.labelDescription}
          </label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder={
              language === "fr"
                ? "Décrivez brièvement le projet, le type de travaux réalisés, les contraintes, etc."
                : "Briefly describe the project, type of work, constraints, etc."
            }
          />
        </div>

        <div className="pt-1">
          <Button type="submit" size="sm" disabled={saving}>
            {saving ? text.addingBtn : text.addBtn}
          </Button>
        </div>
      </form>

      {error && (
        <div className="mb-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Liste des réalisations */}
      {loading && (
        <p className="text-sm text-muted-foreground">
          {language === "fr"
            ? "Chargement de vos réalisations..."
            : "Loading your projects..."}
        </p>
      )}

      {!loading && items.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {text.noItems}
        </p>
      )}

      {!loading && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="border border-border rounded-lg p-3 flex flex-col gap-2"
            >
              {item.cover_photo_url && (
                <div className="rounded-md overflow-hidden mb-2">
                  <img
                    src={item.cover_photo_url}
                    alt={item.title ?? ""}
                    className="w-full h-40 object-cover"
                  />
                </div>
              )}

              <div className="flex-1">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-sm">
                    {item.title || (language === "fr" ? "Sans titre" : "Untitled")}
                  </h3>
                  <button
                    type="button"
                    onClick={() => handleDelete(item)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    {text.delete}
                  </button>
                </div>

                {item.location && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {item.location}
                  </div>
                )}

                {item.date_completed && (
                  <div className="text-xs text-muted-foreground mb-1">
                    {language === "fr" ? "Terminé le " : "Completed on "}
                    {item.date_completed}
                  </div>
                )}

                {item.description && (
                  <p className="text-xs text-gray-700 whitespace-pre-line">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default WorkerPortfolioManager;
