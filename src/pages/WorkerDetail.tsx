// src/pages/WorkerDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Award,
  Briefcase,
  Clock,
  DollarSign,
  CheckCircle,
  StarIcon,
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
  avatar_url: string | null;
};

type Review = {
  id: string;
  author_name: string | null;
  rating: number | null;
  comment: string | null;
  created_at: string | null;
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
  const [reviews, setReviews] = useState<Review[]>([]);
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
  // 🔐 Vérifier que l'utilisateur est connecté
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
  // 👷 Charger l'ouvrier et ses avis
  // -------------------------
  useEffect(() => {
    const fetchWorkerData = async () => {
      if (!id) {
        setError("missing-id");
        setLoading(false);
        return;
      }
      if (!isAuthenticated) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Charger l'ouvrier
      const { data: workerData, error: workerError } = await supabase
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
          email,
          avatar_url
        `
        )
        .eq("id", id)
        .maybeSingle();

      if (workerError || !workerData) {
        console.error(workerError);
        setError("load-failed");
        setLoading(false);
        return;
      }

      setWorker(workerData as DbWorker);

      // Charger les avis
      const { data: reviewsData } = await supabase
        .from("op_ouvrier_reviews")
        .select("id, author_name, rating, comment, created_at")
        .eq("worker_id", id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (reviewsData) {
        setReviews(reviewsData as Review[]);
      }

      setLoading(false);
    };

    if (authChecked && isAuthenticated) {
      fetchWorkerData();
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
        ? "Remplissez le formulaire ci-dessous pour être recontacté"
        : "Fill the form below to be contacted back",
    yourName: language === "fr" ? "Votre nom" : "Your name",
    yourEmail: language === "fr" ? "Votre email" : "Your email",
    yourPhone: language === "fr" ? "Votre téléphone" : "Your phone",
    yourMessage: language === "fr" ? "Votre message" : "Your message",
    send: language === "fr" ? "Envoyer la demande" : "Send request",
    sending: language === "fr" ? "Envoi en cours..." : "Sending...",
    success:
      language === "fr"
        ? "Votre demande a bien été envoyée. L'ouvrier vous contactera directement."
        : "Your request has been sent. The worker will contact you directly.",
    error:
      language === "fr"
        ? "Une erreur est survenue lors de l'envoi de votre demande."
        : "An error occurred while sending your request.",
    experience:
      language === "fr" ? "ans d'expérience" : "years of experience",
    rating: language === "fr" ? "Note moyenne" : "Average rating",
    perHour: language === "fr" ? "/h" : "/h",
    contactInfos:
      language === "fr" ? "Coordonnées directes" : "Direct contact",
    phoneLabel: language === "fr" ? "Téléphone" : "Phone",
    emailLabel: language === "fr" ? "Email" : "Email",
    whatsappLabel:
      language === "fr" ? "WhatsApp" : "WhatsApp",
    quickActions:
      language === "fr" ? "Actions rapides" : "Quick actions",
    callBtn: language === "fr" ? "Appeler" : "Call",
    whatsappBtn: language === "fr" ? "WhatsApp" : "WhatsApp",
    emailBtn:
      language === "fr" ? "Email" : "Email",
    devisBtn:
      language === "fr" ? "Demander un devis" : "Request quote",
    requestTypeLabel:
      language === "fr" ? "Type de demande" : "Request type",
    requestTypeDevis:
      language === "fr" ? "Demande de devis" : "Quote request",
    requestTypeInfo:
      language === "fr" ? "Demande d'informations" : "Information request",
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
        ? "J'accepte que mes coordonnées soient transmises à cet ouvrier."
        : "I agree to share my contact details with this worker.",
    privacyNote:
      language === "fr"
        ? "Vos données sont uniquement transmises à ce professionnel."
        : "Your data is only shared with this professional.",
    loginRequiredTitle:
      language === "fr"
        ? "Connexion requise"
        : "Login required",
    loginRequiredDesc:
      language === "fr"
        ? "Vous devez être connecté pour voir les détails et contacter les ouvriers."
        : "You must be logged in to view details and contact workers.",
    loginBtn: language === "fr" ? "Se connecter" : "Log in",
    about: language === "fr" ? "À propos" : "About",
    reviewsTitle: language === "fr" ? "Avis clients" : "Customer reviews",
    noReviews: language === "fr" ? "Aucun avis pour le moment" : "No reviews yet",
    location: language === "fr" ? "Localisation" : "Location",
    experienceTitle: language === "fr" ? "Expérience" : "Experience",
    hourlyRateTitle: language === "fr" ? "Tarif horaire" : "Hourly rate",
  };

  const handleChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
      | React.ChangeEvent<HTMLSelectElement>
  ) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    
    if (type === "checkbox") {
      const checked = (target as HTMLInputElement).checked;
      setForm((prev) => ({ ...prev, [name]: checked }));
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
    }
  };

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

  // Auth pas encore vérifiée
  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">
          {language === "fr" ? "Vérification..." : "Checking..."}
        </div>
      </div>
    );
  }

  // Pas authentifié
  if (authChecked && !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full p-6 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-6 h-6 text-primary" />
            </div>
          </div>
          <h1 className="text-xl font-semibold mb-2">
            {text.loginRequiredTitle}
          </h1>
          <p className="text-sm text-muted-foreground mb-6">
            {text.loginRequiredDesc}
          </p>
          <div className="flex flex-col gap-2">
            <Button
              className="w-full"
              onClick={() =>
                navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
              }
            >
              {text.loginBtn}
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => navigate(-1)}
            >
              {text.back}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Chargement
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-sm text-muted-foreground">
          {language === "fr" ? "Chargement..." : "Loading..."}
        </div>
      </div>
    );
  }

  // Erreur / pas d'ouvrier
  if (!worker || error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {text.back}
          </Button>
          <Card className="p-6 border-destructive/50">
            <p className="text-destructive">{text.notFound}</p>
          </Card>
        </div>
      </div>
    );
  }

  const fullName = `${worker.first_name ?? ""} ${
    worker.last_name ?? ""
  }`.trim() || "Professionnel";

  const locationParts = [
    worker.district,
    worker.commune,
    worker.city,
    worker.region,
  ]
    .filter(Boolean)
    .join(", ");

  const phoneNumber = (worker.phone || "").replace(/\s+/g, "");
  const whatsappUrl =
    phoneNumber && phoneNumber.length >= 8
      ? `https://wa.me/${
          phoneNumber.startsWith("+")
            ? phoneNumber.slice(1)
            : phoneNumber
        }`
      : "";
  const mailtoUrl = worker.email
    ? `mailto:${worker.email}?subject=${encodeURIComponent(
        `Demande via OuvriersPro`
      )}`
    : "";

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {text.back}
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Colonne principale */}
          <div className="lg:col-span-2 space-y-6">
            {/* En-tête avec avatar et infos principales */}
            <Card className="p-6">
              <div className="flex items-start gap-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold flex-shrink-0">
                  {fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()}
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2">{fullName}</h1>
                  {worker.profession && (
                    <Badge variant="secondary" className="mb-3 text-base">
                      {worker.profession}
                    </Badge>
                  )}
                  {locationParts && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="w-4 h-4" />
                      <span className="text-sm">{locationParts}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats rapides */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <span className="text-2xl font-bold">
                      {worker.average_rating?.toFixed(1) || "—"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {worker.rating_count || 0} avis
                  </p>
                </div>

                <div className="text-center border-x border-border">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <Briefcase className="w-5 h-5 text-primary" />
                    <span className="text-2xl font-bold">
                      {worker.years_experience || 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {text.experience}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <DollarSign className="w-5 h-5 text-primary" />
                    <span className="text-lg font-bold">
                      {formatCurrency(worker.hourly_rate, worker.currency)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {text.perHour}
                  </p>
                </div>
              </div>
            </Card>

            {/* Description */}
            {worker.description && (
              <Card className="p-6">
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  {text.about}
                </h2>
                <p className="text-muted-foreground whitespace-pre-line leading-relaxed">
                  {worker.description}
                </p>
              </Card>
            )}

            {/* Avis clients */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                {text.reviewsTitle}
              </h2>
              
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  {text.noReviews}
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div
                      key={review.id}
                      className="p-4 bg-muted/30 rounded-lg border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">
                          {review.author_name || "Client anonyme"}
                        </span>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <StarIcon
                              key={i}
                              className={`w-4 h-4 ${
                                i < (review.rating || 0)
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "text-muted-foreground/30"
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      {review.comment && (
                        <p className="text-sm text-muted-foreground">
                          {review.comment}
                        </p>
                      )}
                      {review.created_at && (
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(review.created_at).toLocaleDateString(
                            language === "fr" ? "fr-FR" : "en-US",
                            { year: "numeric", month: "long", day: "numeric" }
                          )}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar contact */}
          <div className="space-y-6">
            {/* Coordonnées directes */}
            <Card className="p-6">
              <h3 className="font-semibold mb-4">{text.contactInfos}</h3>
              
              <div className="space-y-3 mb-4">
                {worker.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <Phone className="w-4 h-4 text-primary" />
                    <a
                      href={`tel:${worker.phone}`}
                      className="hover:underline"
                    >
                      {worker.phone}
                    </a>
                  </div>
                )}
                {worker.email && (
                  <div className="flex items-center gap-3 text-sm">
                    <Mail className="w-4 h-4 text-primary" />
                    <a
                      href={mailtoUrl}
                      className="hover:underline break-all"
                    >
                      {worker.email}
                    </a>
                  </div>
                )}
              </div>

              {/* Actions rapides */}
              <div className="space-y-2">
                {worker.phone && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a href={`tel:${worker.phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      {text.callBtn}
                    </a>
                  </Button>
                )}

                {whatsappUrl && (
                  <Button
                    className="w-full justify-start bg-green-600 hover:bg-green-700"
                    asChild
                  >
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {text.whatsappBtn}
                    </a>
                  </Button>
                )}

                {mailtoUrl && (
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a href={mailtoUrl}>
                      <Mail className="w-4 h-4 mr-2" />
                      {text.emailBtn}
                    </a>
                  </Button>
                )}
              </div>
            </Card>

            {/* Formulaire de contact */}
            <Card className="p-6">
              <h3 className="font-semibold mb-2">{text.contactTitle}</h3>
              <p className="text-xs text-muted-foreground mb-4">
                {text.contactSubtitle}
              </p>

              {successMsg && (
                <div className="mb-4 p-3 text-sm bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 rounded-md">
                  {successMsg}
                </div>
              )}

              {errorMsg && (
                <div className="mb-4 p-3 text-sm bg-destructive/10 text-destructive border border-destructive/20 rounded-md">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    {text.yourName}
                  </label>
                  <Input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {text.yourPhone}
                  </label>
                  <Input
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {text.yourEmail}{" "}
                    <span className="text-xs text-muted-foreground">
                      (facultatif)
                    </span>
                  </label>
                  <Input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {text.requestTypeLabel}
                  </label>
                  <select
                    name="requestType"
                    value={form.requestType}
                    onChange={handleChange}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="devis">{text.requestTypeDevis}</option>
                    <option value="info">{text.requestTypeInfo}</option>
                    <option value="urgence">{text.requestTypeUrgence}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {text.budgetLabel}
                  </label>
                  <Input
                    name="budget"
                    value={form.budget}
                    onChange={handleChange}
                    placeholder="Ex: 1,000,000 GNF"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {text.dateLabel}
                  </label>
                  <Input
                    type="date"
                    name="preferredDate"
                    value={form.preferredDate}
                    onChange={handleChange}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    {text.yourMessage}
                  </label>
                  <Textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={4}
                    placeholder={
                      language === "fr"
                        ? "Décrivez votre besoin..."
                        : "Describe your need..."
                    }
                  />
                </div>

                <div className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    name="consent"
                    checked={form.consent}
                    onChange={handleChange}
                    className="mt-1 rounded"
                    required
                  />
                  <label className="text-xs text-muted-foreground">
                    {text.consentLabel}
                  </label>
                </div>

                <Button
                  type="submit"
                  disabled={sending}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <Send className="w-4 h-4 mr-2 animate-pulse" />
                      {text.sending}
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      {text.send}
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground text-center">
                  <Info className="w-3 h-3 inline mr-1" />
                  {text.privacyNote}
                </p>
              </form>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetail;
