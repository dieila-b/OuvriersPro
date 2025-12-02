// src/pages/WorkerDashboard.tsx
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import WorkerPhotosManager from "@/components/WorkerPhotosManager";
import WorkerPortfolioManager from "@/components/WorkerPortfolioManager";
import { Mail, Phone, MessageCircle, User, Copy } from "lucide-react";

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

type WorkerContact = {
  id: string;
  worker_id: string | null;
  client_id: string | null; // IMPORTANT : référence vers le profil client
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
  status: string | null;
  origin: string | null;
  created_at: string;
};

type TabKey = "profile" | "subscription" | "stats" | "messages";

const WorkerDashboard: React.FC = () => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  // Messages / demandes de contact
  const [contacts, setContacts] = useState<WorkerContact[]>([]);
  const [contactsLoading, setContactsLoading] = useState(false);
  const [contactsError, setContactsError] = useState<string | null>(null);

  // Réponses rapides par message (id -> texte)
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});

  // Édition du profil
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [editProfile, setEditProfile] = useState<WorkerProfile | null>(null);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(
    null
  );
  const [profileUpdateSuccess, setProfileUpdateSuccess] = useState<
    string | null
  >(null);

  // Gestion abonnement
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [planUpdateError, setPlanUpdateError] = useState<string | null>(null);
  const [planUpdateSuccess, setPlanUpdateSuccess] = useState<string | null>(
    null
  );

  // Stats
  const [statsLoading, setStatsLoading] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);
  const [profileViews, setProfileViews] = useState<number>(0);
  const [requestsCount, setRequestsCount] = useState<number>(0);
  const [responseRate, setResponseRate] = useState<number>(0);

  useEffect(() => {
    let isMounted = true;

    const fetchData = async () => {
      setLoading(true);
      setError(null);
      setContacts([]);
      setContactsError(null);

      // 1) Utilisateur connecté
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

      // 2) Profil ouvrier
      const { data: worker, error: workerError } = await supabase
        .from("op_ouvriers")
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
        setLoading(false);
        return;
      }

      if (!worker) {
        setError(
          language === "fr"
            ? "Aucun profil ouvrier associé à ce compte. Merci de compléter votre inscription."
            : "No worker profile associated with this account. Please complete your registration."
        );
        setLoading(false);
        return;
      }

      const wp = worker as WorkerProfile;
      setProfile(wp);
      setLoading(false);

      // 3) Demandes de contact
      setContactsLoading(true);
      setContactsError(null);

      const { data: contactsData, error: contactsErr } = await supabase
        .from("op_ouvrier_contacts")
        .select(
          `
          id,
          worker_id,
          client_id,
          client_name,
          client_email,
          client_phone,
          message,
          status,
          origin,
          created_at
        `
        )
        .eq("worker_id", wp.id)
        .order("created_at", { ascending: false });

      if (!isMounted) return;

      if (contactsErr) {
        console.error(contactsErr);
        setContactsError(
          language === "fr"
            ? `Erreur lors du chargement de vos demandes : ${contactsErr.message}`
            : `Error while loading your requests: ${contactsErr.message}`
        );
      } else {
        setContacts((contactsData as WorkerContact[]) ?? []);
      }

      setContactsLoading(false);
    };

    fetchData();

    return () => {
      isMounted = false;
    };
  }, [language]);

  // Statistiques
  useEffect(() => {
    const loadStats = async () => {
      if (!profile || activeTab !== "stats") return;

      setStatsLoading(true);
      setStatsError(null);

      try {
        const { count, error } = await supabase
          .from("op_ouvrier_views")
          .select("*", { count: "exact", head: true })
          .eq("worker_id", profile.id);

        if (error) throw error;

        const views = count ?? 0;
        const totalRequests = contacts.length;
        const responded = contacts.filter(
          (c) => c.status === "in_progress" || c.status === "done"
        ).length;

        const rate =
          totalRequests > 0
            ? Math.round((responded / totalRequests) * 100)
            : 0;

        setProfileViews(views);
        setRequestsCount(totalRequests);
        setResponseRate(rate);
      } catch (e) {
        console.error("loadStats error", e);
        setStatsError(
          language === "fr"
            ? "Impossible de charger les statistiques."
            : "Unable to load statistics."
        );
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [activeTab, profile, contacts, language]);

  // Helpers d'affichage
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
    if (s === "rejected") return "bg-red-50 text-red-700 border-red-200";
    return "bg-amber-50 text-amber-700 border-amber-200";
  };

  const contactStatusLabel = (s: string | null | undefined) => {
    if (language === "fr") {
      if (s === "in_progress") return "En cours";
      if (s === "done") return "Traité";
      return "Nouveau";
    } else {
      if (s === "in_progress") return "In progress";
      if (s === "done") return "Done";
      return "New";
    }
  };

  const contactStatusClass = (s: string | null | undefined) => {
    if (s === "done")
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (s === "in_progress")
      return "bg-amber-50 text-amber-700 border-amber-200";
    return "bg-sky-50 text-sky-700 border-sky-200";
  };

  const originLabel = (o: string | null | undefined) => {
    if (!o || o === "web") return "web";
    if (o === "mobile") return "mobile";
    if (o === "other") return language === "fr" ? "autre" : "other";
    return o;
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

  // helper WhatsApp avec texte optionnel
  const phoneToWhatsappUrl = (phone?: string | null, text?: string) => {
    if (!phone) return "";
    const clean = phone.replace(/\s+/g, "");
    if (clean.length < 8) return "";
    const normalized = clean.startsWith("+") ? clean.slice(1) : clean;
    let url = `https://wa.me/${normalized}`;
    if (text && text.trim().length > 0) {
      url += `?text=${encodeURIComponent(text)}`;
    }
    return url;
  };

  // Copier la réponse dans le presse-papiers
  const handleCopyReply = (contactId: string) => {
    const text = (replyDrafts[contactId] || "").trim();
    if (!text) {
      window.alert(
        language === "fr"
          ? "Aucune réponse à copier."
          : "No reply text to copy."
      );
      return;
    }

    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          window.alert(
            language === "fr"
              ? "Réponse copiée dans le presse-papiers."
              : "Reply copied to clipboard."
          );
        })
        .catch(() => {
          window.alert(
            language === "fr"
              ? "Impossible de copier automatiquement. Sélectionnez le texte et copiez-le manuellement."
              : "Could not copy automatically. Please select the text and copy it manually."
          );
        });
    } else {
      window.alert(
        language === "fr"
          ? "Copie automatique non disponible. Sélectionnez le texte et copiez-le manuellement."
          : "Automatic copy not available. Please select the text and copy it manually."
      );
    }
  };

  // Gestion édition profil
  const handleEditField = <K extends keyof WorkerProfile>(
    field: K,
    value: WorkerProfile[K]
  ) => {
    setEditProfile((prev) => (prev ? { ...prev, [field]: value } : prev));
  };

  const startEditProfile = () => {
    if (!profile) return;
    setEditProfile(profile);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);
    setIsEditingProfile(true);
  };

  const cancelEditProfile = () => {
    setEditProfile(null);
    setIsEditingProfile(false);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);
  };

  const saveProfile = async () => {
    if (!profile || !editProfile) return;

    setSavingProfile(true);
    setProfileUpdateError(null);
    setProfileUpdateSuccess(null);

    try {
      const payload = {
        first_name: editProfile.first_name,
        last_name: editProfile.last_name,
        phone: editProfile.phone,
        profession: editProfile.profession,
        description: editProfile.description,
        country: editProfile.country,
        region: editProfile.region,
        city: editProfile.city,
        commune: editProfile.commune,
        district: editProfile.district,
        hourly_rate: editProfile.hourly_rate,
        currency: editProfile.currency,
      };

      const { data: updated, error: updateError } = await supabase
        .from("op_ouvriers")
        .update(payload)
        .eq("id", profile.id)
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
        .maybeSingle();

      if (updateError || !updated) {
        console.error(updateError);
        setProfileUpdateError(
          language === "fr"
            ? "Impossible d'enregistrer les modifications."
            : "Unable to save your changes."
        );
      } else {
        const newProfile = updated as WorkerProfile;
        setProfile(newProfile);
        setEditProfile(newProfile);
        setProfileUpdateSuccess(
          language === "fr"
            ? "Profil mis à jour avec succès."
            : "Profile updated successfully."
        );
        setIsEditingProfile(false);
      }
    } catch (e) {
      console.error(e);
      setProfileUpdateError(
        language === "fr"
          ? "Une erreur est survenue lors de la mise à jour."
          : "An error occurred while updating your profile."
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // Gestion changement de plan
  const updatePlan = async (newPlan: WorkerProfile["plan_code"]) => {
    if (!profile) return;

    setUpdatingPlan(true);
    setPlanUpdateError(null);
    setPlanUpdateSuccess(null);

    try {
      const { data: updated, error: updateError } = await supabase
        .from("op_ouvriers")
        .update({ plan_code: newPlan })
        .eq("id", profile.id)
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
        .maybeSingle();

      if (updateError || !updated) {
        console.error(updateError);
        setPlanUpdateError(
          language === "fr"
            ? "Impossible de mettre à jour votre abonnement."
            : "Unable to update your subscription."
        );
      } else {
        const newProfile = updated as WorkerProfile;
        setProfile(newProfile);
        setPlanUpdateSuccess(
          language === "fr"
            ? "Abonnement mis à jour avec succès."
            : "Subscription updated successfully."
        );
      }
    } catch (e) {
      console.error(e);
      setPlanUpdateError(
        language === "fr"
          ? "Une erreur est survenue lors de la mise à jour de l'abonnement."
          : "An error occurred while updating the subscription."
      );
    } finally {
      setUpdatingPlan(false);
    }
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

  const displayProfile = isEditingProfile && editProfile ? editProfile : profile;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-5xl mx-auto px-4">
        {/* En-tête */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              {language === "fr" ? "Espace Ouvrier" : "Worker Dashboard"}
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
              {
                key: "stats" as TabKey,
                labelFr: "Statistiques",
                labelEn: "Stats",
              },
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
          {/* PROFIL */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-800">
                  {language === "fr" ? "Mon profil" : "My profile"}
                </h2>
                {!isEditingProfile ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={startEditProfile}
                  >
                    {language === "fr"
                      ? "Modifier mon profil"
                      : "Edit my profile"}
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={cancelEditProfile}
                      disabled={savingProfile}
                    >
                      {language === "fr" ? "Annuler" : "Cancel"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      onClick={saveProfile}
                      disabled={savingProfile}
                      className="bg-pro-blue hover:bg-blue-700"
                    >
                      {savingProfile
                        ? language === "fr"
                          ? "Enregistrement..."
                          : "Saving..."
                        : language === "fr"
                        ? "Enregistrer"
                        : "Save"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Messages de mise à jour */}
              {profileUpdateError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {profileUpdateError}
                </div>
              )}
              {profileUpdateSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                  {profileUpdateSuccess}
                </div>
              )}

              {/* Détails profil */}
              {!isEditingProfile && (
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
                  {profile.hourly_rate != null && (
                    <div>
                      <div className="text-xs text-slate-500">
                        {language === "fr"
                          ? "Tarif horaire déclaré"
                          : "Declared hourly rate"}
                      </div>
                      <div className="font-medium text-slate-900">
                        {profile.hourly_rate.toLocaleString()}{" "}
                        {profile.currency || ""}/h
                      </div>
                    </div>
                  )}
                </div>
              )}

              {isEditingProfile && displayProfile && (
                <div className="grid md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Prénom" : "First name"}
                    </div>
                    <Input
                      value={displayProfile.first_name ?? ""}
                      onChange={(e) =>
                        handleEditField("first_name", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Nom" : "Last name"}
                    </div>
                    <Input
                      value={displayProfile.last_name ?? ""}
                      onChange={(e) =>
                        handleEditField("last_name", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Métier principal" : "Main trade"}
                    </div>
                    <Input
                      value={displayProfile.profession ?? ""}
                      onChange={(e) =>
                        handleEditField("profession", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Téléphone" : "Phone"}
                    </div>
                    <Input
                      value={displayProfile.phone ?? ""}
                      onChange={(e) =>
                        handleEditField("phone", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Pays" : "Country"}
                    </div>
                    <Input
                      value={displayProfile.country ?? ""}
                      onChange={(e) =>
                        handleEditField("country", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Région" : "Region"}
                    </div>
                    <Input
                      value={displayProfile.region ?? ""}
                      onChange={(e) =>
                        handleEditField("region", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Ville" : "City"}
                    </div>
                    <Input
                      value={displayProfile.city ?? ""}
                      onChange={(e) =>
                        handleEditField("city", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Commune" : "Commune"}
                    </div>
                    <Input
                      value={displayProfile.commune ?? ""}
                      onChange={(e) =>
                        handleEditField("commune", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Quartier" : "District"}
                    </div>
                    <Input
                      value={displayProfile.district ?? ""}
                      onChange={(e) =>
                        handleEditField("district", e.target.value)
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr"
                        ? "Tarif horaire (GNF)"
                        : "Hourly rate (GNF)"}
                    </div>
                    <Input
                      type="number"
                      value={
                        displayProfile.hourly_rate != null
                          ? String(displayProfile.hourly_rate)
                          : ""
                      }
                      onChange={(e) =>
                        handleEditField(
                          "hourly_rate",
                          e.target.value
                            ? Number(e.target.value)
                            : (null as any)
                        )
                      }
                    />
                  </div>
                  <div>
                    <div className="text-xs text-slate-500">
                      {language === "fr" ? "Devise" : "Currency"}
                    </div>
                    <Input
                      value={displayProfile.currency ?? ""}
                      onChange={(e) =>
                        handleEditField("currency", e.target.value)
                      }
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="text-xs text-slate-500">
                      {language === "fr"
                        ? "Description de vos services"
                        : "Services description"}
                    </div>
                    <Textarea
                      rows={4}
                      value={displayProfile.description ?? ""}
                      onChange={(e) =>
                        handleEditField("description", e.target.value)
                      }
                    />
                  </div>
                </div>
              )}

              {/* Statut + date création */}
              <div className="mt-2 flex flex-wrap gap-2 items-center">
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

              {/* Photos + portfolio */}
              <div className="pt-4 border-t border-slate-100 space-y-4">
                <WorkerPhotosManager workerId={profile.id} />
                <WorkerPortfolioManager workerId={profile.id} />
              </div>
            </div>
          )}

          {/* ABONNEMENT */}
          {activeTab === "subscription" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                {language === "fr"
                  ? "Mon abonnement"
                  : "My subscription"}
              </h2>

              {planUpdateError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {planUpdateError}
                </div>
              )}
              {planUpdateSuccess && (
                <div className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                  {planUpdateSuccess}
                </div>
              )}

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
                      {profile.currency || ""}/h
                    </div>
                  </div>
                )}

                {/* Actions changement de plan */}
                <div className="pt-3 border-t border-slate-100 mt-3 flex flex-wrap gap-2">
                  {profile.plan_code !== "FREE" && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={updatingPlan}
                      onClick={() => updatePlan("FREE")}
                    >
                      {updatingPlan && profile.plan_code === "FREE"
                        ? language === "fr"
                          ? "Mise à jour..."
                          : "Updating..."
                        : language === "fr"
                        ? "Revenir au plan Gratuit"
                        : "Switch to Free"}
                    </Button>
                  )}

                  {profile.plan_code !== "MONTHLY" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={updatingPlan}
                      className="bg-pro-blue hover:bg-blue-700"
                      onClick={() => updatePlan("MONTHLY")}
                    >
                      {updatingPlan && profile.plan_code === "MONTHLY"
                        ? language === "fr"
                          ? "Mise à jour..."
                          : "Updating..."
                        : language === "fr"
                        ? "Passer au plan Mensuel"
                        : "Switch to Monthly"}
                    </Button>
                  )}

                  {profile.plan_code !== "YEARLY" && (
                    <Button
                      type="button"
                      size="sm"
                      disabled={updatingPlan}
                      className="bg-amber-500 hover:bg-amber-600"
                      onClick={() => updatePlan("YEARLY")}
                    >
                      {updatingPlan && profile.plan_code === "YEARLY"
                        ? language === "fr"
                          ? "Mise à jour..."
                          : "Updating..."
                        : language === "fr"
                        ? "Passer au plan Annuel"
                        : "Switch to Yearly"}
                    </Button>
                  )}
                </div>

                <div className="mt-4 text-xs text-slate-500">
                  {language === "fr"
                    ? "Pour l’instant, le changement de plan ne déclenche pas encore de paiement automatique. Vous pourrez connecter Stripe ou un autre moyen de paiement plus tard côté back-office."
                    : "For now, changing plan does not trigger automatic payment yet. You can connect Stripe or another payment gateway later on the back office."}
                </div>
              </div>
            </div>
          )}

          {/* STATS */}
          {activeTab === "stats" && (
            <div className="space-y-4">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">
                {language === "fr"
                  ? "Statistiques personnelles"
                  : "Personal stats"}
              </h2>

              {statsError && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                  {statsError}
                </div>
              )}

              <p className="text-xs text-slate-500 mb-2">
                {language === "fr"
                  ? "Suivez les vues de votre profil, le nombre de demandes reçues et votre taux de réponse."
                  : "Track your profile views, number of requests received and response rate."}
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                {/* Vues du profil */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-xs text-slate-500">
                    {language === "fr" ? "Vues du profil" : "Profile views"}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {statsLoading ? "…" : profileViews}
                  </div>
                </div>

                {/* Demandes reçues */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-xs text-slate-500">
                    {language === "fr"
                      ? "Demandes reçues"
                      : "Requests received"}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {statsLoading ? "…" : requestsCount}
                  </div>
                </div>

                {/* Taux de réponse */}
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
                  <div className="text-xs text-slate-500">
                    {language === "fr"
                      ? "Taux de réponse"
                      : "Response rate"}
                  </div>
                  <div className="text-2xl font-bold text-slate-900 mt-1">
                    {statsLoading
                      ? "…"
                      : requestsCount > 0
                      ? `${responseRate}%`
                      : "—"}
                  </div>
                  {requestsCount > 0 && !statsLoading && (
                    <div className="text-[11px] text-slate-500 mt-1">
                      {language === "fr"
                        ? `${responseRate}% des demandes marquées comme "En cours" ou "Traité".`
                        : `${responseRate}% of requests marked as "In progress" or "Done".`}
                    </div>
                  )}
                </div>
              </div>

              <div className="text-xs text-slate-500">
                {language === "fr"
                  ? "Ces chiffres sont calculés à partir des vues (table op_ouvrier_views) et des demandes reçues (op_ouvrier_contacts)."
                  : "These figures are based on views (table op_ouvrier_views) and received requests (op_ouvrier_contacts)."}
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {activeTab === "messages" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    {language === "fr"
                      ? "Messages reçus"
                      : "Received messages"}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {language === "fr"
                      ? "Répondez directement depuis cet espace : tapez votre message, puis envoyez-le par téléphone, WhatsApp, e-mail, formulaire interne ou copiez-le."
                      : "Reply directly from here: type your message, then send it via phone, WhatsApp, e-mail, internal form or copy it."}
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                  {language === "fr" ? "Total" : "Total"} :{" "}
                  <span className="ml-1 font-semibold">
                    {contacts.length}
                  </span>
                </span>
              </div>

              {contactsLoading && (
                <div className="text-sm text-slate-500">
                  {language === "fr"
                    ? "Chargement de vos demandes..."
                    : "Loading your requests..."}
                </div>
              )}

              {contactsError && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {contactsError}
                </div>
              )}

              {!contactsLoading && !contactsError && contacts.length === 0 && (
                <div className="text-sm text-slate-500">
                  {language === "fr"
                    ? "Vous n’avez pas encore reçu de demandes de contact."
                    : "You haven't received any contact requests yet."}
                </div>
              )}

              {!contactsLoading && !contactsError && contacts.length > 0 && (
                <ul className="space-y-4">
                  {contacts.map((c) => {
                    const replyDraft = replyDrafts[c.id] || "";

                    const emailSubject =
                      language === "fr"
                        ? "Réponse à votre demande via OuvriersPro"
                        : "Reply to your request via OuvriersPro";

                    const emailBody =
                      replyDraft.trim().length > 0
                        ? replyDraft
                        : language === "fr"
                        ? "Bonjour,\n\nJe fais suite à votre demande."
                        : "Hello,\n\nI am following up on your request.";

                    const emailHref = c.client_email
                      ? `mailto:${c.client_email}?subject=${encodeURIComponent(
                          emailSubject
                        )}&body=${encodeURIComponent(emailBody)}`
                      : "";

                    const whatsappUrl = phoneToWhatsappUrl(
                      c.client_phone,
                      replyDraft || undefined
                    );

                    // URL du profil client et du formulaire interne
                    // À adapter à tes vraies routes (ex: /clients/:id, /clients/:id/contact)
                    const clientProfileUrl = c.client_id
                      ? `/clients/${c.client_id}`
                      : null;
                    const clientFormUrl = c.client_id
                      ? `/clients/${c.client_id}/contact`
                      : null;

                    const initials =
                      (c.client_name || "—")
                        .split(" ")
                        .filter(Boolean)
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase() || "—";

                    return (
                      <li key={c.id}>
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-4 shadow-sm hover:bg-slate-50 transition">
                          <div className="flex gap-3 flex-1">
                            {/* Avatar */}
                            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-pro-blue/10 text-pro-blue text-xs font-semibold shrink-0">
                              {initials !== "—" ? (
                                initials
                              ) : (
                                <User className="w-4 h-4" />
                              )}
                            </div>

                            <div className="flex-1 space-y-2">
                              {/* En-tête message */}
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <div className="text-sm font-semibold text-slate-800">
                                      {c.client_name || "—"}
                                    </div>
                                    <span className="text-[11px] text-slate-400">
                                      {formatDate(c.created_at)} •{" "}
                                      {originLabel(c.origin)}
                                    </span>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-0.5">
                                    {c.client_email && (
                                      <span className="inline-flex items-center gap-1">
                                        <Mail className="w-3 h-3" />
                                        {c.client_email}
                                      </span>
                                    )}
                                    {c.client_phone && (
                                      <span className="inline-flex items-center gap-1">
                                        <Phone className="w-3 h-3" />
                                        {c.client_phone}
                                      </span>
                                    )}
                                  </div>

                                  {/* Actions liées au profil client (si client_id présent) */}
                                  {c.client_id && (
                                    <div className="mt-1 flex flex-wrap gap-2 text-xs">
                                      <Button
                                        variant="ghost"
                                        size="xs"
                                        asChild
                                      >
                                        <a
                                          href={clientProfileUrl!}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {language === "fr"
                                            ? "Voir le profil client"
                                            : "View client profile"}
                                        </a>
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="xs"
                                        asChild
                                      >
                                        <a
                                          href={clientFormUrl!}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          {language === "fr"
                                            ? "Contacter via le formulaire"
                                            : "Contact via form"}
                                        </a>
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Message client */}
                              {c.message && (
                                <div className="mt-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 whitespace-pre-line">
                                  {c.message}
                                </div>
                              )}

                              {/* Bloc réponse rapide + boutons */}
                              <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className="text-xs font-medium text-slate-600">
                                    {language === "fr"
                                      ? "Votre réponse rapide"
                                      : "Quick reply"}
                                  </span>
                                  <span className="text-[11px] text-slate-400">
                                    {language === "fr"
                                      ? "Non envoyée automatiquement"
                                      : "Not sent automatically"}
                                  </span>
                                </div>
                                <Textarea
                                  rows={2}
                                  value={replyDraft}
                                  onChange={(e) =>
                                    setReplyDrafts((prev) => ({
                                      ...prev,
                                      [c.id]: e.target.value,
                                    }))
                                  }
                                  className="text-sm"
                                  placeholder={
                                    language === "fr"
                                      ? "Tapez ici votre réponse…"
                                      : "Type your answer here…"
                                  }
                                />

                                <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                                  <div className="text-[11px] text-slate-400">
                                    {!c.client_email && !c.client_phone && !c.client_id
                                      ? language === "fr"
                                        ? "Ce client n’a pas laissé d’e-mail ni de téléphone. Copiez le texte pour l’envoyer par le canal de votre choix."
                                        : "This client did not leave any e-mail or phone. Copy the text and send it via any channel you prefer."
                                      : language === "fr"
                                      ? "Envoyez votre réponse par le canal de votre choix (WhatsApp, e-mail, téléphone ou formulaire)."
                                      : "Send your reply using your preferred channel (WhatsApp, e-mail, phone or form)."}
                                  </div>
                                  <div className="flex flex-wrap justify-end gap-2 mt-1 sm:mt-0">
                                    {/* Copier toujours disponible */}
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="xs"
                                      onClick={() => handleCopyReply(c.id)}
                                    >
                                      <Copy className="w-3 h-3 mr-1" />
                                      {language === "fr"
                                        ? "Copier la réponse"
                                        : "Copy reply"}
                                    </Button>

                                    {c.client_phone && (
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        asChild
                                      >
                                        <a href={`tel:${c.client_phone}`}>
                                          <Phone className="w-3 h-3 mr-1" />
                                          {language === "fr"
                                            ? "Appeler"
                                            : "Call"}
                                        </a>
                                      </Button>
                                    )}
                                    {whatsappUrl && (
                                      <Button
                                        variant="outline"
                                        size="xs"
                                        asChild
                                      >
                                        <a
                                          href={whatsappUrl}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                        >
                                          <MessageCircle className="w-3 h-3 mr-1" />
                                          WhatsApp
                                        </a>
                                      </Button>
                                    )}
                                    {emailHref && (
                                      <Button size="xs" asChild>
                                        <a href={emailHref}>
                                          <Mail className="w-3 h-3 mr-1" />
                                          {language === "fr"
                                            ? "Envoyer par e-mail"
                                            : "Send by e-mail"}
                                        </a>
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Statut à droite */}
                          <div className="flex items-start justify-end">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full border ${contactStatusClass(
                                c.status
                              )}`}
                            >
                              {contactStatusLabel(c.status)}
                            </span>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="text-xs text-slate-500">
                {language === "fr"
                  ? "Ces demandes sont directement liées à votre profil ouvrier (table op_ouvrier_contacts filtrée sur worker_id)."
                  : "These requests are directly linked to your worker profile (table op_ouvrier_contacts filtered by worker_id)."}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkerDashboard;
