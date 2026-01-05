import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Cookies() {
  const { language } = useLanguage();

  const t = useMemo(() => {
    const isFr = language === "fr";
    return {
      title: isFr ? "Cookies" : "Cookies",
      updated: isFr ? "Dernière mise à jour : 2026-01-05" : "Last updated: 2026-01-05",
      back: isFr ? "Retour à l’accueil" : "Back to home",
      intro: isFr
        ? "Nous utilisons des cookies et technologies similaires pour assurer le fonctionnement, la sécurité et l’amélioration de la plateforme."
        : "We use cookies and similar technologies to operate, secure, and improve the platform.",
      blocks: isFr
        ? [
            { h: "1. Cookies strictement nécessaires", p: "Indispensables au fonctionnement (session, sécurité, préférences essentielles). Ils ne peuvent pas être désactivés." },
            { h: "2. Mesure d’audience (optionnel)", p: "Permet d’analyser l’usage afin d’améliorer l’expérience. Activés uniquement si vous y consentez, lorsque applicable." },
            { h: "3. Gestion", p: "Vous pouvez gérer les cookies via les paramètres de votre navigateur. Certaines fonctions peuvent être limitées si vous bloquez les cookies." },
          ]
        : [
            { h: "1. Strictly necessary cookies", p: "Required for core functionality (session, security, essential preferences). They cannot be disabled." },
            { h: "2. Analytics (optional)", p: "Helps us understand usage to improve the experience. Enabled only with consent where applicable." },
            { h: "3. Controls", p: "You can manage cookies in your browser settings. Blocking cookies may limit some features." },
          ],
    };
  }, [language]);

  return (
    <section className="w-full bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 py-10 sm:py-12">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-pro-gray">{t.title}</h1>
            <Link
              to="/"
              className="text-sm text-gray-600 hover:text-pro-blue underline underline-offset-4 whitespace-nowrap"
            >
              {t.back}
            </Link>
          </div>

          <p className="mt-2 text-sm text-gray-500">{t.updated}</p>
          <p className="mt-6 text-gray-700 leading-relaxed">{t.intro}</p>

          <div className="mt-8 space-y-6">
            {t.blocks.map((b) => (
              <div key={b.h} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="text-base font-semibold text-pro-gray">{b.h}</h2>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">{b.p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
