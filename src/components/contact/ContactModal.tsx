// src/components/contact/ContactModal.tsx
import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

import { Mail, Send, CheckCircle2, AlertTriangle } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubject?: string;
};

export default function ContactModal({ open, onOpenChange, defaultSubject = "" }: Props) {
  const { language } = useLanguage();

  const t = useMemo(() => {
    return {
      title: language === "fr" ? "Contacter ProxiServices" : "Contact ProxiServices",
      subtitle:
        language === "fr"
          ? "Expliquez votre besoin. Notre équipe vous répondra par email."
          : "Describe your request. Our team will reply by email.",
      name: language === "fr" ? "Nom et prénom" : "Full name",
      email: language === "fr" ? "Adresse email" : "Email address",
      subject: language === "fr" ? "Objet" : "Subject",
      message: language === "fr" ? "Message" : "Message",
      namePh: language === "fr" ? "Ex: Mamadou Diallo" : "e.g., John Doe",
      emailPh: language === "fr" ? "ex: nom@email.com" : "e.g., name@email.com",
      subjectPh: language === "fr" ? "Ex: Demande d’information" : "e.g., Information request",
      messagePh:
        language === "fr"
          ? "Décrivez votre demande (support, prestation, paiement, sécurité, etc.)"
          : "Describe your request (support, provider, payments, safety, etc.)",
      send: language === "fr" ? "Envoyer" : "Send",
      sending: language === "fr" ? "Envoi..." : "Sending...",
      close: language === "fr" ? "Fermer" : "Close",
      required:
        language === "fr" ? "Veuillez renseigner l’email et le message." : "Please enter email and message.",
      success:
        language === "fr"
          ? "Merci. Votre message a bien été envoyé."
          : "Thanks. Your message has been sent.",
      error:
        language === "fr"
          ? "Impossible d’envoyer le message pour le moment."
          : "Unable to send your message right now.",
      mailFallback:
        language === "fr" ? "Ouvrir votre email" : "Open your email",
    };
  }, [language]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const resetStatus = () => {
    setOk(null);
    setErr(null);
  };

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setSubject(defaultSubject);
    setMessage("");
    resetStatus();
  };

  // Reset à l’ouverture (optionnel mais pratique)
  React.useEffect(() => {
    if (open) {
      setSubject(defaultSubject);
      resetStatus();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultSubject]);

  const mailtoFallback = () => {
    const to = "support@proxiservices.com";
    const subj = encodeURIComponent(subject || "Contact ProxiServices");
    const body = encodeURIComponent(
      `Nom: ${fullName || "-"}\nEmail: ${email || "-"}\n\nMessage:\n${message}\n`
    );
    window.location.href = `mailto:${to}?subject=${subj}&body=${body}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    resetStatus();

    if (!email.trim() || !message.trim()) {
      setErr(t.required);
      return;
    }

    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Réutilise ta table existante si tu veux (op_faq_questions).
      // Si tu préfères une table dédiée: op_contact_messages, dis-moi.
      const payload = {
        full_name: fullName.trim() || null,
        email: email.trim(),
        subject: (subject || "").trim() || null,
        message: message.trim(),
        category: "contact", // optionnel (colonne nullable dans ton schéma précédent)
        user_id: user?.id ?? null,
      };

      const { error } = await supabase.from("op_faq_questions").insert(payload);
      if (error) throw error;

      setOk(t.success);

      // petit reset doux (tu peux aussi fermer direct)
      setTimeout(() => {
        resetForm();
        onOpenChange(false);
      }, 900);
    } catch (e) {
      console.error("ContactModal submit error:", e);
      setErr(t.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : onOpenChange(false))}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-pro-blue/10 text-pro-blue">
              <Mail className="h-4 w-4" />
            </span>
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.subtitle}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 grid gap-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-pro-gray">{t.name}</label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={t.namePh}
                onFocus={resetStatus}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-pro-gray">
                {t.email} <span className="text-red-500">*</span>
              </label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.emailPh}
                type="email"
                required
                onFocus={resetStatus}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-pro-gray">{t.subject}</label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={t.subjectPh}
              onFocus={resetStatus}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-pro-gray">
              {t.message} <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t.messagePh}
              rows={5}
              required
              onFocus={resetStatus}
            />
          </div>

          {ok && (
            <div className="flex items-start gap-2 rounded-xl bg-emerald-50 border border-emerald-200 px-3 py-2 text-emerald-800">
              <CheckCircle2 className="h-5 w-5 mt-0.5" />
              <div className="text-sm">{ok}</div>
            </div>
          )}

          {err && (
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-amber-900">
              <AlertTriangle className="h-5 w-5 mt-0.5" />
              <div className="text-sm">{err}</div>
            </div>
          )}

          <div className="flex flex-col-reverse sm:flex-row gap-2 sm:items-center sm:justify-between pt-1">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
              disabled={sending}
            >
              {t.close}
            </Button>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <button
                type="button"
                onClick={mailtoFallback}
                className="text-sm text-gray-500 hover:text-pro-blue underline underline-offset-4"
              >
                {t.mailFallback}
              </button>

              <Button
                type="submit"
                className="rounded-xl bg-pro-blue hover:bg-pro-blue/90 flex items-center gap-2"
                disabled={sending}
              >
                <Send className="h-4 w-4" />
                {sending ? t.sending : t.send}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
