// src/pages/ClientProfile.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { User, ArrowLeft, Save } from "lucide-react";

type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  country: string | null;
  city: string | null;
  preferred_contact: string | null;
};

const ClientProfile: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const t = {
    title: language === "fr" ? "Mon profil client" : "My client profile",
    subtitle:
      language === "fr"
        ? "Mettez à jour vos coordonnées pour être facilement recontacté par les ouvriers."
        : "Update your contact details so workers can easily reach you.",
    mainInfo: language === "fr" ? "Informations principales" : "Main information",
    contactInfo:
      language === "fr" ? "Coordonnées de contact" : "Contact information",
    emailLabel: "Email",
    fullNameLabel: language === "fr" ? "Nom complet" : "Full name",
    phoneLabel: language === "fr" ? "Téléphone" : "Phone",
    countryLabel: language === "fr" ? "Pays" : "Country",
    cityLabel: language === "fr" ? "Ville" : "City",
    preferredContactLabel:
      language === "fr"
        ? "Préférences de contact"
        : "Contact preferences",
    preferredContactPlaceholder:
      language === "fr"
        ? "Ex : Contact de préférence par WhatsApp en soirée…"
        : "e.g. Prefer to be contacted by WhatsApp in the evening…",
    save: language === "fr" ? "Enregistrer" : "Save",
    saving: language === "fr" ? "Enregistrement..." : "Saving...",
    back: language === "fr" ? "Retour à mon espace" : "Back to my space",
    success:
      language === "fr"
        ? "Profil mis à jour avec succès."
        : "Profile updated successfully.",
    errorLoad:
      language === "fr"
        ? "Impossible de charger votre profil."
        : "Unable to load your profile.",
    errorSave:
      language === "fr"
        ? "Erreur lors de l’enregistrement de votre profil."
        : "Error while saving your profile.",
  };

  // Charger le profil
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        if (authError || !authData?.user) {
          throw authError || new Error("No user");
        }

        const userId = authData.user.id;

        const { data, error } = await supabase
          .from("op_users")
          .select(
            "id, email, full_name, phone, country, city, preferred_contact"
          )
          .eq("id", userId)
          .maybeSingle();

        if (error || !data) {
          throw error || new Error("Profile not found");
        }

        setProfile(data as Profile);
      } catch (err) {
        console.error(err);
        setError(t.errorLoad);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setProfile((prev) => (prev ? { ...prev, [name]: value } : prev));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from("op_users")
        .update({
          full_name: profile.full_name,
          phone: profile.phone,
          country: profile.country,
          city: profile.city,
          preferred_contact: profile.preferred_contact,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) throw error;

      setSuccess(t.success);
    } catch (err) {
      console.error(err);
      setError(t.errorSave);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr" ? "Chargement du profil..." : "Loading profile..."}
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-red-600">{t.errorLoad}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-10">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 text-slate-600"
            onClick={() => navigate("/espace-client")}
          >
            <ArrowLeft className="w-4 h-4" />
            {t.back}
          </Button>

          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-pro-blue/10 flex items-center justify-center">
              <User className="w-4 h-4 text-pro-blue" />
            </div>
            <div>
              <h1 className="text-lg md:text-xl font-semibold text-slate-900">
                {t.title}
              </h1>
              <p className="text-xs md:text-sm text-slate-600">
                {t.subtitle}
              </p>
            </div>
          </div>
        </div>

        <Card className="p-6 md:p-7 rounded-2xl bg-white/90 shadow-sm border-slate-200 space-y-6">
          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          {success && (
            <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-md px-3 py-2">
              {success}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {/* Bloc infos principales */}
            <div>
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                {t.mainInfo}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.fullNameLabel}
                  </label>
                  <Input
                    name="full_name"
                    value={profile.full_name ?? ""}
                    onChange={handleChange}
                    placeholder={
                      language === "fr"
                        ? "Ex : Mamadou Diallo"
                        : "e.g. John Doe"
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.emailLabel}
                  </label>
                  <Input
                    value={profile.email ?? ""}
                    disabled
                    className="bg-slate-50 cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            {/* Bloc coordonnées */}
            <div>
              <h2 className="text-sm font-semibold text-slate-800 mb-3">
                {t.contactInfo}
              </h2>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.phoneLabel}
                  </label>
                  <Input
                    name="phone"
                    value={profile.phone ?? ""}
                    onChange={handleChange}
                    placeholder="+224 6X XX XX XX"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.countryLabel}
                  </label>
                  <Input
                    name="country"
                    value={profile.country ?? ""}
                    onChange={handleChange}
                    placeholder={
                      language === "fr" ? "Ex : Guinée" : "e.g. Guinea"
                    }
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    {t.cityLabel}
                  </label>
                  <Input
                    name="city"
                    value={profile.city ?? ""}
                    onChange={handleChange}
                    placeholder={
                      language === "fr" ? "Ex : Conakry" : "e.g. Conakry"
                    }
                  />
                </div>
              </div>
            </div>

            {/* Préférences de contact */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                {t.preferredContactLabel}
              </label>
              <Textarea
                name="preferred_contact"
                value={profile.preferred_contact ?? ""}
                onChange={handleChange}
                rows={3}
                placeholder={t.preferredContactPlaceholder}
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                disabled={saving}
                className="rounded-full px-5"
              >
                {saving ? (
                  <>
                    <Save className="w-4 h-4 mr-2 animate-pulse" />
                    {t.saving}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    {t.save}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default ClientProfile;
