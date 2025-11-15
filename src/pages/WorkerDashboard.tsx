import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient"; // adapte si besoin
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlanCode = "FREE" | "MONTHLY" | "YEARLY";

type DbUser = {
  id: string;
  role: "admin" | "worker";
  full_name: string | null;
  avatar_url?: string | null;
};

type DbWorker = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  profession: string | null;
  description: string | null;
  plan_code: PlanCode;
  status: "pending" | "approved" | "rejected";
  hourly_rate: number | null;
  currency: string | null;
  avatar_url: string | null;
};

const WorkerDashboard: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<DbUser | null>(null);
  const [worker, setWorker] = useState<DbWorker | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // champs éditables
  const [editPhone, setEditPhone] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editHourlyRate, setEditHourlyRate] = useState("");

  // 🔐 Vérification auth + rôle worker
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setAuthLoading(true);
      setError(null);

      const { data: userRes, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userRes.user) {
        if (mounted) {
          navigate("/login", { replace: true });
        }
        return;
      }

      const authUser = userRes.user;

      // Profil op_users
      const { data: opUser, error: opUserErr } = await supabase
        .from<DbUser>("op_users")
        .select("id, role, full_name, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!mounted) return;

      if (opUserErr || !opUser) {
        console.error(opUserErr);
        setError(
          language === "fr"
            ? "Impossible de charger votre profil utilisateur."
            : "Unable to load your user profile."
        );
        setAuthLoading(false);
        return;
      }

      if (opUser.role !== "worker") {
        // si ce n'est pas un ouvrier on renvoie vers l’accueil
        navigate("/", { replace: true });
        return;
      }

      setUser(opUser);
      setAuthLoading(false);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [language, navigate]);

  // 🔄 Charger le profil ouvrier lié
  useEffect(() => {
    if (!user) return;

    const fetchWorker = async () => {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const { data, error: workerErr } = await supabase
        .from<DbWorker>("op_ouvriers")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (workerErr) {
        console.error(workerErr);
        setError(
          language === "fr"
            ? "Impossible de charger votre fiche ouvrier."
            : "Unable to load your worker profile."
        );
      } else if (!data) {
        setError(
          language === "fr"
            ? "Aucun profil ouvrier n’est associé à ce compte."
            : "No worker profile is linked to this account."
        );
      } else {
        setWorker(data);
        setEditPhone(data.phone || "");
        setEditDescription(data.description || "");
        setEditHourlyRate(
          data.hourly_rate != null ? String(data.hourly_rate) : ""
        );
      }

      setLoading(false);
    };

    fetchWorker();
  }, [user, language]);

  const formatPlanLabel = (plan: PlanCode | null | undefined) => {
    if (plan === "MONTHLY") {
      return language === "fr" ? "Mensuel" : "Monthly";
    }
    if (plan === "YEARLY") {
      return language === "fr" ? "Annuel" : "Yearly";
    }
    return language === "fr" ? "Gratuit" : "Free";
  };

  const formatStatusLabel = (s: DbWorker["status"] | null | undefined) => {
    if (language === "fr") {
      if (s === "approved") return "Validé";
      if (s === "rejected") return "Refusé";
      return "En attente de validation";
    }
    if (s === "approved") return "Approved";
    if (s === "rejected") return "Rejected";
    return "Pending review";
  };

  const formatStatusClass = (s: DbWorker["status"] | null | undefined) => {
    if (s === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected") return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const handleSaveProfile = async () => {
    if (!worker) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    const rateTrim = editHourlyRate.trim();
    let rateNumber: number | null = null;
    if (rateTrim !== "") {
      const parsed = Number(rateTrim);
      rateNumber = Number.isFinite(parsed) ? parsed : null;
    }

    const { error: updErr } = await supabase
      .from("op_ouvriers")
      .update({
        phone: editPhone,
        description: editDescription,
        hourly_rate: rateNumber,
      })
      .eq("id", worker.id);

    if (updErr) {
      console.error(updErr);
      setError(
        language === "fr"
          ? "Erreur lors de la mise à jour du profil."
          : "Error while updating your profile."
      );
    } else {
      setSuccess(
        language === "fr"
          ? "Profil mis à jour avec succès."
          : "Profile updated successfully."
      );
      setWorker({
        ...worker,
        phone: editPhone,
        description: editDescription,
        hourly_rate: rateNumber,
      });
    }

    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr"
            ? "Chargement de votre espace..."
            : "Loading your space..."}
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {language === "fr"
                ? "Mon espace Ouvrier Pro"
                : "My OuvriersPro space"}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {language === "fr"
                ? "Gérez votre profil, votre visibilité et votre abonnement."
                : "Manage your profile, visibility and subscription."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="self-start"
          >
            {language === "fr" ? "Se déconnecter" : "Log out"}
          </Button>
        </div>

        {/* Messages globaux */}
        {error && (
          <div className="mb-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-4 text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
            {success}
          </div>
        )}

        {loading || !worker ? (
          <div className="text-sm text-slate-500">
            {language === "fr" ? "Chargement du profil..." : "Loading profile..."}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {/* Colonne gauche : résumé & abonnement */}
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    {language === "fr" ? "Mon profil" : "My profile"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center gap-3">
                    {worker.avatar_url ? (
                      <img
                        src={worker.avatar_url}
                        alt="Avatar"
                        className="h-12 w-12 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 text-sm font-semibold">
                        {(worker.first_name?.[0] || "").toUpperCase()}
                        {(worker.last_name?.[0] || "").toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="font-semibold text-slate-900">
                        {(worker.first_name || "") +
                          (worker.last_name ? ` ${worker.last_name}` : "")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {worker.profession || ""}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-slate-600 space-y-1">
                    <div>{worker.email}</div>
                    {worker.city && (
                      <div>
                        {worker.city}
                        {worker.commune ? `, ${worker.commune}` : ""}
                        {worker.district ? `, ${worker.district}` : ""}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    {language === "fr"
                      ? "Mon abonnement"
                      : "My subscription"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      {language === "fr" ? "Plan actuel" : "Current plan"}
                    </span>
                    <span className="font-semibold text-pro-blue">
                      {formatPlanLabel(worker.plan_code)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-600">
                      {language === "fr"
                        ? "Statut de validation"
                        : "Validation status"}
                    </span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${formatStatusClass(
                        worker.status
                      )}`}
                    >
                      {formatStatusLabel(worker.status)}
                    </span>
                  </div>

                  <p className="text-xs text-slate-500">
                    {language === "fr"
                      ? "La gestion complète de l’abonnement (paiement, changement de plan…) sera disponible dans une prochaine version."
                      : "Full subscription management (payments, plan changes…) will be available in a next version."}
                  </p>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full mt-1"
                    onClick={() => {
                      // placeholder : plus tard -> redirection vers page de paiement/upgrade
                      alert(
                        language === "fr"
                          ? "La gestion détaillée de l’abonnement arrivera bientôt."
                          : "Detailed subscription management will be available soon."
                      );
                    }}
                  >
                    {language === "fr"
                      ? "Gérer mon abonnement"
                      : "Manage my subscription"}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Colonne droite : édition profil */}
            <div className="md:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-semibold text-slate-800">
                    {language === "fr"
                      ? "Modifier mon profil"
                      : "Edit my profile"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {language === "fr" ? "Téléphone" : "Phone"}
                    </label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      placeholder="+224 6X XX XX XX"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {language === "fr"
                        ? "Description de vos services"
                        : "Description of your services"}
                    </label>
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue min-h-[100px]"
                      placeholder={
                        language === "fr"
                          ? "Mettez à jour votre expérience, vos services, vos zones d’intervention..."
                          : "Update your experience, services and work areas..."
                      }
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      {language === "fr"
                        ? `Tarif horaire (${worker.currency || "FG"})`
                        : `Hourly rate (${worker.currency || "FG"})`}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={editHourlyRate}
                      onChange={(e) => setEditHourlyRate(e.target.value)}
                      placeholder={
                        language === "fr"
                          ? "Ex : 250000"
                          : "e.g. 20"
                      }
                    />
                  </div>

                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="bg-pro-blue hover:bg-blue-700"
                    >
                      {saving
                        ? language === "fr"
                          ? "Enregistrement..."
                          : "Saving..."
                        : language === "fr"
                        ? "Enregistrer les modifications"
                        : "Save changes"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WorkerDashboard;
