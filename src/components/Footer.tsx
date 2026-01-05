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
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [contactOpen, setContactOpen] = React.useState(false);

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  const year = new Date().getFullYear();

  // Réseaux : masqués par défaut (comme ta capture). Mets des URLs pour les afficher.
  const social = [
    { name: "Facebook", href: cms("footer.social.facebook", "", ""), Icon: Facebook },
    { name: "Twitter", href: cms("footer.social.twitter", "", ""), Icon: Twitter },
    { name: "Instagram", href: cms("footer.social.instagram", "", ""), Icon: Instagram },
    { name: "LinkedIn", href: cms("footer.social.linkedin", "", ""), Icon: Linkedin },
  ].filter((s) => Boolean(s.href));

  return (
    <footer className="bg-pro-gray text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-pro-blue flex items-center justify-center">
                <span className="text-sm font-bold">PS</span>
              </div>
              <div className="leading-tight">
                <div className="text-base font-bold">ProxiServices</div>
                <div className="text-[11px] text-white/60">
                  {cms("footer.brand.tagline", "Marketplace de services", "Service marketplace")}
                </div>
              </div>
            </div>

            <p className="mt-4 max-w-sm text-sm text-white/70 leading-relaxed">
              {cms(
                "footer.brand.desc",
                "Trouvez des prestataires fiables près de chez vous, en quelques minutes.",
                "Connect with trusted professionals near you in minutes."
              )}
            </p>

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
              {cms("footer.services.title", "Services", "Services")}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>{cms("footer.services.item1", "Bâtiment", "Construction")}</li>
              <li>{cms("footer.services.item2", "Plomberie", "Plumbing")}</li>
              <li>{cms("footer.services.item3", "Électricité", "Electrical")}</li>
              <li>{cms("footer.services.item4", "Jardinage", "Gardening")}</li>
              <li>{cms("footer.services.item5", "Informatique", "IT services")}</li>
            </ul>

            <button
              type="button"
              onClick={() => navigate("/#search")}
              className="mt-4 inline-flex items-center gap-2 text-sm text-white/75 hover:text-white transition-colors"
            >
              {cms("footer.services.more", "Découvrir", "Explore")} <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Entreprise + Ressources */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              {cms("footer.company.title", "Entreprise", "Company")}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link to="/faq" className="hover:text-white transition-colors">
                  {cms("footer.links.faq", "FAQ", "FAQ")}
                </Link>
              </li>
              <li>
                <Link to="/a-propos" className="hover:text-white transition-colors">
                  {cms("footer.links.about", "À propos", "About")}
                </Link>
              </li>
              <li>
                <Link to="/partenaires" className="hover:text-white transition-colors">
                  {cms("footer.links.partners", "Partenaires", "Partners")}
                </Link>
              </li>
            </ul>

            <h3 className="mt-8 text-sm font-semibold tracking-wide text-white/90">
              {cms("footer.resources.title", "Ressources", "Resources")}
            </h3>
            <ul className="mt-4 space-y-2 text-sm text-white/70">
              <li>
                <Link to="/conditions" className="hover:text-white transition-colors">
                  {cms("legal.terms.title", "Conditions d’utilisation", "Terms & Conditions")}
                </Link>
              </li>
              <li>
                <Link to="/confidentialite" className="hover:text-white transition-colors">
                  {cms("legal.privacy.title", "Politique de confidentialité", "Privacy Notice")}
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="hover:text-white transition-colors">
                  {cms("legal.cookies.title", "Cookies", "Cookie Policy")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-sm font-semibold tracking-wide text-white/90">
              {cms("footer.contact.title", "Contact", "Contact")}
            </h3>

            <p className="mt-2 text-sm text-white/65">
              {cms("footer.contact_hint", "Support sous 24–48h (jours ouvrés).", "We typically respond within 24–48 business hours.")}
            </p>

            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="space-y-3">
                <a
                  href={`mailto:${cms("footer.contact.email_value", "contact@proxiservices.com", "contact@proxiservices.com")}`}
                  className="flex items-center justify-between gap-4 text-sm hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <Mail className="h-4 w-4" />
                    {cms("footer.contact.label_email", "Email", "Email")}
                  </span>
                  <span className="font-medium text-white/90 truncate">
                    {cms("footer.contact.email_value", "contact@proxiservices.com", "contact@proxiservices.com")}
                  </span>
                </a>

                <a
                  href={`tel:${cms("footer.contact.phone_tel", "+33123456789", "+33123456789")}`}
                  className="flex items-center justify-between gap-4 text-sm hover:text-white transition-colors"
                >
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <Phone className="h-4 w-4" />
                    {cms("footer.contact.label_phone", "Téléphone", "Phone")}
                  </span>
                  <span className="font-medium text-white/90">
                    {cms("footer.contact.phone_value", "+33 1 23 45 67 89", "+33 1 23 45 67 89")}
                  </span>
                </a>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <Clock className="h-4 w-4" />
                    {cms("footer.contact.label_hours", "Horaires", "Hours")}
                  </span>
                  <span className="text-white/85">
                    {cms("footer.contact.hours_value", "Lun–Ven • 09:00–18:00", "Mon–Fri • 09:00–18:00")}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 text-sm">
                  <span className="inline-flex items-center gap-2 text-white/70">
                    <MapPin className="h-4 w-4" />
                    {cms("footer.contact.label_zone", "Zone", "Service area")}
                  </span>
                  <span className="text-white/85">
                    {cms("footer.contact.location_value", "Conakry (et environs)", "Conakry (and nearby)")}
                  </span>
                </div>
              </div>

              <Button
                type="button"
                className="mt-4 w-full rounded-xl bg-pro-blue hover:bg-pro-blue/90 text-white flex items-center justify-center gap-2"
                onClick={() => setContactOpen(true)}
              >
                <MessageSquare className="h-4 w-4" />
                {cms("footer.contact.cta", "Contacter le support", "Contact support")}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-white/10 pt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/55">
            © {year} ProxiServices. {cms("footer.bottom.rights", "Tous droits réservés.", "All rights reserved.")}
          </p>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60">
            <Link to="/conditions" className="hover:text-white transition-colors">
              {cms("legal.terms.title", "Conditions d’utilisation", "Terms & Conditions")}
            </Link>
            <Link to="/confidentialite" className="hover:text-white transition-colors">
              {cms("legal.privacy.title", "Politique de confidentialité", "Privacy Notice")}
            </Link>
            <Link to="/cookies" className="hover:text-white transition-colors">
              {cms("legal.cookies.title", "Cookies", "Cookie Policy")}
            </Link>
          </div>
        </div>
      </div>

      <ContactModal open={contactOpen} onOpenChange={setContactOpen} defaultSubject="Support ProxiServices" />
    </footer>
  );
};

export default Footer;
