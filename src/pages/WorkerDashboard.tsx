// src/pages/WorkerDashboard.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

type WorkerProfile = {
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
  profession: string | null;
  description: string | null;
  plan_code: "FREE" | "MONTHLY" | "YEARLY" | null;
  status: string | null;
  hourly_rate: number | null;
  currency: string | null;
  created_at: string;
};

type TabKey = "profile" | "subscription" | "stats" | "messages";

const WorkerDashboard: React.FC = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  useEffect(() => {
    let isMounted = true;

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);

      // 1) Qui est connecté ?
      const { data, error: userError } = await supabase.auth.getUser();
      const user = data?.user;

      if (!isMounted) return;

      if (userError || !user) {
        setError(
          language === "fr"
            ? "Vous devez être connecté pour accéder à cet espace."
            : "You must be logged in to access this area."
        );
        setLoading(false);
        return;
      }

      // 2) Récupérer l'ouvrier lié à ce user_id
      const { data: worker, error: workerError } = await supabase
        .from<WorkerProfile>("op_ouvriers")
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
          profession,
          description,
          plan_code,
          status,
          hourly_rate,
          currency,
          created_at
        `
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (!isMounted) return;

      if (workerError) {
        console.error(workerError);
        setError(
          language === "fr"
            ? `Erreur lors du chargement de votre profil : ${workerError.message}`
            : `Error while loading your profile: ${workerError.message}`
        );
      } else if (!worker) {
        setError(
          language === "fr"
            ? "Aucun profil ouvrier associé à ce compte. Merci de compléter votre inscription."
            : "No worker profile associated with this account. Please complete your registration."
        );
      } else {
        setProfile(worker);
      }

      setLoading(false);
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [language]);

  const planLabel = (plan: WorkerProfile["plan_code"]) => {
    if (!plan) return language === "fr" ? "Non défini" : "Not set";
    if (plan === "FREE") return language === "fr" ? "Gratuit" : "Free";
    if (plan === "MONTHLY") return language === "fr" ? "Mensuel" : "Monthly";
    if (plan === "YEARLY") return language === "fr" ? "Annuel" : "Yearly";
    return plan;
  };

  const statusLabel = (s: string | null | undefined) => {
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

  const statusClass = (s: string | null | undefined) => {
    if (s === "approved")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "rejected")
      return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const formatDate = (value: string) => {
    const d = new Date(value);
    return d.toLocaleString(language === "fr" ? "fr-FR" : "en-GB", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
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

  if (error || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="text-sm text-red-600 mb-3">{error}</div>
          <Button
            onClick={() => (window.location.href = "/")}
            className="bg-pro-blue hover:bg-blue-700"
          >
            {language === "fr" ? "Retour à l'accueil" : "Return to home"}
          </Button>
        </div>
      </div>
    );
  }

  const fullName =
    (profile.first_name || "") +
    (profile.last_name ? ` ${profile.last_name}` : "");

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {language === "fr"
                ? "Espace Ouvrier"
                : "Worker Dashboard"}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {language === "fr"
                ? "Gérez votre profil, votre abonnement et suivez vos statistiques."
                : "Manage your profile, subscription and follow your stats."}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-semibold text-slate-800">
              {fullName || (language === "fr" ? "Profil sans nom" : "No name")}
            </div>
            <div className="text-xs text-slate-500">
              {profile.email || ""}
            </div>
            <div className="mt-1 inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border bg-slate-50 text-slate-700 border-slate-200">
              {language === "fr" ? "Plan" : "Plan"} :{" "}
              <span className="font-semibold ml-1">
                {planLabel(profile.plan_code)}
              </span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 mb-4">
          <nav className="-mb-px flex flex-wrap gap-2">
            {[
              { key: "profile" as TabKey, labelFr: "Profil", labelEn: "Profile" },
              {
                key: "subscription" as TabKey,
                labelFr: "Abonnement",
                labelEn: "Subscription",
              },
              { key: "stats" as TabKey, labelFr: "Statistiques", labelEn: "Stats" },
              {
                key: "messages" as TabKey,
                labelFr: "Messages",
                labelEn: "Messages",
              },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`whitespace-nowrap px-3 py-2 text-sm border-b-2 -mb-px ${
                    isActive
                      ? "border-pro-blue text-pro-blue font-semibold"
                      : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-200"
                  }`}
                >
                  {language === "fr" ? tab.labelFr : tab.labelEn}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu selon l’onglet */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          {activeTab === "profile" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                {language === "fr" ? "Mon profil" : "My profile"}
              </h2>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-500">
                    {language === "fr" ? "Nom complet" : "Full name"}
                  </div>
                  <div className="font-medium text-slate-900">
                    {fullName || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    {language === "fr" ? "Métier principal" : "Main trade"}
                  </div>
                  <div className="font-medium text-slate-900">
                    {profile.profession || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Email</div>
                  <div className="font-medium text-slate-900">
                    {profile.email || "—"}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">
                    {language === "fr" ? "Téléphone" : "Phone"}
                  </div>
                  <div className="font-medium text-slate-900">
                    {profile.phone || "—"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-500">
                    {language === "fr" ? "Localisation" : "Location"}
                  </div>
                  <div className="font-medium text-slate-900">
                    {[
                      profile.country,
                      profile.region,
                      profile.city,
                      profile.commune,
                      profile.district,
                    ]
                      .filter(Boolean)
                      .join(" • ") || "—"}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <div className="text-xs text-slate-500">
                    {language === "fr"
                      ? "Description de vos services"
                      : "Services description"}
                  </div>
                  <div className="text-slate-800 whitespace-pre-line">
                    {profile.description || "—"}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2 items-center">
                <span
                  className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${statusClass(
                    profile.status
                  )}`}
                >
                  {statusLabel(profile.status)}
                </span>
                <span className="text-xs text-slate-400">
                  {language === "fr" ? "Créé le" : "Created at"}{" "}
                  {formatDate(profile.created_at)}
                </span>
              </div>

              <div className="pt-3 border-t border-slate-100 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  // TODO: à connecter plus tard à un écran d'édition
                  onClick={() =>
                    alert(
                      language === "fr"
                        ? "L’édition de profil sera ajoutée dans une prochaine étape."
                        : "Profile editing will be added in a next step."
                    )
                  }
                >
                  {language === "fr"
                    ? "Modifier mon profil (bientôt)"
                    : "Edit my profile (soon)"}
                </Button>
              </div>
            </div>
          )}

          {activeTab === "subscription" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                {language === "fr"
                  ? "Mon abonnement"
                  : "My subscription"}
              </h2>

              <div className="text-sm">
                <div className="mb-2">
                  <span className="text-xs text-slate-500">
                    {language === "fr" ? "Plan actuel" : "Current plan"}
                  </span>
                  <div className="mt-1 inline-flex items-center px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-sm">
                    <span className="font-semibold mr-2">
                      {planLabel(profile.plan_code)}
                    </span>
                    <span className="text-xs text-slate-500">
                      {profile.plan_code === "FREE"
                        ? language === "fr"
                          ? "Visibilité limitée"
                          : "Limited visibility"
                        : language === "fr"
                        ? "Visibilité avancée + contacts illimités"
                        : "Boosted visibility + unlimited contacts"}
                    </span>
                  </div>
                </div>

                {profile.hourly_rate != null && (
                  <div className="mt-3">
                    <div className="text-xs text-slate-500">
                      {language === "fr"
                        ? "Tarif horaire déclaré"
                        : "Declared hourly rate"}
                    </div>
                    <div className="font-medium text-slate-900">
                      {profile.hourly_rate.toLocaleString()}{" "}
                      {profile.currency || ""}
                      /h
                    </div>
                  </div>
                )}

                <div className="mt-4 text-xs text-slate-500">
                  {language === "fr"
                    ? "Le changement de plan (Gratuit → Mensuel / Annuel) pourra être géré ici avec un module de paiement dans une prochaine étape."
                    : "Changing plan (Free → Monthly / Yearly) will be handled here with a payment module in a next step."}
                </div>

                <div className="pt-3 border-t border-slate-100 mt-3 flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      alert(
                        language === "fr"
                          ? "La gestion des paiements et upgrades sera ajoutée plus tard."
                          : "Payment and upgrades management will be added later."
                      )
                    }
                  >
                    {language === "fr"
                      ? "Mettre à niveau (bientôt)"
                      : "Upgrade (soon)"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === "stats" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                {language === "fr"
                  ? "Statistiques personnelles"
                  : "Personal stats"}
              </h2>
              <p className="text-xs text-slate-500 mb-2">
                {language === "fr"
                  ? "Ce bloc pourra afficher le nombre de vues de votre profil, le nombre de demandes reçues, le taux de réponse, etc."
                  : "This block will display number of profile views, requests received, response rate, etc."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-xs text-slate-500">
                    {language === "fr" ? "Vues du profil" : "Profile views"}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">—</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-xs text-slate-500">
                    {language === "fr"
                      ? "Demandes reçues"
                      : "Requests received"}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">—</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-xs text-slate-500">
                    {language === "fr"
                      ? "Taux de réponse"
                      : "Response rate"}
                  </div>
                  <div className="text-2xl font-bold text-slate-900">—</div>
                </div>
              </div>

              <div className="text-xs text-slate-500">
                {language === "fr"
                  ? "Nous pourrons brancher ces chiffres sur les tables de contacts / vues dès que le tracking sera en place."
                  : "We can plug these numbers to contacts / views tables once tracking is implemented."}
              </div>
            </div>
          )}

          {activeTab === "messages" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                {language === "fr" ? "Messages" : "Messages"}
              </h2>
              <p className="text-xs text-slate-500">
                {language === "fr"
                  ? "Ici, vous pourrez retrouver les demandes reçues, échanger avec les clients, marquer les demandes comme traitées, etc."
                  : "Here you’ll be able to view incoming requests, chat with clients and mark them as handled, etc."}
              </p>
              <div className="border border-dashed border-slate-200 rounded-lg p-4 text-xs text-slate-400">
                {language === "fr"
                  ? "La messagerie interne sera ajoutée dans une prochaine étape (lié aux demandes dans op_ouvrier_contacts)."
                  : "Internal messaging will be added in a next step (linked to requests in op_ouvrier_contacts)."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
