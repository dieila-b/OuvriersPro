import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Privacy() {
  const { language } = useLanguage();

  const t = useMemo(() => {
    const isFr = language === "fr";
    return {
      title: isFr ? "Politique de confidentialité" : "Privacy Policy",
      updated: isFr ? "Dernière mise à jour : 2026-01-05" : "Last updated: 2026-01-05",
      back: isFr ? "Retour à l’accueil" : "Back to home",
      intro: isFr
        ? "Cette politique explique quelles données nous collectons, pourquoi et comment vous pouvez exercer vos droits."
        : "This policy explains what data we collect, why, and how you can exercise your rights.",
      items: isFr
        ? [
            { h: "1. Données collectées", p: "Données de compte, informations de profil, messages, avis, données techniques (logs, navigateur), et informations nécessaires au fonctionnement du service." },
            { h: "2. Finalités", p: "Fourniture du service, mise en relation, sécurité, prévention de la fraude/spam, support client, amélioration du produit." },
            { h: "3. Base légale", p: "Exécution du contrat, intérêt légitime (sécurité), consentement lorsque requis." },
            { h: "4. Partage", p: "Nous ne vendons pas vos données. Partage uniquement avec des prestataires techniques (hébergement, email) et lorsque requis par la loi." },
            { h: "5. Conservation", p: "Conservation limitée au nécessaire. Certaines données peuvent être conservées pour obligations légales ou sécurité." },
            { h: "6. Sécurité", p: "Mesures techniques et organisationnelles pour protéger les données (contrôles d’accès, journalisation, etc.)." },
            { h: "7. Vos droits", p: "Accès, rectification, suppression, opposition, limitation et portabilité selon le cadre applicable." },
            { h: "8. Contact", p: "Pour exercer vos droits : support@proxiservices.com." },
          ]
        : [
            { h: "1. Data we collect", p: "Account data, profile information, messages, reviews, technical data (logs, browser), and data needed to operate the service." },
            { h: "2. Purposes", p: "Provide the service, connect users, security, fraud/spam prevention, customer support, product improvement." },
            { h: "3. Legal basis", p: "Contract performance, legitimate interest (security), consent where required." },
            { h: "4. Sharing", p: "We do not sell your data. We share only with technical providers (hosting, email) and where required by law." },
            { h: "5. Retention", p: "We keep data only as long as necessary. Some data may be retained for legal obligations or security." },
            { h: "6. Security", p: "Technical and organizational measures (access controls, logging, etc.)." },
            { h: "7. Your rights", p: "Access, correction, deletion, objection, restriction, portability as applicable." },
            { h: "8. Contact", p: "To exercise your rights: support@proxiservices.com." },
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
            {t.items.map((s) => (
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
