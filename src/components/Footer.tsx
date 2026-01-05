import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  MessageSquare,
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  Clock,
  MapPin,
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

      // Contact
      contactTitle: fr ? "Contact" : "Contact",
      contactSubtitle: fr
        ? "Une question ? Notre équipe vous répond rapidement."
        : "Questions? Our team replies quickly.",
      emailLabel: fr ? "Email" : "Email",
      phoneLabel: fr ? "Téléphone" : "Phone",
      hoursLabel: fr ? "Horaires" : "Hours",
      hoursValue: fr ? "Lun–Ven • 09:00–18:00" : "Mon–Fri • 09:00–18:00",
      locationLabel: fr ? "Zone" : "Area",
      locationValue: fr ? "Guinée • Conakry (et environs)" : "Guinea • Conakry (and nearby)",
      openForm: fr ? "Contacter le support" : "Contact support",
      contactHint: fr
        ? "Réponse sous 24–48h (jours ouvrés)."
        : "Reply within 24–48h (business days).",

      // Footer bottom
      rights: fr ? "Tous droits réservés." : "All rights reserved.",
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
        {/* ✅ Grille principale (sans bandeau “Besoin d’aide ?”) */}
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

            {/* ✅ Icônes sociales discrètes (seulement si URLs fournies) */}
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

          {/* ✅ Contact amélioré */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              {t.contactTitle}
            </h3>
            <p className="mt-2 text-sm text-white/65">{t.contactSubtitle}</p>

            <div className="mt-4 space-y-3">
              {/* Email */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Mail className="h-4 w-4" />
                  <span>{t.emailLabel}</span>
                </div>
                <a
                  href="mailto:contact@proxiservices.com"
                  className="mt-2 block text-sm font-medium text-white/90 hover:text-white"
                >
                  contact@proxiservices.com
                </a>
              </div>

              {/* Téléphone */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Phone className="h-4 w-4" />
                  <span>{t.phoneLabel}</span>
                </div>
                <a
                  href="tel:+33123456789"
                  className="mt-2 block text-sm font-medium text-white/90 hover:text-white"
                >
                  +33 1 23 45 67 89
                </a>
              </div>

              {/* Infos pro (horaires + zone) */}
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2 text-xs text-white/60">
                  <Clock className="h-4 w-4" />
                  <span>{t.hoursLabel}</span>
                </div>
                <div className="mt-2 text-sm text-white/80">{t.hoursValue}</div>

                <div className="mt-3 flex items-center gap-2 text-xs text-white/60">
                  <MapPin className="h-4 w-4" />
                  <span>{t.locationLabel}</span>
                </div>
                <div className="mt-2 text-sm text-white/80">{t.locationValue}</div>
              </div>

              {/* CTA */}
              <Button
                type="button"
                className="w-full rounded-xl bg-pro-blue hover:bg-pro-blue/90 text-white flex items-center justify-center gap-2"
                onClick={() => setContactOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                {t.openForm}
              </Button>

              <p className="text-xs text-white/60">{t.contactHint}</p>
            </div>
          </div>
        </div>

        {/* ✅ Bas minimal */}
        <div className="mt-12 border-t border-white/10 pt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/55">
            © {year} ProxiServices. {t.rights}
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

      <ContactModal
        open={contactOpen}
        onOpenChange={setContactOpen}
        defaultSubject="Support ProxiServices"
      />
    </footer>
  );
};

export default Footer;
