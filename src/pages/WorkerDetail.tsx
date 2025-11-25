// src/pages/WorkerDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin,
  Star,
  ArrowLeft,
  Phone,
  Mail,
  MessageCircle,
  FileText,
  Send,
  Info,
  Lock,
} from "lucide-react";

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
  requestType: "devis" | "info" | "urgence";
  budget: string;
  preferredDate: string;
  consent: boolean;
};

const WorkerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();

  // 🔐 Auth
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // 👷 Données ouvrier
  const [worker, setWorker] = useState<DbWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 📨 Formulaire
  const [form, setForm] = useState<ContactForm>({
    name: "",
    email: "",
    phone: "",
    message: "",
    requestType: "devis",
    budget: "",
    preferredDate: "",
    consent: false,
  });
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // -------------------------
  // 🔐 Vérifier que l’utilisateur est connecté
  // -------------------------
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        if (data?.user) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
        }
      } catch (e) {
        console.error("Auth check error:", e);
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    };

    checkAuth();
  }, []);

  // -------------------------
  // 👷 Charger l’ouvrier (uniquement si connecté)
  // -------------------------
  useEffect(() => {
    const fetchWorker = async () => {
      if (!id) {
        setError("missing-id");
        setLoading(false);
        return;
      }
      if (!isAuthenticated) {
        // on ne charge rien si non connecté
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

      setWorker(data as DbWorker);
      setLoading(false);
    };

    // on ne lance le fetch que si l’auth a été vérifiée
    if (authChecked && isAuthenticated) {
      fetchWorker();
    }
  }, [id, authChecked, isAuthenticated]);

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
    experience:
      language === "fr" ? "ans d'expérience" : "years of experience",
    rating: language === "fr" ? "Note moyenne" : "Average rating",
    perHour: language === "fr" ? "/h" : "/h",
    contactInfos:
      language === "fr" ? "Coordonnées directes" : "Direct contact details",
    phoneLabel: language === "fr" ? "Téléphone" : "Phone",
    emailLabel: language === "fr" ? "Email" : "Email",
    whatsappLabel:
      language === "fr" ? "WhatsApp (même numéro)" : "WhatsApp (same number)",
    quickActions:
      language === "fr" ? "Actions rapides" : "Quick actions",
    callBtn: language === "fr" ? "Appeler" : "Call",
    whatsappBtn: language === "fr" ? "WhatsApp" : "WhatsApp",
    emailBtn:
      language === "fr" ? "Envoyer un e-mail" : "Send an email",
    devisBtn:
      language === "fr" ? "Pré-remplir une demande de devis" : "Pre-fill quote request",
    requestTypeLabel:
      language === "fr" ? "Type de demande" : "Request type",
    requestTypeDevis:
      language === "fr" ? "Demande de devis" : "Quote request",
    requestTypeInfo:
      language === "fr" ? "Demande d’informations" : "Information request",
    requestTypeUrgence:
      language === "fr" ? "Intervention urgente" : "Emergency",
    budgetLabel:
      language === "fr"
        ? "Budget approximatif (facultatif)"
        : "Approximate budget (optional)",
    dateLabel:
      language === "fr"
        ? "Date souhaitée (facultatif)"
        : "Desired date (optional)",
    consentLabel:
      language === "fr"
        ? "J’accepte que mes coordonnées soient transmises à cet ouvrier pour être recontacté."
        : "I agree that my contact details may be shared with this worker to be contacted back.",
    privacyNote:
      language === "fr"
        ? "Vos coordonnées sont transmises uniquement à cet ouvrier pour la gestion de votre demande."
        : "Your contact details are shared only with this worker to handle your request.",
    // Textes auth
    loginRequiredTitle:
      language === "fr"
        ? "Connexion requise"
        : "Login required",
    loginRequiredDesc:
      language === "fr"
        ? "Vous devez être connecté pour voir la fiche détaillée des ouvriers et les contacter."
        : "You must be logged in to view worker details and contact them.",
    loginBtn: language === "fr" ? "Se connecter" : "Log in",
  };

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value, type, checked } = e.target as HTMLInputElement;
    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

  // 🔹 Envoi du formulaire avec origin = 'web'
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;
    if (!form.consent) return;

    setSending(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const fullWorkerName = `${worker.first_name ?? ""} ${
      worker.last_name ?? ""
    }`.trim();

    const composedMessage = [
      `${text.requestTypeLabel} : ${
        form.requestType === "devis"
          ? text.requestTypeDevis
          : form.requestType === "info"
          ? text.requestTypeInfo
          : text.requestTypeUrgence
      }`,
      form.budget ? `${text.budgetLabel} : ${form.budget}` : "",
      form.preferredDate ? `${text.dateLabel} : ${form.preferredDate}` : "",
      "",
      form.message,
    ]
      .filter(Boolean)
      .join("\n");

    const { error } = await supabase.from("op_ouvrier_contacts").insert({
      worker_id: worker.id,
      worker_name: fullWorkerName || null,
      full_name: form.name,
      email: form.email,
      phone: form.phone,
      message: composedMessage,
      status: "new",
      origin: "web",
    });

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
        requestType: "devis",
        budget: "",
        preferredDate: "",
        consent: false,
      });
    }

    setSending(false);
  };

  // -------------------------
  // Rendus conditionnels
  // -------------------------

  // Auth pas encore vérifiée
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr" ? "Vérification de la session..." : "Checking session..."}
        </div>
      </div>
    );
  }

  // Pas authentifié → écran "Connexion requise"
  if (authChecked && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl shadow-sm p-6 text-center">
          <div className="flex items-center justify-center mb-3">
            <div className="w-10 h-10 rounded-full bg-pro-blue/10 flex items-center justify-center">
              <Lock className="w-5 h-5 text-pro-blue" />
            </div>
          </div>
          <h1 className="text-lg font-semibold text-slate-900 mb-2">
            {text.loginRequiredTitle}
          </h1>
          <p className="text-sm text-slate-600 mb-5">
            {text.loginRequiredDesc}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full bg-pro-blue hover:bg-blue-700"
              onClick={() =>
                navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
              }
            >
              {text.loginBtn}
            </Button>
            <Button
              variant="outline"
              className="w-full text-sm"
              onClick={() => navigate(-1)}
            >
              {text.back}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Chargement des données de l’ouvrier
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr" ? "Chargement..." : "Loading..."}
        </div>
      </div>
    );
  }

  // Erreur / pas d’ouvrier
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

  const phoneNumber = (worker.phone || "").replace(/\s+/g, "");
  const whatsappNumber = phoneNumber;
  const whatsappUrl =
    whatsappNumber && whatsappNumber.length >= 8
      ? `https://wa.me/${
          whatsappNumber.startsWith("+")
            ? whatsappNumber.slice(1)
            : whatsappNumber
        }`
      : "";
  const mailtoUrl = worker.email
    ? `mailto:${worker.email}?subject=${encodeURIComponent(
        `Demande de ${worker.profession || "travaux"} via OuvriersPro`
      )}`
    : "";

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

        <div className="grid gap-8 md:grid-cols-[2fr,1.6fr] items-start">
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

          {/* Bloc contact enrichi */}
          <section className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              {text.contactTitle}
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              {text.contactSubtitle}
            </p>

            {/* Coordonnées directes */}
            <div className="mb-4 border border-slate-100 rounded-lg p-3 bg-slate-50">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-700">
                  {text.contactInfos}
                </span>
              </div>
              <div className="space-y-1 text-xs text-slate-700">
                {worker.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="w-3 h-3 text-pro-blue" />
                    <span className="font-medium">{text.phoneLabel} :</span>
                    <a
                      href={`tel:${worker.phone}`}
                      className="hover:underline"
                    >
                      {worker.phone}
                    </a>
                  </div>
                )}
                {worker.email && (
                  <div className="flex items-center gap-2">
                    <Mail className="w-3 h-3 text-pro-blue" />
                    <span className="font-medium">{text.emailLabel} :</span>
                    <a
                      href={`mailto:${worker.email}`}
                      className="hover:underline break-all"
                    >
                      {worker.email}
                    </a>
                  </div>
                )}
                {whatsappNumber && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="w-3 h-3 text-green-600" />
                    <span className="font-medium">
                      {text.whatsappLabel} :
                    </span>
                    <span>{whatsappNumber}</span>
                  </div>
                )}
              </div>

              {/* Actions rapides */}
              <div className="mt-3">
                <div className="text-[11px] text-slate-500 mb-1">
                  {text.quickActions}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {worker.phone && (
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-1 text-xs"
                      asChild
                    >
                      <a href={`tel:${worker.phone}`}>
                        <Phone className="w-3 h-3" />
                        {text.callBtn}
                      </a>
                    </Button>
                  )}

                  {whatsappUrl && (
                    <Button
                      className="w-full flex items-center justify-center gap-1 text-xs bg-green-500 hover:bg-green-600"
                      asChild
                    >
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <MessageCircle className="w-3 h-3" />
                        {text.whatsappBtn}
                      </a>
                    </Button>
                  )}

                  {mailtoUrl && (
                    <Button
                      variant="outline"
                      className="w-full flex items-center justify-center gap-1 text-xs"
                      asChild
                    >
                      <a href={mailtoUrl}>
                        <Mail className="w-3 h-3" />
                        {text.emailBtn}
                      </a>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full flex items-center justify-center gap-1 text-xs"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        requestType: "devis",
                        message:
                          prev.message ||
                          (language === "fr"
                            ? "Bonjour, je souhaite obtenir un devis pour des travaux."
                            : "Hello, I would like to get a quote for some work."),
                      }))
                    }
                  >
                    <FileText className="w-3 h-3" />
                    {text.devisBtn}
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex items-start gap-1 text-[11px] text-slate-500">
                <Info className="w-3 h-3 mt-[2px]" />
                <span>{text.privacyNote}</span>
              </div>
            </div>

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

            {/* Formulaire détaillé */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    {text.yourPhone}
                  </label>
                  <Input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="text-sm"
                    placeholder={
                      language === "fr"
                        ? "Numéro pour vous joindre"
                        : "Phone number"
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {text.yourEmail}{" "}
                  <span className="text-[10px] text-slate-400">
                    ({language === "fr" ? "facultatif" : "optional"})
                  </span>
                </label>
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="text-sm"
                  placeholder="email@exemple.com"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {text.requestTypeLabel}
                  </label>
                  <select
                    name="requestType"
                    value={form.requestType}
                    onChange={handleChange}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
                  >
                    <option value="devis">{text.requestTypeDevis}</option>
                    <option value="info">{text.requestTypeInfo}</option>
                    <option value="urgence">
                      {text.requestTypeUrgence}
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    {text.budgetLabel}
                  </label>
                  <Input
                    name="budget"
                    value={form.budget}
                    onChange={handleChange}
                    className="text-sm"
                    placeholder={
                      language === "fr"
                        ? "Ex : 1 000 000 GNF"
                        : "e.g. 1,000,000 GNF"
                    }
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  {text.dateLabel}
                </label>
                <Input
                  type="date"
                  name="preferredDate"
                  value={form.preferredDate}
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
                  placeholder={
                    language === "fr"
                      ? "Expliquez brièvement les travaux à réaliser, l’adresse, les contraintes éventuelles…"
                      : "Briefly describe the work to be done, address, constraints…"
                  }
                />
              </div>

              <div className="flex items-start gap-2 text-[11px] text-slate-600">
                <input
                  type="checkbox"
                  name="consent"
                  checked={form.consent}
                  onChange={handleChange}
                  className="mt-[2px] rounded border-slate-300"
                  required
                />
                <span>{text.consentLabel}</span>
              </div>

              <Button
                type="submit"
                disabled={sending}
                className="w-full bg-pro-blue hover:bg-blue-700 flex items-center justify-center gap-2 text-sm"
              >
                {sending ? (
                  <>
                    <Send className="w-4 h-4 animate-pulse" />
                    {text.sending}
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {text.send}
                  </>
                )}
              </Button>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetail;
