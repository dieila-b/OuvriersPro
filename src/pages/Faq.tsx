// src/pages/Faq.tsx
import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Send, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react";

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

type FaqItem = {
  id: string;
  category: Category;
  q: { fr: string; en: string };
  a: { fr: string; en: string };
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "what-is",
    category: "business",
    q: { fr: "Qu’est-ce que ProxiServices ?", en: "What is ProxiServices?" },
    a: {
      fr: "ProxiServices est une plateforme qui met en relation des clients (particuliers et entreprises) avec des prestataires vérifiés : artisans, médecins, informaticiens, répétiteurs, et bien d’autres services.",
      en: "ProxiServices is a marketplace that connects customers (individuals and businesses) with verified providers: home services, doctors, IT experts, tutors, and more.",
    },
  },
  {
    id: "how-search",
    category: "business",
    q: { fr: "Comment rechercher un prestataire ?", en: "How do I search for a provider?" },
    a: {
      fr: "Utilise la barre de recherche (métier/nom) et indique ton quartier si besoin. Tu peux ensuite affiner avec les filtres (région, ville, prix, note, etc.).",
      en: "Use the search bar (trade/name) and optionally enter your district. You can then refine results with filters (region, city, price, rating, etc.).",
    },
  },
  {
    id: "categories",
    category: "business",
    q: { fr: "Quels types de services sont disponibles ?", en: "What service categories are available?" },
    a: {
      fr: "Services à domicile (plomberie, électricité…), santé (médecins…), IT (développeurs, techniciens…), cours (répétiteurs…), et d’autres services professionnels.",
      en: "Home services (plumbing, electrical…), health (doctors…), IT (developers, technicians…), tutoring, and other professional services.",
    },
  },
  {
    id: "create-account",
    category: "account",
    q: { fr: "Dois-je créer un compte pour utiliser ProxiServices ?", en: "Do I need an account to use ProxiServices?" },
    a: {
      fr: "Tu peux parcourir et rechercher sans compte. Pour contacter un prestataire, laisser un avis, enregistrer des favoris ou gérer tes demandes, la connexion est requise.",
      en: "You can browse and search without an account. To contact providers, leave reviews, save favorites, or manage requests, you must sign in.",
    },
  },
  {
    id: "contact-provider",
    category: "business",
    q: { fr: "Comment contacter un prestataire ?", en: "How can I contact a provider?" },
    a: {
      fr: "Ouvre sa fiche et clique sur “Contacter”. Tu peux ensuite échanger via la messagerie intégrée.",
      en: "Open the provider profile and click “Contact”. You can then chat using the built-in messaging.",
    },
  },
  {
    id: "pricing",
    category: "payments",
    q: { fr: "Les tarifs sont-ils fixes ?", en: "Are prices fixed?" },
    a: {
      fr: "Chaque prestataire définit ses tarifs. Tu peux filtrer par prix maximum et comparer selon la note, l’expérience et la disponibilité.",
      en: "Each provider sets their own pricing. You can filter by max price and compare by rating, experience, and availability.",
    },
  },
  {
    id: "reviews",
    category: "reviews",
    q: { fr: "Comment laisser un avis ?", en: "How do I leave a review?" },
    a: {
      fr: "Après une prestation, va sur la fiche du prestataire et laisse une note + commentaire. Les avis aident la communauté et améliorent la confiance.",
      en: "After a service, go to the provider profile and leave a rating + comment. Reviews help the community and build trust.",
    },
  },
  {
    id: "safety",
    category: "security",
    q: { fr: "Comment ProxiServices sécurise la plateforme ?", en: "How does ProxiServices keep the platform safe?" },
    a: {
      fr: "Nous encourageons la vérification des profils, l’historique d’avis, et des échanges via la messagerie. Signale tout comportement suspect via le support.",
      en: "We promote profile verification, review history, and in-app messaging. Report any suspicious behavior via support.",
    },
  },
];

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
  const navigate = useNavigate();

  const t = useMemo(() => {
    return {
      title: language === "fr" ? "FAQ ProxiServices" : "ProxiServices FAQ",
      subtitle:
        language === "fr"
          ? "Retrouvez les réponses aux questions les plus fréquentes."
          : "Find answers to the most common questions.",
      backHome: language === "fr" ? "Retour à l’accueil" : "Back to home",
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
        language === "fr"
          ? "Merci. Votre question a bien été envoyée."
          : "Thanks. Your question has been sent.",
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
    const to = "support@proxiservices.com";
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
          {/* ✅ En-tête + bouton retour */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray">{t.title}</h1>
              <p className="mt-2 text-gray-600">{t.subtitle}</p>
            </div>

            <div className="shrink-0">
              <Button
                type="button"
                variant="outline"
                className="rounded-full border-gray-300"
                onClick={() => navigate("/")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t.backHome}
              </Button>
            </div>
          </div>

          {/* ✅ FAQ SANS catégories */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-6">
            <Accordion type="single" collapsible className="w-full">
              {FAQ_ITEMS.map((it) => (
                <AccordionItem key={it.id} value={it.id} className="border-b border-gray-200">
                  <AccordionTrigger className="text-left text-pro-gray">
                    {language === "fr" ? it.q.fr : it.q.en}
                  </AccordionTrigger>
                  <AccordionContent className="text-gray-600 leading-relaxed">
                    {language === "fr" ? it.a.fr : it.a.en}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Formulaire de contact / question */}
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
                      <label className="text-sm font-medium text-pro-gray">{t.category}</label>
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
