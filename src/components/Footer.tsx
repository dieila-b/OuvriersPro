import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  LifeBuoy,
  ArrowRight,
  MessageSquare,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import ContactModal from "@/components/contact/ContactModal";

const Footer = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = React.useState(false);

  const t = React.useMemo(() => {
    const fr = language === "fr";
    return {
      helpTitle: fr ? "Besoin d’aide ?" : "Need help?",
      helpDesc: fr
        ? "Contacte notre support ou consulte la FAQ."
        : "Contact support or browse the FAQ.",
      ctaSupport: fr ? "Contacter le support" : "Contact support",
      ctaFaq: fr ? "Voir la FAQ" : "View FAQ",

      brandDesc: fr
        ? "Trouvez des prestataires fiables près de chez vous, en quelques minutes."
        : "Find trusted providers near you in minutes.",
      marketplace: fr ? "Marketplace de services" : "Service marketplace",

      services: fr ? "Services" : "Services",
      company: fr ? "Entreprise" : "Company",
      resources: fr ? "Ressources" : "Resources",
      contact: fr ? "Contact" : "Contact",

      seeMore: fr ? "Découvrir" : "Explore",

      about: fr ? "À propos" : "About",
      partners: fr ? "Partenaires" : "Partners",

      terms: fr ? "Conditions d’utilisation" : "Terms of Use",
      privacy: fr ? "Politique de confidentialité" : "Privacy Policy",
      cookies: fr ? "Cookies" : "Cookies",

      openForm: fr ? "Ouvrir le formulaire" : "Open contact form",
      contactHint: fr
        ? "Réponse par email sous 24–48h (jours ouvrés)."
        : "Reply by email within 24–48h (business days).",
    };
  }, [language]);

  const year = new Date().getFullYear();

  // Mets tes URLs réelles ici (ou laisse "" pour masquer l’icône)
  const social = [
    { name: "Facebook", href: "", Icon: Facebook },
    { name: "Twitter", href: "", Icon: Twitter },
    { name: "Instagram", href: "", Icon: Instagram },
    { name: "LinkedIn", href: "", Icon: Linkedin },
  ].filter((s) => Boolean(s.href));

  return (
    <footer className="bg-pro-gray text-white">
      <div className="container mx-auto px-4 py-14">
        {/* ✅ Bandeau unique “Besoin d’aide ?” */}
        <div className="mb-10 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-white/80" />
                <h3 className="text-lg font-semibold">{t.helpTitle}</h3>
              </div>
              <p className="mt-1 text-sm text-white/70">{t.helpDesc}</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Button
                type="button"
                className="rounded-xl bg-pro-blue hover:bg-pro-blue/90 text-white flex items-center gap-2"
                onClick={() => setContactOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                {t.ctaSupport}
              </Button>

              <button
                type="button"
                onClick={() => navigate("/faq")}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/15 bg-white/0 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/10 transition-colors"
              >
                {t.ctaFaq}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* ✅ Grille principale (sans répétitions) */}
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-pro-blue flex items-center justify-center">
                <span className="font-bold">PS</span>
              </div>
              <div className="leading-tight">
                <div className="text-lg font-bold">ProxiServices</div>
                <div className="text-xs text-white/60">{t.marketplace}</div>
              </div>
            </div>

            <p className="mt-4 text-sm text-white/70 leading-relaxed">
              {t.brandDesc}
            </p>

            {/* ✅ Icônes sociales discrètes (et seulement si URLs fournies) */}
            {social.length > 0 && (
              <div className="mt-5 flex items-center gap-2">
                {social.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/0 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Services */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              {t.services}
            </h3>

            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>Bâtiment</li>
              <li>Plomberie</li>
              <li>Électricité</li>
              <li>Jardinage</li>
              <li>Informatique</li>
            </ul>

            <button
              type="button"
              onClick={() => navigate("/#search")}
              className="mt-4 inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors"
            >
              {t.seeMore} <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Entreprise + Ressources */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              {t.company}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/a-propos" className="hover:text-white transition-colors">
                  {t.about}
                </Link>
              </li>
              <li>
                <Link to="/partenaires" className="hover:text-white transition-colors">
                  {t.partners}
                </Link>
              </li>
            </ul>

            <h3 className="mt-8 text-sm font-semibold tracking-wide text-white/90">
              {t.resources}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link to="/conditions" className="hover:text-white transition-colors">
                  {t.terms}
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="hover:text-white transition-colors">
                  {t.privacy}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-white transition-colors">
                  {t.cookies}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact (sans répétition “anti-spam”) */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              {t.contact}
            </h3>

            <div className="mt-4 space-y-3">
              <a
                href="mailto:contact@proxiservices.com"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4" />
                <span className="truncate">contact@proxiservices.com</span>
              </a>

              <a
                href="tel:+33123456789"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Phone className="h-4 w-4" />
                +33 1 23 45 67 89
              </a>

              <Button
                type="button"
                className="w-full rounded-xl bg-pro-blue hover:bg-pro-blue/90 text-white flex items-center justify-center gap-2"
                onClick={() => setContactOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                {t.openForm}
              </Button>

              {/* ✅ Helper line unique */}
              <p className="text-xs text-white/60">{t.contactHint}</p>
            </div>
          </div>
        </div>

        {/* ✅ Bas de footer minimal (sans répéter les liens) */}
        <div className="mt-12 border-t border-white/10 pt-6">
          <p className="text-xs text-white/55">
            © {year} ProxiServices.{" "}
            {language === "fr" ? "Tous droits réservés." : "All rights reserved."}
          </p>
        </div>
      </div>

      <ContactModal
        open={contactOpen}
        onOpenChange={setContactOpen}
        defaultSubject="Support ProxiServices"
      />
    </footer>
  );
};

export default Footer;
