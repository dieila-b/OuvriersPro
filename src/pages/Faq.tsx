// src/pages/Faq.tsx
import React, { useMemo, useState } from "react";
import FaqAccordion from "@/components/FaqAccordion";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";

type Category =
  | "home_services"
  | "health"
  | "it"
  | "tutoring"
  | "business"
  | "payments"
  | "account"
  | "reviews"
  | "security";

const CATEGORY_OPTIONS: { value: Category; fr: string; en: string }[] = [
  { value: "home_services", fr: "Services à domicile", en: "Home services" },
  { value: "health", fr: "Santé", en: "Health" },
  { value: "it", fr: "Informatique", en: "IT" },
  { value: "tutoring", fr: "Cours / Répétiteurs", en: "Tutoring" },
  { value: "business", fr: "Général", en: "General" },
  { value: "payments", fr: "Paiement / Tarifs", en: "Payments / Pricing" },
  { value: "account", fr: "Compte", en: "Account" },
  { value: "reviews", fr: "Avis", en: "Reviews" },
  { value: "security", fr: "Sécurité", en: "Safety" },
];

export default function Faq() {
  const { language } = useLanguage();

  const t = useMemo(() => {
    return {
      title: language === "fr" ? "FAQ ProxiServices" : "ProxiServices FAQ",
      // ✅ Texte mis à jour: on ne parle plus de filtre par catégorie (barre supprimée)
      subtitle:
        language === "fr"
          ? "Retrouvez les réponses aux questions les plus fréquentes."
          : "Find answers to the most common questions.",
      askTitle: language === "fr" ? "Vous n’avez pas trouvé ?" : "Didn’t find what you need?",
      askSubtitle:
        language === "fr"
          ? "Envoyez votre question à l’équipe ProxiServices. Nous vous répondrons par email."
          : "Send your question to the ProxiServices team. We will reply by email.",
      fullName: language === "fr" ? "Nom et prénom" : "Full name",
      email: language === "fr" ? "Adresse email" : "Email address",
      category: language === "fr" ? "Catégorie" : "Category",
      subject: language === "fr" ? "Objet" : "Subject",
      message: language === "fr" ? "Votre question" : "Your question",
      messagePh:
        language === "fr"
          ? "Décrivez votre besoin (ex: comment contacter un prestataire, paiement, sécurité, etc.)"
          : "Describe your request (e.g., contacting a provider, payments, safety, etc.)",
      send: language === "fr" ? "Envoyer" : "Send",
      sending: language === "fr" ? "Envoi..." : "Sending...",
      success:
        language === "fr" ? "Merci. Votre question a bien été envoyée." : "Thanks. Your question has been sent.",
      error:
        language === "fr"
          ? "Impossible d’envoyer votre question pour le moment."
          : "Unable to send your question right now.",
      required:
        language === "fr" ? "Veuillez renseigner l’email et la question." : "Please enter email and your question.",
      optional: language === "fr" ? "(optionnel)" : "(optional)",
      choose: language === "fr" ? "Choisir..." : "Choose...",
      mailFallback:
        language === "fr"
          ? "Ouvrir votre email pour envoyer la question"
          : "Open your email to send the question",
    };
  }, [language]);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [category, setCategory] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [sending, setSending] = useState(false);
  const [ok, setOk] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const resetStatus = () => {
    setOk(null);
    setErr(null);
  };

  const mailtoFallback = () => {
    const to = "support@proxiservices.com"; // adapte si besoin
    const subj = encodeURIComponent(subject || "Question FAQ");
    const body = encodeURIComponent(
      `Nom: ${fullName || "-"}\nEmail: ${email || "-"}\nCatégorie: ${category || "-"}\n\nQuestion:\n${message}\n`
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

      const payload = {
        full_name: fullName.trim() || null,
        email: email.trim(),
        category: category || null,
        subject: subject.trim() || null,
        message: message.trim(),
        user_id: user?.id ?? null,
      };

      const { error } = await supabase.from("op_faq_questions").insert(payload);
      if (error) throw error;

      setOk(t.success);
      setFullName("");
      setEmail("");
      setCategory("");
      setSubject("");
      setMessage("");
    } catch (e) {
      console.error("FAQ contact submit error:", e);
      setErr(t.error);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="w-full bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 py-10 sm:py-12">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray">{t.title}</h1>
          <p className="mt-2 text-gray-600">{t.subtitle}</p>

          {/* ✅ Barre de catégories supprimée (partie encadrée) */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-6">
            <FaqAccordion />
          </div>

          {/* ✅ Formulaire de contact / question */}
          <div className="mt-10">
            <Card className="rounded-3xl border border-gray-200 shadow-sm">
              <div className="p-5 sm:p-7">
                <h2 className="text-lg sm:text-xl font-semibold text-pro-gray">{t.askTitle}</h2>
                <p className="mt-1 text-sm text-gray-600">{t.askSubtitle}</p>

                <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-pro-gray">
                        {t.fullName} <span className="text-gray-400">{t.optional}</span>
                      </label>
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={language === "fr" ? "Ex: Mamadou Diallo" : "e.g., John Doe"}
                        onFocus={resetStatus}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-pro-gray">
                        {t.email} <span className="text-red-500">*</span>
                      </label>
                      <Input
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder={language === "fr" ? "ex: nom@email.com" : "e.g., name@email.com"}
                        type="email"
                        required
                        onFocus={resetStatus}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-pro-gray">
                        {t.category} <span className="text-gray-400">{t.optional}</span>
                      </label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        onFocus={resetStatus}
                        className="h-10 w-full rounded-md border border-gray-200 bg-white px-3 text-sm text-pro-gray outline-none focus:ring-2 focus:ring-pro-blue/25"
                      >
                        <option value="">{t.choose}</option>
                        {CATEGORY_OPTIONS.map((c) => (
                          <option key={c.value} value={c.value}>
                            {language === "fr" ? c.fr : c.en}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium text-pro-gray">
                        {t.subject} <span className="text-gray-400">{t.optional}</span>
                      </label>
                      <Input
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder={language === "fr" ? "Ex: Paiement / sécurité" : "e.g., Payments / Safety"}
                        onFocus={resetStatus}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
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

                  {/* Feedback */}
                  {ok && (
                    <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">
                      <CheckCircle2 className="w-5 h-5 mt-0.5" />
                      <div className="text-sm">{ok}</div>
                    </div>
                  )}
                  {err && (
                    <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900">
                      <AlertTriangle className="w-5 h-5 mt-0.5" />
                      <div className="text-sm">{err}</div>
                    </div>
                  )}

                  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
                    <Button
                      type="submit"
                      className="rounded-full bg-pro-blue hover:bg-pro-blue/90 flex items-center gap-2"
                      disabled={sending}
                    >
                      <Send className="w-4 h-4" />
                      {sending ? t.sending : t.send}
                    </Button>

                    {/* Fallback: mailto si supabase bloque */}
                    <button
                      type="button"
                      onClick={mailtoFallback}
                      className="text-sm text-gray-500 hover:text-pro-blue underline underline-offset-4"
                    >
                      {t.mailFallback}
                    </button>
                  </div>
                </form>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
