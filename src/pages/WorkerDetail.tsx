// src/pages/WorkerDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Star, ArrowLeft } from "lucide-react";

type DbWorker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  description: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  hourly_rate: number | null;
  currency: string | null;
  years_experience: number | null;
  average_rating: number | null;
  rating_count: number | null;
  phone: string | null;
  email: string | null;
};

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const WorkerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [worker, setWorker] = useState<DbWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 🔹 Chargement de l'ouvrier
  useEffect(() => {
    const fetchWorker = async () => {
      if (!id) {
        setError("missing-id");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from("op_ouvriers")
        .select(
          `
          id,
          first_name,
          last_name,
          profession,
          description,
          country,
          region,
          city,
          commune,
          district,
          hourly_rate,
          currency,
          years_experience,
          average_rating,
          rating_count,
          phone,
          email
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (error || !data) {
        console.error(error);
        setError("load-failed");
        setLoading(false);
        return;
      }

      setWorker(data);
      setLoading(false);
    };

    fetchWorker();
  }, [id]);

  const formatCurrency = (
    value: number | null | undefined,
    currency?: string | null
  ) => {
    if (!value) return "—";
    const cur = currency || "GNF";
    if (cur === "GNF") {
      return `${value.toLocaleString("fr-FR")} GNF`;
    }
    return `${value} ${cur}`;
  };

  const text = {
    back: language === "fr" ? "Retour aux résultats" : "Back to results",
    notFound:
      language === "fr"
        ? "Impossible de charger ce professionnel."
        : "Unable to load this professional.",
    contactTitle:
      language === "fr" ? "Contacter cet ouvrier" : "Contact this worker",
    contactSubtitle:
      language === "fr"
        ? "Expliquez brièvement votre besoin, il vous répondra directement."
        : "Briefly explain your need, they will contact you back.",
    yourName: language === "fr" ? "Votre nom" : "Your name",
    yourEmail: language === "fr" ? "Votre email" : "Your email",
    yourPhone: language === "fr" ? "Votre téléphone" : "Your phone",
    yourMessage: language === "fr" ? "Votre message" : "Your message",
    send: language === "fr" ? "Envoyer la demande" : "Send request",
    sending: language === "fr" ? "Envoi en cours..." : "Sending...",
    success:
      language === "fr"
        ? "Votre demande a bien été envoyée. L’ouvrier vous contactera directement."
        : "Your request has been sent. The worker will contact you directly.",
    error:
      language === "fr"
        ? "Une erreur est survenue lors de l’envoi de votre demande."
        : "An error occurred while sending your request.",
    locationLabel:
      language === "fr" ? "Zone d’intervention" : "Location",
    experience:
      language === "fr" ? "ans d'expérience" : "years of experience",
    rating: language === "fr" ? "Note moyenne" : "Average rating",
    perHour: language === "fr" ? "/h" : "/h",
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // 🔹 Envoi du formulaire avec origin = 'web'
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;

    setSending(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const fullWorkerName = `${worker.first_name ?? ""} ${
      worker.last_name ?? ""
    }`.trim();

    const { error } = await supabase.from("op_ouvrier_contacts").insert([{
      worker_id: worker.id,
      worker_name: fullWorkerName || null,
      client_name: form.name,
      client_email: form.email,
      client_phone: form.phone,
      message: form.message,
      full_name: form.name,
      status: "new",
      origin: "web", // ✅ toutes les demandes venant du site seront marquées "web"
    }]);

    if (error) {
      console.error(error);
      setErrorMsg(text.error);
    } else {
      setSuccessMsg(text.success);
      setForm({
        name: "",
        email: "",
        phone: "",
        message: "",
      });
    }

    setSending(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr" ? "Chargement..." : "Loading..."}
        </div>
      </div>
    );
  }

  if (!worker || error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-3xl mx-auto px-4 py-10">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-pro-blue text-sm mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {text.back}
          </button>
          <div className="bg-white rounded-xl border border-red-200 text-red-600 p-6">
            {text.notFound}
          </div>
        </div>
      </div>
    );
  }

  const fullName = `${worker.first_name ?? ""} ${
    worker.last_name ?? ""
  }`.trim();

  const locationParts = [
    worker.region,
    worker.city,
    worker.commune,
    worker.district,
  ]
    .filter(Boolean)
    .join(" • ");

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-pro-blue text-sm mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          {text.back}
        </Link>

        <div className="grid gap-8 md:grid-cols-[2fr,1.5fr] items-start">
          {/* Fiche ouvrier */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-pro-blue text-white flex items-center justify-center text-lg font-semibold">
                {(fullName || "O")
                  .split(" ")
                  .filter(Boolean)
                  .map((n) => n[0])
                  .join("")}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {fullName || "—"}
                </h1>
                {worker.profession && (
                  <div className="text-pro-blue text-sm font-medium mt-1">
                    {worker.profession}
                  </div>
                )}
                {locationParts && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-600">
                    <MapPin className="w-3 h-3" />
                    {locationParts}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap gap-4 text-sm text-slate-700 mb-4">
              <div>
                <div className="text-xs text-slate-500">{text.rating}</div>
                <div className="flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span className="font-semibold">
                    {worker.average_rating?.toFixed(1) || "—"}
                  </span>
                  {worker.rating_count != null && (
                    <span className="text-xs text-slate-500">
                      ({worker.rating_count})
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">
                  {language === "fr" ? "Expérience" : "Experience"}
                </div>
                <div className="font-semibold">
                  {worker.years_experience || 0} {text.experience}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500">
                  {language === "fr" ? "Tarif horaire" : "Hourly rate"}
                </div>
                <div className="font-semibold text-pro-blue">
                  {formatCurrency(worker.hourly_rate, worker.currency)}
                  <span className="ml-1 text-xs text-slate-600">
                    {text.perHour}
                  </span>
                </div>
              </div>
            </div>

            {worker.description && (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <h2 className="text-sm font-semibold text-slate-800 mb-1">
                  {language === "fr" ? "Présentation" : "About"}
                </h2>
                <p className="text-sm text-slate-700 whitespace-pre-line">
                  {worker.description}
                </p>
              </div>
            )}
          </section>

          {/* Formulaire de contact */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {text.contactTitle}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {text.contactSubtitle}
            </p>

            {successMsg && (
              <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
                {successMsg}
              </div>
            )}

            {errorMsg && (
              <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {text.yourName}
                </label>
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {text.yourEmail}
                </label>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {text.yourPhone}
                </label>
                <Input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {text.yourMessage}
                </label>
                <Textarea
                  name="message"
                  value={form.message}
                  onChange={handleChange}
                  required
                  rows={5}
                  className="text-sm"
                />
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-pro-blue hover:bg-blue-700"
              >
                {sending ? text.sending : text.send}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetail;
