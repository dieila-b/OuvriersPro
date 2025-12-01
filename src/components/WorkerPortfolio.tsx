import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, DollarSign, Image as ImageIcon } from "lucide-react";

type WorkerPortfolioProps = {
  workerId: string;
};

type ProjectRow = {
  id: string;
  worker_id: string;
  title: string;
  description: string | null;
  location: string | null;
  budget: string | null;
  started_at: string | null;   // date ISO
  finished_at: string | null;  // date ISO
  status: string | null;
  main_photo_url: string | null;
  created_at: string;
};

const WorkerPortfolio: React.FC<WorkerPortfolioProps> = ({ workerId }) => {
  const { language } = useLanguage();

  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const text = {
    title: language === "fr" ? "Portfolio / Réalisations" : "Portfolio / Projects",
    subtitle:
      language === "fr"
        ? "Découvrez quelques projets réalisés par ce professionnel."
        : "Discover some projects completed by this professional.",
    noProjects:
      language === "fr"
        ? "Aucune réalisation publiée pour le moment."
        : "No projects published yet.",
    errorLoad:
      language === "fr"
        ? "Impossible de charger les réalisations pour le moment."
        : "Unable to load projects at the moment.",
    statusCompleted: language === "fr" ? "Terminé" : "Completed",
    statusInProgress: language === "fr" ? "En cours" : "In progress",
    statusOther: language === "fr" ? "Projet" : "Project",
    startedAt: language === "fr" ? "Début" : "Start",
    finishedAt: language === "fr" ? "Fin" : "End",
  };

  const loadProjects = async () => {
    if (!workerId) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from("op_ouvrier_projects")
        .select(
          "id, worker_id, title, description, location, budget, started_at, finished_at, status, main_photo_url, created_at"
        )
        .eq("worker_id", workerId)
        .order("finished_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("load projects error", error);
        setError(text.errorLoad);
        setProjects([]);
        return;
      }

      setProjects((data ?? []) as ProjectRow[]);
    } catch (e) {
      console.error("load projects exception", e);
      setError(text.errorLoad);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workerId]);

  const formatDate = (value: string | null) => {
    if (!value) return null;
    const d = new Date(value);
    return d.toLocaleDateString(language === "fr" ? "fr-FR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
    });
  };

  const statusBadge = (status: string | null | undefined) => {
    const s = (status || "").toLowerCase();
    if (s === "completed" || s === "termine" || s === "terminé") {
      return (
        <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200">
          {text.statusCompleted}
        </Badge>
      );
    }
    if (s === "in_progress" || s === "en_cours") {
      return (
        <Badge className="bg-amber-50 text-amber-700 border-amber-200">
          {text.statusInProgress}
        </Badge>
      );
    }
    return (
      <Badge className="bg-slate-50 text-slate-700 border-slate-200">
        {text.statusOther}
      </Badge>
    );
  };

  return (
    <Card className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="text-xl font-semibold">{text.title}</h2>
          <p className="text-xs text-muted-foreground">{text.subtitle}</p>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-muted-foreground">
          {language === "fr"
            ? "Chargement des réalisations..."
            : "Loading projects..."}
        </p>
      )}

      {error && (
        <p className="text-sm text-destructive mb-2">
          {error}
        </p>
      )}

      {!loading && !error && projects.length === 0 && (
        <p className="text-sm text-muted-foreground">
          {text.noProjects}
        </p>
      )}

      {!loading && !error && projects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const start = formatDate(p.started_at);
            const end = formatDate(p.finished_at);

            return (
              <div
                key={p.id}
                className="border border-border rounded-lg overflow-hidden bg-muted/20 flex flex-col"
              >
                {p.main_photo_url ? (
                  <div className="w-full h-40 bg-black/5 overflow-hidden">
                    <img
                      src={p.main_photo_url}
                      alt={p.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-full h-40 flex items-center justify-center bg-muted text-muted-foreground text-xs gap-2">
                    <ImageIcon className="w-4 h-4" />
                    <span>
                      {language === "fr"
                        ? "Aucune image principale"
                        : "No main image"}
                    </span>
                  </div>
                )}

                <div className="p-4 flex-1 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold text-sm md:text-base">
                      {p.title}
                    </h3>
                    {statusBadge(p.status)}
                  </div>

                  {p.location && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="w-3 h-3" />
                      <span>{p.location}</span>
                    </div>
                  )}

                  {(start || end) && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {start && (
                          <>
                            {text.startedAt}: {start}
                          </>
                        )}
                        {start && end && " • "}
                        {end && (
                          <>
                            {text.finishedAt}: {end}
                          </>
                        )}
                      </span>
                    </div>
                  )}

                  {p.budget && (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DollarSign className="w-3 h-3" />
                      <span>{p.budget}</span>
                    </div>
                  )}

                  {p.description && (
                    <p className="text-xs text-slate-700 mt-1 line-clamp-4 whitespace-pre-line">
                      {p.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default WorkerPortfolio;
