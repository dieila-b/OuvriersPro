// src/pages/WorkerDashboard.tsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlanCode = "FREE" | "MONTHLY" | "YEARLY" | null;
type WorkerStatus = "pending" | "approved" | "rejected" | null;

type DbWorker = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  postal_code: string | null;
  profession: string | null;
  description: string | null;
  plan_code: PlanCode;
  status: WorkerStatus;
  hourly_rate: number | null;
  currency: string | null;
  avatar_url: string | null;
  created_at: string;
  validated_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
};

type EditFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  profession: string;
  description: string;
  hourlyRate: string;
};

const WorkerDashboard: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [authLoading, setAuthLoading] = useState(true);
  const [workerLoading, setWorkerLoading] = useState(false);

  const [worker, setWorker] = useState<DbWorker | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);

  const [editForm, setEditForm] = useState<EditFormState>({
    firstName: "",
    lastName: "",
    phone: "",
    profession: "",
    description: "",
    hourlyRate: "",
  });

  // 🔐 Vérifier l'auth + rôle worker + charger le profil
  useEffect(() => {
    let isMounted = true;

    const load = async () => {
      setAuthLoading(true);
      setError(null);

      // 1) Récup user courant
      const { data: userData, error: userError } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (userError || !userData.user) {
        setAuthLoading(false);
        navigate("/login", { replace: true });
        return;
      }

      const user = userData.user;

      // 2) Vérifier rôle dans op_users
      const { data: profile, error: profileError } = await supabase
        .from("op_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (profileError || !profile || profile.role !== "worker") {
        setAuthLoading(false);
        navigate("/", { replace: true });
        return;
      }

      // 3) Charger le profil ouvrier
      setWorkerLoading(true);
      const { data: workerRow, error: workerError } = await supabase
        .from<DbWorker>("op_ouvriers")
        .select(
          `
          id,
          user_id,
          first_name,
          last_name,
          email,
          phone,
          country,
          region,
          city,
          commune,
          district,
          postal_code,
          profession,
          description,
          plan_code,
          status,
          hourly_rate,
          currency,
          avatar_url,
          created_at,
          validated_at,
          rejected_at,
          rejection_reason
        `
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (workerError) {
        console.error(workerError);
        setError(
          language === "fr"
            ? "Impossible de charger votre profil ouvrier."
            : "Unable to load your worker profile."
        );
        setWorker(null);
      } else if (!workerRow) {
        setError(
          language === "fr"
            ? "Aucun profil ouvrier trouvé. Merci de compléter votre inscription."
            : "No worker profile found. Please complete your registration."
        );
        setWorker(null);
      } else {
        setWorker(workerRow);
      }

      setWorkerLoading(false);
      setAuthLoading(false);
    };

    load();

    return () => {
      isMounted = false;
    };
  }, [navigate, language]);

  // Quand le worker est chargé, initialiser le formulaire d'édition
  useEffect(() => {
    if (!worker) return;

    setEditForm({
      firstName: worker.first_name || "",
      lastName: worker.last_name || "",
      phone: worker.phone || "",
      profession: worker.profession || "",
      description: worker.description || "",
      hourlyRate:
        worker.hourly_rate != null ? String(worker.hourly_rate) : "",
    });
  }, [worker]);

  const formatDateTime = (value: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const planMeta = useMemo(() => {
    const planCode = worker?.plan_code || "FREE";

    if (planCode === "MONTHLY") {
      return {
        code: "MONTHLY" as const,
        label: language === "fr" ? "Mensuel" : "Monthly",
        badge: language === "fr" ? "Sans engagement" : "No commitment",
        description:
          language === "fr"
            ? "Renouvelé chaque mois, accès complet à la plateforme."
            : "Renews every month, full access to the platform.",
      };
    }
    if (planCode === "YEARLY") {
      return {
        code: "YEARLY" as const,
        label: language === "fr" ? "Annuel" : "Yearly",
        badge: language === "fr" ? "2 mois offerts" : "2 months free",
        description:
          language === "fr"
            ? "Meilleur tarif, paiement annuel unique."
            : "Best pricing, yearly billing.",
      };
    }
    return {
      code: "FREE" as const,
      label: language === "fr" ? "Gratuit" : "Free",
      badge:
        language === "fr"
          ? "Visibilité limitée"
          : "Limited visibility",
      description:
        language === "fr"
          ? "Idéal pour tester la plateforme et démarrer doucement."
          : "Perfect to test the platform and get started.",
    };
  }, [worker?.plan_code, language]);

  const statusLabel = (s: WorkerStatus) => {
    if (language === "fr") {
      if (s === "approved") return "Validé";
      if (s === "rejected") return "Refusé";
      return "En attente";
    } else {
      if (s === "approved") return "Approved";
      if (s === "rejected") return "Rejected";
      return "Pending";
    }
  };

  const statusClass = (s: WorkerStatus) => {
    if (s === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected")
      return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const handleEditChange =
    (field: keyof EditFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setEditForm((prev) => ({ ...prev, [field]: value }));
    };

  const handleSaveProfile = async () => {
    if (!worker) return;
    setSaving(true);
    setError(null);

    try {
      const hourlyRateTrim = editForm.hourlyRate.trim();
      let hourlyRateNumber: number | null = null;
      if (hourlyRateTrim !== "") {
        const parsed = Number(hourlyRateTrim);
        hourlyRateNumber = Number.isFinite(parsed) ? parsed : null;
      }

      const { error: updateError } = await supabase
        .from("op_ouvriers")
        .update({
          first_name: editForm.firstName,
          last_name: editForm.lastName,
          phone: editForm.phone,
          profession: editForm.profession,
          description: editForm.description,
          hourly_rate: hourlyRateNumber,
        })
        .eq("id", worker.id);

      if (updateError) {
        console.error(updateError);
        setError(
          language === "fr"
            ? "Erreur lors de la mise à jour du profil."
            : "Error while updating your profile."
        );
      } else {
        // Mettre à jour dans le state local
        setWorker((prev) =>
          prev
            ? {
                ...prev,
                first_name: editForm.firstName,
                last_name: editForm.lastName,
                phone: editForm.phone,
                profession: editForm.profession,
                description: editForm.description,
                hourly_rate: hourlyRateNumber,
              }
            : prev
        );
        setEditMode(false);
      }
    } catch (err: any) {
      console.error(err);
      setError(
        language === "fr"
          ? "Une erreur inattendue s'est produite."
          : "An unexpected error occurred."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/", { replace: true });
  };

  if (authLoading || workerLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr"
            ? "Chargement de votre espace ouvrier..."
            : "Loading your worker space..."}
        </div>
      </div>
    );
  }

  if (!worker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6">
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            {language === "fr"
              ? "Profil ouvrier introuvable"
              : "Worker profile not found"}
          </h1>
          <p className="text-sm text-slate-600 mb-4">
            {error ||
              (language === "fr"
                ? "Nous n'avons pas trouvé de profil ouvrier associé à ce compte."
                : "We could not find any worker profile for this account.")}
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              className="flex-1 bg-pro-blue hover:bg-blue-700"
              onClick={() => navigate("/inscription-ouvrier")}
            >
              {language === "fr"
                ? "Compléter mon inscription"
                : "Complete my registration"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate("/")}
            >
              {language === "fr" ? "Retour à l'accueil" : "Back to home"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const fullName =
    (worker.first_name || "") +
    (worker.last_name ? ` ${worker.last_name}` : "");

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="max-w-5xl mx-auto px-4 md:px-8">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            {/* Avatar simple */}
            <div className="h-12 w-12 rounded-full bg-pro-blue/10 flex items-center justify-center text-pro-blue font-semibold text-lg">
              {fullName
                ? fullName.charAt(0).toUpperCase()
                : worker.email?.charAt(0).toUpperCase() || "O"}
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
                {language === "fr"
                  ? "Mon espace Ouvrier Pro"
                  : "My Pro Worker space"}
              </h1>
              <p className="text-sm text-slate-600">
                {language === "fr"
                  ? "Gérez vos informations, votre abonnement et le statut de votre profil."
                  : "Manage your information, subscription and profile status."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex flex-col text-right text-xs text-slate-500">
              <span>{worker.email}</span>
              <span>
                {language === "fr" ? "Créé le " : "Created on "}
                {formatDateTime(worker.created_at)}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
            >
              {language === "fr" ? "Se déconnecter" : "Log out"}
            </Button>
          </div>
        </div>

        {/* Statut + Abonnement */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {/* Statut de validation */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              {language === "fr"
                ? "Statut de mon profil"
                : "Profile status"}
            </h2>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusClass(
                  worker.status
                )}`}
              >
                {statusLabel(worker.status)}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-2">
              {worker.status === "pending" &&
                (language === "fr"
                  ? "Votre profil est en cours de validation par l'équipe. Vous serez notifié dès qu'il sera validé."
                  : "Your profile is being reviewed by our team. You will be notified once it is approved.")}
              {worker.status === "approved" &&
                (language === "fr"
                  ? "Votre profil est validé et visible par les clients."
                  : "Your profile is approved and visible to clients.")}
              {worker.status === "rejected" &&
                (language === "fr"
                  ? "Votre profil a été refusé. Vous pouvez le mettre à jour et contacter le support si besoin."
                  : "Your profile has been rejected. You can update it and contact support if needed.")}
            </p>
            <ul className="text-xs text-slate-500 space-y-1">
              <li>
                <strong>
                  {language === "fr" ? "Créé le : " : "Created on: "}
                </strong>
                {formatDateTime(worker.created_at)}
              </li>
              <li>
                <strong>
                  {language === "fr" ? "Validé le : " : "Approved on: "}
                </strong>
                {formatDateTime(worker.validated_at)}
              </li>
              {worker.rejected_at && (
                <li>
                  <strong>
                    {language === "fr" ? "Refusé le : " : "Rejected on: "}
                  </strong>
                  {formatDateTime(worker.rejected_at)}
                  {worker.rejection_reason && (
                    <span>
                      {" – "}
                      {worker.rejection_reason}
                    </span>
                  )}
                </li>
              )}
            </ul>
          </div>

          {/* Abonnement */}
          <div className="bg-white border border-slate-200 rounded-xl p-4">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              {language === "fr"
                ? "Mon abonnement"
                : "My subscription"}
            </h2>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-lg font-bold text-pro-blue">
                  {planMeta.label}
                </div>
                <div className="inline-flex items-center px-2 py-0.5 text-[11px] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 mt-1">
                  {planMeta.badge}
                </div>
              </div>
              <span className="text-xs text-slate-500 uppercase tracking-wide">
                {worker.plan_code || "FREE"}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-3">
              {planMeta.description}
            </p>
            <ul className="text-xs text-slate-500 list-disc list-inside space-y-1 mb-3">
              {planMeta.code === "FREE" && (
                <>
                  <li>
                    {language === "fr"
                      ? "Visibilité de base dans les résultats."
                      : "Basic visibility in search results."}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Idéal pour démarrer et tester la plateforme."
                      : "Ideal to start and test the platform."}
                  </li>
                </>
              )}
              {planMeta.code !== "FREE" && (
                <>
                  <li>
                    {language === "fr"
                      ? "Visibilité renforcée et mise en avant."
                      : "Enhanced visibility and highlight."}
                  </li>
                  <li>
                    {language === "fr"
                      ? "Contacts illimités avec les clients."
                      : "Unlimited contacts with clients."}
                  </li>
                </>
              )}
            </ul>
            <Button
              variant="outline"
              size="sm"
              className="text-xs"
              disabled
            >
              {language === "fr"
                ? "Changer de plan (bientôt)"
                : "Change plan (soon)"}
            </Button>
          </div>
        </div>

        {/* Profil éditable */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">
              {language === "fr" ? "Mon profil" : "My profile"}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setEditMode((prev) => !prev)}
            >
              {editMode
                ? language === "fr"
                  ? "Annuler"
                  : "Cancel"
                : language === "fr"
                ? "Modifier mon profil"
                : "Edit my profile"}
            </Button>
          </div>

          {/* Vue lecture seule OU formulaire d'édition */}
          {editMode ? (
            <div className="space-y-4">
              {/* Nom / Prénom */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {language === "fr" ? "Prénom" : "First name"}
                  </label>
                  <Input
                    value={editForm.firstName}
                    onChange={handleEditChange("firstName")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {language === "fr" ? "Nom" : "Last name"}
                  </label>
                  <Input
                    value={editForm.lastName}
                    onChange={handleEditChange("lastName")}
                  />
                </div>
              </div>

              {/* Téléphone */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "fr" ? "Téléphone" : "Phone"}
                </label>
                <Input
                  value={editForm.phone}
                  onChange={handleEditChange("phone")}
                />
              </div>

              {/* Métier */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "fr" ? "Métier principal" : "Main trade"}
                </label>
                <Input
                  value={editForm.profession}
                  onChange={handleEditChange("profession")}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {language === "fr"
                    ? "Description de vos services"
                    : "Description of your services"}
                </label>
                <textarea
                  value={editForm.description}
                  onChange={handleEditChange("description")}
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue min-h-[100px]"
                />
              </div>

              {/* Tarif */}
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {language === "fr"
                      ? "Tarif horaire"
                      : "Hourly rate"}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.hourlyRate}
                    onChange={handleEditChange("hourlyRate")}
                  />
                </div>
                <div className="flex items-end text-xs text-slate-500">
                  {worker.currency && (
                    <span>
                      {language === "fr"
                        ? `Monnaie actuelle : ${worker.currency}`
                        : `Current currency: ${worker.currency}`}
                    </span>
                  )}
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(false)}
                  disabled={saving}
                >
                  {language === "fr" ? "Annuler" : "Cancel"}
                </Button>
                <Button
                  size="sm"
                  className="bg-pro-blue hover:bg-blue-700"
                  onClick={handleSaveProfile}
                  disabled={saving}
                >
                  {saving
                    ? language === "fr"
                      ? "Enregistrement..."
                      : "Saving..."
                    : language === "fr"
                    ? "Enregistrer"
                    : "Save"}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2 text-sm text-slate-700">
              <div>
                <span className="font-semibold">
                  {language === "fr" ? "Nom : " : "Name: "}
                </span>
                {fullName || "—"}
              </div>
              <div>
                <span className="font-semibold">
                  {language === "fr" ? "Téléphone : " : "Phone: "}
                </span>
                {worker.phone || "—"}
              </div>
              <div>
                <span className="font-semibold">
                  {language === "fr" ? "Métier : " : "Trade: "}
                </span>
                {worker.profession || "—"}
              </div>
              <div>
                <span className="font-semibold">
                  {language === "fr"
                    ? "Description : "
                    : "Description: "}
                </span>
                <span className="text-slate-600">
                  {worker.description || "—"}
                </span>
              </div>
              <div>
                <span className="font-semibold">
                  {language === "fr" ? "Localisation : " : "Location: "}
                </span>
                <span className="text-slate-600">
                  {[worker.country, worker.region, worker.city, worker.commune, worker.district]
                    .filter(Boolean)
                    .join(" • ") || "—"}
                </span>
              </div>
              <div>
                <span className="font-semibold">
                  {language === "fr"
                    ? "Tarif horaire : "
                    : "Hourly rate: "}
                </span>
                {worker.hourly_rate != null && worker.currency
                  ? `${worker.hourly_rate} ${worker.currency} / h`
                  : "—"}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
