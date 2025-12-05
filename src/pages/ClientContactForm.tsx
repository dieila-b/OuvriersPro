// src/pages/ClientContactForm.tsx
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Phone, MessageCircle, User, Copy } from "lucide-react";

type WorkerProfile = {
  id: string;
  user_id: string | null;
  first_name: string | null;
  last_name: string | null;
};

type WorkerContact = {
  id: string;
  worker_id: string | null;
  client_id: string | null;
  client_name: string | null;
  client_email: string | null;
  client_phone: string | null;
  message: string | null;
  created_at: string;
};

const ClientContactForm: React.FC = () => {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [worker, setWorker] = useState<WorkerProfile | null>(null);
  const [lastContact, setLastContact] = useState<WorkerContact | null>(null);

  const [replyText, setReplyText] = useState("");
  const [copying, setCopying] = useState(false);

  // Helpers
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

  const phoneToWhatsappUrl = (phone?: string | null, text?: string) => {
    if (!phone) return "";
    const clean = phone.replace(/\s+/g, "");
    if (clean.length < 8) return "";
    const normalized = clean.startsWith("+") ? clean.slice(1) : clean;
    let url = `https://wa.me/${normalized}`;
    if (text && text.trim().length > 0) {
      url += `?text=${encodeURIComponent(text.trim())}`;
    }
    return url;
  };

  const handleCopy = async () => {
    if (!replyText.trim()) {
      window.alert(
        language === "fr"
          ? "Aucun texte à copier."
          : "No text to copy."
      );
      return;
    }
    try {
      setCopying(true);
      await navigator.clipboard.writeText(replyText.trim());
      window.alert(
        language === "fr"
          ? "Texte copié dans le presse-papiers."
          : "Text copied to clipboard."
      );
    } catch (e) {
      window.alert(
        language === "fr"
          ? "Impossible de copier automatiquement. Sélectionnez le texte et copiez-le manuellement."
          : "Could not copy automatically. Please select the text and copy it manually."
      );
    } finally {
      setCopying(false);
    }
  };

  // Chargement du worker + dernier contact pour ce client
  useEffect(() => {
    const run = async () => {
      try {
        if (!clientId) {
          setError(
            language === "fr"
              ? "Identifiant client manquant."
              : "Missing client id."
          );
          setLoading(false);
          return;
        }

        const { data: authData, error: authError } =
          await supabase.auth.getUser();
        const user = authData?.user;

        if (authError || !user) {
          setError(
            language === "fr"
              ? "Vous devez être connecté pour accéder à ce formulaire."
              : "You must be logged in to access this form."
          );
          setLoading(false);
          return;
        }

        // Récupération du profil ouvrier
        const { data: workerData, error: workerError } = await supabase
          .from("op_ouvriers")
          .select("id, user_id, first_name, last_name")
          .eq("user_id", user.id)
          .maybeSingle();

        if (workerError || !workerData) {
          setError(
            language === "fr"
              ? "Profil ouvrier introuvable."
              : "Worker profile not found."
          );
          setLoading(false);
          return;
        }

        const w = workerData as WorkerProfile;
        setWorker(w);

        // Récupération du dernier contact entre cet ouvrier et ce client
        const { data: contacts, error: contactError } = await supabase
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
            created_at
          `
          )
          .eq("worker_id", w.id)
          .eq("client_id", clientId)
          .order("created_at", { ascending: false })
          .limit(1);

        if (contactError) {
          setError(
            language === "fr"
              ? `Erreur lors du chargement des informations client : ${contactError.message}`
              : `Error while loading client info: ${contactError.message}`
          );
          setLoading(false);
          return;
        }

        if (!contacts || contacts.length === 0) {
          setError(
            language === "fr"
              ? "Aucun contact trouvé pour ce client."
              : "No contact found for this client."
          );
          setLoading(false);
          return;
        }

        setLastContact(contacts[0] as WorkerContact);

        // Pré-remplir un début de réponse
        const baseReply =
          language === "fr"
            ? "Bonjour,\n\nJe fais suite à votre demande envoyée via OuvriersPro."
            : "Hello,\n\nI am following up on your request sent via OuvriersPro.";
        setReplyText(baseReply);
      } catch (e) {
        console.error(e);
        setError(
          language === "fr"
            ? "Une erreur est survenue lors du chargement du formulaire."
            : "An error occurred while loading the form."
        );
      } finally {
        setLoading(false);
      }
    };

    run();
  }, [clientId, language]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-sm text-slate-500">
          {language === "fr"
            ? "Chargement du formulaire de contact client..."
            : "Loading client contact form..."}
        </div>
      </div>
    );
  }

  if (error || !worker || !lastContact) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="text-sm text-red-600">{error}</div>
          <Button
            onClick={() => navigate("/worker/dashboard?tab=messages")}
            className="bg-pro-blue hover:bg-blue-700"
          >
            {language === "fr"
              ? "Retour à mes messages"
              : "Back to my messages"}
          </Button>
        </div>
      </div>
    );
  }

  const initials =
    (lastContact.client_name || "—")
      .split(" ")
      .filter(Boolean)
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "—";

  const emailSubject =
    language === "fr"
      ? "Réponse à votre demande via OuvriersPro"
      : "Reply to your request via OuvriersPro";

  const emailHref = lastContact.client_email
    ? `mailto:${lastContact.client_email}?subject=${encodeURIComponent(
        emailSubject
      )}&body=${encodeURIComponent(replyText)}`
    : "";

  const whatsappUrl = phoneToWhatsappUrl(lastContact.client_phone, replyText);

  const hasEmail = !!lastContact.client_email;
  const hasPhone = !!lastContact.client_phone;

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {language === "fr"
                ? "Formulaire interne de contact client"
                : "Internal client contact form"}
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {language === "fr"
                ? "Rédigez votre réponse, puis envoyez-la par e-mail, WhatsApp ou téléphone."
                : "Write your reply and send it via e-mail, WhatsApp or phone."}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/worker/dashboard?tab=messages")}
          >
            {language === "fr"
              ? "Retour aux messages"
              : "Back to messages"}
          </Button>
        </div>

        {/* Carte client */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mb-4 flex gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-pro-blue/10 text-pro-blue text-xs font-semibold shrink-0">
            {initials !== "—" ? initials : <User className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-sm font-semibold text-slate-900">
                  {lastContact.client_name || "—"}
                </div>
                <div className="text-xs text-slate-500">
                  {language === "fr" ? "Dernière demande le " : "Last request on "}
                  {formatDate(lastContact.created_at)}
                </div>
              </div>
            </div>

            <div className="mt-2 flex flex-wrap gap-3 text-xs text-slate-600">
              {hasEmail && (
                <span className="inline-flex items-center gap-1">
                  <Mail className="w-3 h-3" />
                  {lastContact.client_email}
                </span>
              )}
              {hasPhone && (
                <span className="inline-flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {lastContact.client_phone}
                </span>
              )}
            </div>

            {lastContact.message && (
              <div className="mt-3 text-xs">
                <div className="text-slate-500 mb-1">
                  {language === "fr"
                    ? "Message initial du client :"
                    : "Client initial message:"}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 whitespace-pre-line">
                  {lastContact.message}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Formulaire de réponse */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-slate-800">
              {language === "fr"
                ? "Votre réponse"
                : "Your reply"}
            </span>
            <span className="text-[11px] text-slate-400">
              {language === "fr"
                ? "Non envoyée automatiquement"
                : "Not sent automatically"}
            </span>
          </div>

          <Textarea
            rows={6}
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            className="text-sm"
            placeholder={
              language === "fr"
                ? "Tapez ici votre réponse pour ce client…"
                : "Type your reply to this client…"
            }
          />

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-[11px] text-slate-500">
              {language === "fr"
                ? "Envoyez votre réponse par le canal de votre choix (e-mail, WhatsApp ou téléphone)."
                : "Send your reply using your preferred channel (e-mail, WhatsApp or phone)."}
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={handleCopy}
                disabled={copying}
              >
                <Copy className="w-3 h-3 mr-1" />
                {copying
                  ? language === "fr"
                    ? "Copie..."
                    : "Copying..."
                  : language === "fr"
                  ? "Copier le texte"
                  : "Copy text"}
              </Button>

              {hasPhone && (
                <Button variant="outline" size="xs" asChild>
                  <a href={`tel:${lastContact.client_phone}`}>
                    <Phone className="w-3 h-3 mr-1" />
                    {language === "fr" ? "Appeler" : "Call"}
                  </a>
                </Button>
              )}

              {hasPhone && whatsappUrl && (
                <Button variant="outline" size="xs" asChild>
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

              {hasEmail && emailHref && (
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

        <p className="mt-4 text-[11px] text-slate-400">
          {language === "fr"
            ? "Ce formulaire interne utilise les informations de la table op_ouvrier_contacts (worker_id et client_id)."
            : "This internal form uses data from the op_ouvrier_contacts table (worker_id and client_id)."}
        </p>
      </div>
    </div>
  );
};

export default ClientContactForm;
