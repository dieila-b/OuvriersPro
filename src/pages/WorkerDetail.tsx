import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  ArrowLeft,
  MapPin,
  Star,
  Phone,
  MessageCircle,
} from "lucide-react";

type DbWorker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  phone: string | null;
  email: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  description: string | null;
  hourly_rate: number | null;
  currency: string | null;
  years_experience: number | null;
  average_rating: number | null;
  rating_count: number | null;
};

interface ContactFormState {
  fullName: string;
  email: string;
  phone: string;
  message: string;
}

const normalizePhoneForWhatsApp = (phone: string) =>
  phone.replace(/[^\d]/g, "");

const formatCurrency = (value: number | null, currency: string | null) => {
  if (!value) return "";
  const cur = currency || "GNF";
  if (cur === "GNF") {
    return `${value.toLocaleString("fr-FR")} GNF`;
  }
  return `${value} ${cur}`;
};

const WorkerDetail: React.FC = () => {
  const { t, language } = useLanguage();
  const { id } = useParams<{ id: string }>();

  const [worker, setWorker] = useState<DbWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [contactForm, setContactForm] = useState<ContactFormState>({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // 🔹 Charger l’ouvrier depuis Supabase
  useEffect(() => {
    const fetchWorker = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from<DbWorker>("op_ouvriers")
        .select(
          `
          id,
          first_name,
          last_name,
          profession,
          phone,
          email,
          country,
          region,
          city,
          commune,
          district,
          description,
          hourly_rate,
          currency,
          years_experience,
          average_rating,
          rating_count
        `
        )
        .eq("id", id)
        .eq("status", "approved")
        .single();

      if (error || !data) {
        console.error(error);
        setError(
          language === "fr"
            ? "Impossible de charger ce professionnel."
            : "Unable to load this professional."
        );
      } else {
        setWorker(data);
      }

      setLoading(false);
    };

    fetchWorker();
  }, [id, language]);

  const handleChangeContact =
    (field: keyof ContactFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setContactForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  // 🔹 Envoi d’une demande de contact
  const handleSubmitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker || !id) return;

    setSending(true);
    setError(null);
    setSent(false);

    try {
      const { error } = await supabase.from("op_ouvrier_contacts").insert({
        worker_id: id,
        full_name: contactForm.fullName,
        email: contactForm.email || null,
        phone: contactForm.phone || null,
        message: contactForm.message,
      });

      if (error) {
        console.error(error);
        throw error;
      }

      setSent(true);
      setContactForm({
        fullName: "",
        email: "",
        phone: "",
        message: "",
      });
    } catch (err: any) {
      setError(
        language === "fr"
          ? "Impossible d’envoyer votre message pour le moment."
          : "Unable to send your message at the moment."
      );
    } finally {
      setSending(false);
    }
  };

  const text = {
    back:
      language === "fr"
        ? "Retour aux résultats"
        : "Back to results",
    years:
      language === "fr"
        ? "ans d'expérience"
        : "years of experience",
    contactTitle:
      language === "fr"
        ? "Contacter ce professionnel"
        : "Contact this professional",
    fullName:
      language === "fr" ? "Votre nom complet" : "Your full name",
    email: "Email",
    phone: language === "fr" ? "Téléphone" : "Phone",
    messageLabel:
      language === "fr"
        ? "Votre besoin / message"
        : "Your request / message",
    send:
      language === "fr" ? "Envoyer le message" : "Send message",
    sent:
      language === "fr"
        ? "Votre message a bien été envoyé. Nous vous répondrons au plus vite."
        : "Your message has been sent. The worker will get back to you soon.",
    call:
      language === "fr" ? "Appeler" : "Call",
    whatsapp:
      language === "fr" ? "WhatsApp" : "WhatsApp",
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-5xl mx-auto px-4">
          <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
          <div className="h-40 w-full bg-gray-200 rounded mb-4" />
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <Link
            to="/#search"
            className="inline-flex items-center text-sm text-pro-blue mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {text.back}
          </Link>
          <Card>
            <CardContent className="py-6 text-red-600">
              {error ||
                (language === "fr"
                  ? "Ce professionnel n’est pas disponible."
                  : "This professional is not available.")}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const fullName =
    (worker.first_name || "") +
    (worker.last_name ? ` ${worker.last_name}` : "");

  const locationParts = [
    worker.region,
    worker.city,
    worker.commune,
    worker.district,
  ].filter(Boolean);

  const telHref = worker.phone ? `tel:${worker.phone}` : undefined;
  const waHref = worker.phone
    ? `https://wa.me/${normalizePhoneForWhatsApp(worker.phone)}`
    : undefined;

  return (
    <div className="min-h-screen bg-gray-50 py-10">
      <div className="max-w-5xl mx-auto px-4 space-y-6">
        {/* Lien retour */}
        <div className="flex items-center justify-between">
          <Link
            to="/#search"
            className="inline-flex items-center text-sm text-pro-blue hover:underline"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {text.back}
          </Link>
        </div>

        {/* Bloc profil */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-pro-blue text-white flex items-center justify-center text-lg font-semibold">
                {fullName
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-pro-gray">
                  {fullName}
                </CardTitle>
                {worker.profession && (
                  <div className="text-pro-blue font-medium text-sm">
                    {worker.profession}
                  </div>
                )}
                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs md:text-sm text-gray-600">
                  {locationParts.length > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {locationParts.join(" • ")}
                    </span>
                  )}
                  {worker.average_rating !== null && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="w-3 h-3 text-yellow-400" />
                      {worker.average_rating.toFixed(1)} (
                      {worker.rating_count ?? 0})
                    </span>
                  )}
                  {worker.years_experience !== null && (
                    <span>
                      {worker.years_experience} {text.years}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Tarif + actions rapides */}
            <div className="flex flex-col items-end gap-2">
              {worker.hourly_rate && (
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    {language === "fr"
                      ? "Tarif indicatif"
                      : "Indicative rate"}
                  </div>
                  <div className="text-lg font-bold text-pro-blue">
                    {formatCurrency(worker.hourly_rate, worker.currency)}
                    <span className="text-xs text-gray-600 ml-1">
                      {language === "fr" ? "/heure" : "/hour"}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {telHref && (
                  <a href={telHref}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <Phone className="w-4 h-4" />
                      {text.call}
                    </Button>
                  </a>
                )}
                {waHref && (
                  <a href={waHref} target="_blank" rel="noreferrer">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {text.whatsapp}
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {worker.description && (
              <div>
                <h3 className="text-sm font-semibold text-pro-gray mb-1">
                  {language === "fr"
                    ? "Présentation"
                    : "About"}
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                  {worker.description}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Formulaire de contact */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-pro-blue" />
              {text.contactTitle}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitContact} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {text.fullName}
                  </label>
                  <Input
                    required
                    value={contactForm.fullName}
                    onChange={handleChangeContact("fullName")}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {text.email}
                  </label>
                  <Input
                    type="email"
                    value={contactForm.email}
                    onChange={handleChangeContact("email")}
                    placeholder="vous@exemple.com"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {text.phone}
                </label>
                <Input
                  value={contactForm.phone}
                  onChange={handleChangeContact("phone")}
                  placeholder="+224 6X XX XX XX"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  {text.messageLabel}
                </label>
                <textarea
                  required
                  value={contactForm.message}
                  onChange={handleChangeContact("message")}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue min-h-[120px]"
                  placeholder={
                    language === "fr"
                      ? "Décrivez votre besoin, vos disponibilités, le lieu d’intervention…"
                      : "Describe your request, availability and location…"
                  }
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </div>
              )}

              {sent && (
                <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
                  {text.sent}
                </div>
              )}

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={sending}
                  className="bg-pro-blue hover:bg-blue-700"
                >
                  {sending
                    ? language === "fr"
                      ? "Envoi en cours..."
                      : "Sending..."
                    : text.send}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerDetail;
