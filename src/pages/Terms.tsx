import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Terms() {
  const { language } = useLanguage();

  const t = useMemo(() => {
    const isFr = language === "fr";
    return {
      title: isFr ? "Conditions d’utilisation" : "Terms of Use",
      updated: isFr ? "Dernière mise à jour : 2026-01-05" : "Last updated: 2026-01-05",
      back: isFr ? "Retour à l’accueil" : "Back to home",
      intro: isFr
        ? "Ces conditions encadrent l’utilisation de ProxiServices. En utilisant la plateforme, vous acceptez ces conditions."
        : "These terms govern your use of ProxiServices. By using the platform, you agree to these terms.",
      sections: isFr
        ? [
            {
              h: "1. Objet",
              p: "ProxiServices met en relation des clients et des prestataires de services. La plateforme fournit des outils de recherche, de mise en contact et de messagerie.",
            },
            {
              h: "2. Comptes et accès",
              p: "Certaines fonctionnalités nécessitent un compte (contacter un prestataire, avis, favoris). Vous êtes responsable de la confidentialité de vos identifiants.",
            },
            {
              h: "3. Règles d’utilisation",
              p: "Vous vous engagez à utiliser la plateforme de manière licite, à ne pas publier de contenu illégal ou trompeur, et à respecter les autres utilisateurs.",
            },
            {
              h: "4. Prestataires et prestations",
              p: "Les prestataires sont responsables des informations affichées, de leurs tarifs et de la qualité des prestations. ProxiServices n’est pas partie au contrat conclu entre client et prestataire.",
            },
            {
              h: "5. Contenus, avis et signalements",
              p: "Les avis doivent être sincères et respectueux. Tout contenu abusif peut être modéré. Vous pouvez signaler un comportement suspect via le support.",
            },
            {
              h: "6. Limitation de responsabilité",
              p: "ProxiServices met à disposition une plateforme. Nous ne garantissons pas la disponibilité continue, ni l’absence d’erreurs. Dans la limite permise par la loi, notre responsabilité est limitée.",
            },
            {
              h: "7. Suspension et résiliation",
              p: "Nous pouvons suspendre ou fermer un compte en cas de non-respect des conditions, de fraude ou d’abus.",
            },
            {
              h: "8. Modifications",
              p: "Nous pouvons modifier ces conditions. La version en vigueur est celle publiée sur cette page.",
            },
            {
              h: "9. Contact",
              p: "Pour toute question, utilisez le formulaire de contact dans l’application ou écrivez à support@proxiservices.com.",
            },
          ]
        : [
            {
              h: "1. Purpose",
              p: "ProxiServices connects customers with service providers. The platform offers search, contact, and messaging tools.",
            },
            {
              h: "2. Accounts & access",
              p: "Some features require an account (contacting providers, reviews, favorites). You are responsible for keeping your credentials secure.",
            },
            {
              h: "3. Acceptable use",
              p: "You agree to use the platform lawfully, not to post illegal or misleading content, and to respect other users.",
            },
            {
              h: "4. Providers & services",
              p: "Providers are responsible for their information, pricing, and service quality. ProxiServices is not a party to contracts between customers and providers.",
            },
            {
              h: "5. Content, reviews & reports",
              p: "Reviews must be honest and respectful. Abusive content may be moderated. You can report suspicious behavior via support.",
            },
            {
              h: "6. Limitation of liability",
              p: "ProxiServices provides a platform. We do not guarantee uninterrupted availability or error-free service. To the extent permitted by law, our liability is limited.",
            },
            {
              h: "7. Suspension & termination",
              p: "We may suspend or close accounts for violations, fraud, or abuse.",
            },
            {
              h: "8. Changes",
              p: "We may update these terms. The version in force is the one published on this page.",
            },
            {
              h: "9. Contact",
              p: "For questions, use the in-app contact form or email support@proxiservices.com.",
            },
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
            {t.sections.map((s) => (
              <div key={s.h} className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
                <h2 className="text-base font-semibold text-pro-gray">{s.h}</h2>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">{s.p}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
