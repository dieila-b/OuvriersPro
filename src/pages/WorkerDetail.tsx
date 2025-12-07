// src/pages/WorkerDetail.tsx
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MessageCircle, MapPin } from "lucide-react";

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
  hourly_rate: number | null;
  currency: string | null;
};

const WorkerDetail: React.FC = () => {
  const { language } = useLanguage();
  const params = useParams();
  // compat : /workers/:id ou /workers/:workerId
  const workerId = (params.workerId as string) || (params.id as string);

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [loadingWorker, setLoadingWorker] = useState(true);
  const [workerError, setWorkerError] = useState<string | null>(null);

  // formulaire de contact
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadWorker = async () => {
      if (!workerId) {
        setWorkerError(
          language === "fr"
            ? "Aucun ouvrier spécifié."
            : "No worker specified."
        );
        setLoadingWorker(false);
        return;
      }

      setLoadingWorker(true);
      setWorkerError(null);

      const { data, error } = await supabase
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
          hourly_rate,
          currency
        `
        )
        .eq("id", workerId)
        .maybeSingle();

      if (error || !data) {
        console.error("loadWorker error", error);
        setWorkerError(
          language === "fr"
            ? "Impossible de charger le profil de cet ouvrier."
            : "Unable to load this worker profile."
        );
      } else {
        setWorker(data as WorkerProfile);
      }

      setLoadingWorker(false);
    };

    loadWorker();
  }, [workerId, language]);

  const fullName =
    (worker?.first_name || "") +
    (worker?.last_name ? ` ${worker.last_name}` : "");

  const location = [
    worker?.country,
    worker?.region,
    worker?.city,
    worker?.commune,
    worker?.district,
  ]
    .filter(Boolean)
    .join(" • ");

  const whatsappUrl = worker?.phone
    ? (() => {
        const clean = worker.phone.replace(/\s+/g, "");
        const normalized = clean.startsWith("+") ? clean.slice(1) : clean;
        return `https://wa.me/${normalized}`;
      })()
    : "";

  /**
   * Envoi de la demande :
   * 1) vérifie que l’utilisateur est connecté
   * 2) récupère ou crée un profil dans op_clients (user_id = auth.user.id)
   * 3) insère la demande dans op_ouvrier_contacts en liant worker_id + client_id
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker) return;

    setSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      // 1) utilisateur connecté
      const { data: authData, error: authError } = await supabase.auth.getUser();
      const user = authData?.user;

      if (authError || !user) {
        throw new Error(
          language === "fr"
            ? "Vous devez être connecté pour envoyer une demande."
            : "You must be logged in to send a request."
        );
      }

      // 2) récupérer ou créer le profil client
      let clientProfileId: string | null = null;

      const { data: existingClient, error: selectClientError } = await supabase
        .from("op_clients")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (selectClientError && selectClientError.code !== "PGRST116") {
        console.error("select client error", selectClientError);
        throw new Error(
          language === "fr"
            ? "Impossible de récupérer votre profil client."
            : "Unable to fetch your client profile."
        );
      }

      if (existingClient) {
        clientProfileId = existingClient.id;
      } else {
        const { data: newClient, error: insertClientError } = await supabase
          .from("op_clients")
          .insert({
            user_id: user.id,
            first_name: name || null,
            last_name: null,
            email: email || user.email || null,
            phone: phone || null,
          })
          .select("id")
          .maybeSingle();

        if (insertClientError || !newClient) {
          console.error("insert client error", insertClientError);
          throw new Error(
            language === "fr"
              ? "Impossible de créer votre profil client."
              : "Unable to create your client profile."
          );
        }

        clientProfileId = newClient.id;
      }

      if (!clientProfileId) {
        throw new Error(
          language === "fr"
            ? "Profil client introuvable. Veuillez réessayer."
            : "Client profile not found. Please try again."
        );
      }

      // 3) insérer la demande dans op_ouvrier_contacts
      const { error: contactError } = await supabase
        .from("op_ouvrier_contacts")
        .insert({
          worker_id: worker.id,
          client_id: clientProfileId,
          client_name: name || null,
          client_email: email || user.email || null,
          client_phone: phone || null,
          message: message || null,
          origin: "web",
          status: "new",
        });

      if (contactError) {
        console.error("insert contact error", contactError);
        throw new Error(
          language === "fr"
            ? "Une erreur est survenue lors de l'envoi de votre demande."
            : "An error occurred while sending your request."
        );
      }

      setSubmitSuccess(
        language === "fr"
          ? "Votre demande a été envoyée à l’ouvrier."
          : "Your request has been sent to the worker."
      );
      setMessage("");
      // on garde nom / téléphone / email pour les prochaines demandes
    } catch (err: any) {
      console.error(err);
      setSubmitError(err.message || "Error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingWorker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr"
            ? "Chargement du profil ouvrier..."
            : "Loading worker profile..."}
        </div>
      </div>
    );
  }

  if (workerError || !worker) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-sm text-red-600">
          {workerError ||
            (language === "fr"
              ? "Ouvrier introuvable."
              : "Worker not found.")}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-6xl mx-auto px-4 flex flex-col lg:flex-row gap-6">
        {/* Colonne gauche : profil ouvrier */}
        <div className="flex-1 space-y-4">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-pro-blue/10 flex items-center justify-center text-pro-blue font-semibold text-lg">
                {fullName
                  ? fullName
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                  : "OP"}
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">
                  {fullName || (language === "fr" ? "Ouvrier" : "Worker")}
                </h1>
                {worker.profession && (
                  <p className="text-sm text-slate-600">{worker.profession}</p>
                )}
                {location && (
                  <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="w-3 h-3" />
                    {location}
                  </p>
                )}
              </div>
            </div>

            {worker.hourly_rate != null && (
              <div className="mt-4 text-sm">
                <span className="text-xs text-slate-500 block">
                  {language === "fr"
                    ? "Tarif horaire indicatif"
                    : "Indicative hourly rate"}
                </span>
                <span className="text-lg font-semibold text-slate-900">
                  {worker.hourly_rate.toLocaleString()}{" "}
                  {worker.currency || "GNF"}/h
                </span>
              </div>
            )}

            {worker.description && (
              <div className="mt-4">
                <h2 className="text-sm font-semibold text-slate-800 mb-1">
                  {language === "fr" ? "À propos" : "About"}
                </h2>
                <p className="text-sm text-slate-700 whitespace-pre-line">
                  {worker.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Colonne droite : formulaire de contact */}
        <div className="w-full lg:w-[360px]">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-800 mb-2">
              {language === "fr"
                ? "Contacter cet ouvrier"
                : "Contact this worker"}
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              {language === "fr"
                ? "Remplissez le formulaire pour être recontacté."
                : "Fill in the form to be contacted back."}
            </p>

            {submitError && (
              <div className="mb-3 text-xs text-red-600 bg-red-50 border border-red-100 rounded px-3 py-2">
                {submitError}
              </div>
            )}
            {submitSuccess && (
              <div className="mb-3 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-3 py-2">
                {submitSuccess}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  {language === "fr" ? "Votre nom" : "Your name"}
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  {language === "fr" ? "Votre téléphone" : "Your phone"}
                </label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  {language === "fr"
                    ? "Votre email (facultatif)"
                    : "Your email (optional)"}
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">
                  {language === "fr"
                    ? "Votre demande / description des travaux"
                    : "Your request / work description"}
                </label>
                <Textarea
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-pro-blue hover:bg-blue-700"
                disabled={submitting}
              >
                {submitting
                  ? language === "fr"
                    ? "Envoi en cours..."
                    : "Sending..."
                  : language === "fr"
                  ? "Envoyer ma demande"
                  : "Send my request"}
              </Button>
            </form>

            {/* Coordonnées directes si l’ouvrier les a publiées */}
            <div className="mt-4 border-t border-slate-100 pt-3 space-y-2 text-xs">
              <div className="font-semibold text-slate-700">
                {language === "fr"
                  ? "Coordonnées directes"
                  : "Direct contact"}
              </div>
              {worker.phone && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <a href={`tel:${worker.phone}`}>
                    <Phone className="w-3 h-3 mr-2" />
                    {worker.phone}
                  </a>
                </Button>
              )}
              {whatsappUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-3 h-3 mr-2" />
                    WhatsApp
                  </a>
                </Button>
              )}
              {worker.email && (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start"
                  asChild
                >
                  <a href={`mailto:${worker.email}`}>
                    <Mail className="w-3 h-3 mr-2" />
                    {worker.email}
                  </a>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkerDetail;
