import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

export default function Partners() {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const t = React.useMemo(() => {
    const fr = language === "fr";
    return {
      title: fr ? "Partenaires" : "Partners",
      subtitle: fr
        ? "Collaborons pour développer l’accès à des services fiables."
        : "Let’s collaborate to expand access to trusted services.",
      p1: fr
        ? "Vous êtes une entreprise, une institution, une association ou un réseau de prestataires ? Nous pouvons construire des partenariats (référencement, offres, intégrations, opérations terrain)."
        : "Are you a company, institution, NGO, or provider network? We can build partnerships (listing, offers, integrations, field operations).",
      p2: fr
        ? "Contactez-nous via le formulaire Support pour une prise de contact rapide."
        : "Reach out via the Support form for a fast introduction.",
      back: fr ? "Retour à l'accueil" : "Back to home",
    };
  }, [language]);

  return (
    <section className="w-full bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 py-10 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray">{t.title}</h1>
            <Button variant="outline" className="rounded-xl" onClick={() => navigate("/")}>
              {t.back}
            </Button>
          </div>

          <p className="mt-2 text-gray-600">{t.subtitle}</p>

          <div className="mt-8 rounded-2xl border border-gray-200 bg-gray-50 p-5 sm:p-6">
            <p className="text-pro-gray leading-relaxed">{t.p1}</p>
            <p className="mt-4 text-pro-gray leading-relaxed">{t.p2}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
