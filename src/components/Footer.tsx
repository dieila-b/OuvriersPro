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

      terms: fr ? "Conditions d'utilisation" : "Terms of Use",
      privacy: fr ? "Politique de confidentialité" : "Privacy Policy",
      cookies: fr ? "Cookies" : "Cookies",

      contactHint: fr
        ? "Support sous 24–48h (jours ouvrés)."
        : "Support within 24–48h (business days).",
      openForm: fr ? "Contacter le support" : "Contact support",

      hoursValue: fr ? "Lun–Ven • 09:00–18:00" : "Mon–Fri • 09:00–18:00",
      locationValue: fr ? "Conakry (et environs)" : "Conakry (and nearby)",

      rights: fr ? "Tous droits réservés." : "All rights reserved.",
    };
  }, [language]);

  const year = new Date().getFullYear();

  // Si tu veux afficher les réseaux, mets des URLs réelles ici.
  // Pour rester “exactement comme la capture”, on les masque par défaut.
  const social = [
    { name: "Facebook", href: "", Icon: Facebook },
    { name: "Twitter", href: "", Icon: Twitter },
    { name: "Instagram", href: "", Icon: Instagram },
    { name: "LinkedIn", href: "", Icon: Linkedin },
  ].filter((s) => Boolean(s.href));

  return (
    <footer className="bg-pro-gray text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Haut: 4 colonnes */}
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-pro-blue flex items-center justify-center">
                <span className="text-sm font-bold">PS</span>
              </div>
              <div className="leading-tight">
                <div className="text-base font-bold">ProxiServices</div>
                <div className="text-[11px] text-white/60">{t.marketplace}</div>
              </div>
            </div>

            <p className="mt-4 max-w-sm text-sm text-white/70 leading-relaxed">
              {t.brandDesc}
            </p>

            {/* Réseaux (désactivés par défaut pour coller à la capture) */}
            {social.length > 0 && (
              <div className="mt-4 flex items-center gap-2">
                {social.map(({ name, href, Icon }) => (
                  <a
                    key={name}
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={name}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/0 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
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
                <Link
                  to="/confidentialite"
                  className="hover:text-white transition-colors"
                >
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

          {/* Contact (exact capture) */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              {t.contact}
            </h3>
            <p className="mt-2 text-sm text-white/65">{t.contactHint}</p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              {/* Lignes (gauche label + droite valeur) */}
              <div className="space-y-3">
                <a
                  href="mailto:contact@proxiservices.com"
                  className="flex items-center justify-between gap-4 text-sm hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <Mail className="h-4 w-4" />
                    {language === "fr" ? "Email" : "Email"}
                  </span>
                  <span className="font-medium text-white/90 truncate">
                    contact@proxiservices.com
                  </span>
                </a>

                <a
                  href="tel:+33123456789"
                  className="flex items-center justify-between gap-4 text-sm hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <Phone className="h-4 w-4" />
                    {language === "fr" ? "Téléphone" : "Phone"}
                  </span>
                  <span className="font-medium text-white/90">+33 1 23 45 67 89</span>
                </a>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <Clock className="h-4 w-4" />
                    {language === "fr" ? "Horaires" : "Hours"}
                  </span>
                  <span className="text-white/85">{t.hoursValue}</span>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <MapPin className="h-4 w-4" />
                    {language === "fr" ? "Zone" : "Area"}
                  </span>
                  <span className="text-white/85">{t.locationValue}</span>
                </div>
              </div>

              {/* Bouton */}
              <Button
                type="button"
                className="mt-4 w-full rounded-xl bg-pro-blue hover:bg-pro-blue/90 text-white flex items-center justify-center gap-2"
                onClick={() => setContactOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                {t.openForm}
              </Button>
            </div>
          </div>
        </div>

        {/* Bas (exact capture: copyright gauche + liens droite) */}
        <div className="mt-8 border-t border-white/10 pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
