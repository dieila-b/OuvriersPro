// src/pages/WorkerReviews.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import WorkerReviewsComponent from "@/components/WorkerReviews";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const WorkerReviewsPage: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [workerId, setWorkerId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const { data: authData, error: authError } = await supabase.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          setError(
            language === "fr"
              ? "Vous devez être connecté pour accéder à cette page."
              : "You must be logged in to access this page."
          );
          setLoading(false);
          return;
        }

        // Fetch worker profile for current user
        const { data: workerData, error: workerError } = await supabase
          .from("op_ouvriers")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (workerError || !workerData) {
          setError(
            language === "fr"
              ? "Profil ouvrier introuvable."
              : "Worker profile not found."
          );
          setLoading(false);
          return;
        }

        setWorkerId(workerData.id);
      } catch (e) {
        console.error(e);
        setError(
          language === "fr"
            ? "Une erreur est survenue."
            : "An error occurred."
        );
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [language]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr" ? "Chargement..." : "Loading..."}
        </div>
      </div>
    );
  }

  if (error || !workerId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-sm text-red-600">{error}</div>
          <Button
            onClick={() => navigate("/espace-ouvrier")}
            className="bg-pro-blue hover:bg-blue-700"
          >
            {language === "fr" ? "Retour au tableau de bord" : "Back to dashboard"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/espace-ouvrier")}
            className="text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {language === "fr" ? "Retour" : "Back"}
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-6">
          {language === "fr" ? "Mes avis clients" : "My customer reviews"}
        </h1>

        <WorkerReviewsComponent workerId={workerId} />
      </div>
    </div>
  );
};

export default WorkerReviewsPage;
