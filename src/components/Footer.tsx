import React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  LifeBuoy,
  ArrowRight,
  MessageSquare,
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
      helpDesc: fr ? "Contactez le support ou consultez notre FAQ." : "Contact support or browse our FAQ.",
      ctaSupport: fr ? "Contacter le support" : "Contact support",
      ctaFaq: fr ? "Aide / FAQ" : "Help / FAQ",

      brandDesc: fr
        ? "Trouvez rapidement des prestataires fiables près de chez vous."
        : "Find trusted providers near you—fast.",
      services: fr ? "Services" : "Services",
      company: fr ? "Entreprise" : "Company",
      resources: fr ? "Ressources" : "Resources",
      contact: fr ? "Contact" : "Contact",

      seeMore: fr ? "Voir tous les services" : "See all services",

      terms: fr ? "Conditions d'utilisation" : "Terms of Use",
      privacy: fr ? "Politique de confidentialité" : "Privacy Policy",
      cookies: fr ? "Cookies" : "Cookies",

      about: fr ? "À propos" : "About",
      partners: fr ? "Partenaires" : "Partners",

      openForm: fr ? "Ouvrir le formulaire" : "Open contact form",
      replyInfo: fr ? "Réponse par email sous 24–48h." : "Email reply within 24–48h.",
    };
  }, [language]);

  const year = new Date().getFullYear();

  // ✅ Services -> liens qui pré-filtrent la recherche
  const serviceLinks = React.useMemo(
    () => [
      { label: language === "fr" ? "Bâtiment" : "Construction", keyword: "bâtiment" },
      { label: language === "fr" ? "Plomberie" : "Plumbing", keyword: "plombier" },
      { label: language === "fr" ? "Électricité" : "Electrical", keyword: "électricien" },
      { label: language === "fr" ? "Jardinage" : "Gardening", keyword: "jardinage" },
      { label: language === "fr" ? "Informatique" : "IT", keyword: "informatique" },
    ],
    [language]
  );

  const goToSearchKeyword = (keyword: string) => {
    // Important: ton Index.tsx récupère keyword depuis location.search et déclenche op:search
    const q = new URLSearchParams();
    q.set("keyword", keyword);
    navigate(`/?${q.toString()}#search`);
  };

  return (
    <footer className="bg-pro-gray text-white">
      <div className="container mx-auto px-4 py-14">
        {/* Top Help Banner */}
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

        {/* Main grid */}
        <div className="grid gap-10 md:grid-cols-4">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-pro-blue flex items-center justify-center">
                <span className="font-bold">PS</span>
              </div>
              <div className="leading-tight">
                <div className="text-lg font-bold">ProxiServices</div>
                <div className="text-xs text-white/60">
                  {language === "fr" ? "Marketplace de services" : "Service marketplace"}
                </div>
              </div>
            </div>

            <p className="mt-4 text-sm text-white/70 leading-relaxed">{t.brandDesc}</p>

            <div className="mt-5 flex items-center gap-2">
              <a
                href="#"
                aria-label="Facebook"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Twitter"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Twitter className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="Instagram"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="#"
                aria-label="LinkedIn"
                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Services (pré-filtre) */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">{t.services}</h3>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              {serviceLinks.map((s) => (
                <li key={s.keyword}>
                  <button
                    type="button"
                    onClick={() => goToSearchKeyword(s.keyword)}
                    className="text-left hover:text-white transition-colors"
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={() => navigate("/#search")}
              className="mt-4 inline-flex items-center gap-2 text-sm text-white/80 hover:text-white transition-colors"
            >
              {t.seeMore} <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Company + Resources (pages réelles) */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">{t.company}</h3>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  {t.ctaFaq}
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

            <h3 className="mt-8 text-sm font-semibold tracking-wide text-white/90">{t.resources}</h3>
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

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">{t.contact}</h3>

            <div className="mt-4 space-y-3">
              <a
                href="mailto:contact@proxiservices.com"
                className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <Mail className="h-4 w-4" />
                contact@proxiservices.com
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

              <p className="text-xs text-white/60">{t.replyInfo}</p>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 border-t border-white/10 pt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/55">
            © {year} ProxiServices. {language === "fr" ? "Tous droits réservés." : "All rights reserved."}
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60">
            <Link to="/conditions" className="hover:text-white transition-colors">
              {t.terms}
            </Link>
            <Link to="/confidentialite" className="hover:text-white transition-colors">
              {t.privacy}
            </Link>
            <Link to="/cookies" className="hover:text-white transition-colors">
              {t.cookies}
            </Link>
          </div>
        </div>
      </div>

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} defaultSubject="Support ProxiServices" />
    </footer>
  );
};

export default Footer;
