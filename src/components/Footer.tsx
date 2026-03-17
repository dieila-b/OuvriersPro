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

  const social = [
    { name: "Facebook", href: cms("footer.social.facebook", "", ""), Icon: Facebook },
    { name: "Twitter", href: cms("footer.social.twitter", "", ""), Icon: Twitter },
    { name: "Instagram", href: cms("footer.social.instagram", "", ""), Icon: Instagram },
    { name: "LinkedIn", href: cms("footer.social.linkedin", "", ""), Icon: Linkedin },
  ].filter((s) => Boolean(s.href));

  const emailValue = cms(
    "footer.contact.email_value",
    "contact@proxiservices.com",
    "contact@proxiservices.com"
  );
  const phoneTel = cms("footer.contact.phone_tel", "+33123456789", "+33123456789");
  const phoneValue = cms(
    "footer.contact.phone_value",
    "+33 1 23 45 67 89",
    "+33 1 23 45 67 89"
  );
  const hoursValue = cms(
    "footer.contact.hours_value",
    "Lun–Ven • 09:00–18:00",
    "Mon–Fri • 09:00–18:00"
  );
  const locationValue = cms(
    "footer.location.value",
    "Conakry (et environs)",
    "Conakry (and nearby)"
  );

  return (
    <>
      <footer className="relative overflow-hidden border-t border-white/10 bg-pro-gray text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-pro-blue/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-white/[0.03] blur-3xl" />
          <div className="absolute right-0 top-1/3 h-36 w-36 rounded-full bg-pro-blue/5 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl min-w-0 px-4 py-8 sm:px-6 lg:px-8">
          <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-4">
            {/* Brand */}
            <div className="min-w-0">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-pro-blue shadow-[0_8px_30px_rgba(59,130,246,0.25)] ring-1 ring-white/10">
                  <span className="text-sm font-bold text-white">PS</span>
                </div>

                <div className="min-w-0 leading-tight">
                  <div className="text-base font-bold text-white">
                    {cms("brand.name", "ProxiServices", "ProxiServices")}
                  </div>
                  <div className="mt-0.5 break-words text-[11px] leading-relaxed text-white/60 md:truncate">
                    {cms(
                      "footer.brand.tagline",
                      "Trouvez rapidement des prestataires fiables, près de chez vous.",
                      "Find trusted providers quickly, near you."
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-4 w-full text-sm leading-relaxed text-white/70 md:max-w-sm">
                {cms(
                  "footer.brand.desc",
                  "Une plateforme de mise en relation entre particuliers/entreprises et prestataires vérifiés : services à domicile, santé, informatique, cours, et plus.",
                  "A platform connecting individuals/businesses with verified providers: home services, healthcare, IT, tutoring, and more."
                )}
              </p>

              {social.length > 0 && (
                <div className="mt-5 flex items-center gap-2">
                  {social.map(({ name, href, Icon }) => (
                    <a
                      key={name}
                      href={href}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={name}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    >
                      <Icon className="h-4 w-4" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {/* Services - Desktop uniquement */}
            <div className="hidden md:block">
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
                className="mt-4 inline-flex items-center gap-2 text-sm text-white/75 transition-colors hover:text-white"
              >
                {cms("footer.services.more", "Découvrir", "Explore")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            {/* Entreprise */}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-wide text-white/90">
                {cms("footer.company.title", "Entreprise", "Company")}
              </h3>

              {/* Mobile */}
              <div className="mt-4 grid grid-cols-3 items-center gap-2 text-center text-sm text-white/70 md:hidden">
                <Link to="/faq" className="transition-colors hover:text-white">
                  {cms("footer.links.faq", "FAQ", "FAQ")}
                </Link>
                <Link to="/a-propos" className="transition-colors hover:text-white">
                  {cms("footer.links.about", "À propos", "About")}
                </Link>
                <Link to="/partenaires" className="transition-colors hover:text-white">
                  {cms("footer.links.partners", "Partenaires", "Partners")}
                </Link>
              </div>

              {/* Desktop */}
              <ul className="mt-4 hidden space-y-2 text-sm text-white/70 md:block">
                <li>
                  <Link to="/faq" className="transition-colors hover:text-white">
                    {cms("footer.links.faq", "FAQ", "FAQ")}
                  </Link>
                </li>
                <li>
                  <Link to="/a-propos" className="transition-colors hover:text-white">
                    {cms("footer.links.about", "À propos", "About")}
                  </Link>
                </li>
                <li>
                  <Link to="/partenaires" className="transition-colors hover:text-white">
                    {cms("footer.links.partners", "Partenaires", "Partners")}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="min-w-0">
              <h3 className="text-sm font-semibold tracking-wide text-white/90">
                {cms("footer.contact.title", "Contact", "Contact")}
              </h3>

              {/* Mobile / Emulator : bouton uniquement */}
              <div className="mt-4 md:hidden">
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-white/8 to-white/[0.03] p-3 shadow-[0_10px_35px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                  <Button
                    type="button"
                    className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-pro-blue text-white shadow-[0_10px_30px_rgba(59,130,246,0.30)] transition-all duration-200 hover:bg-pro-blue/90"
                    onClick={() => setContactOpen(true)}
                  >
                    <MessageSquare className="h-4 w-4" />
                    {cms("footer.contact.button", "Contacter le support", "Contact support")}
                  </Button>
                </div>
              </div>

              {/* Desktop : rendu inchangé avec détails visibles */}
              <div className="mt-4 hidden min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm md:block">
                <div className="min-w-0 space-y-3">
                  <a
                    href={`mailto:${emailValue}`}
                    className="flex min-w-0 items-center justify-between gap-2 text-sm transition-colors hover:text-white"
                  >
                    <span className="inline-flex shrink-0 items-center gap-2 text-white/70">
                      <Mail className="h-4 w-4 shrink-0" />
                      {cms("footer.contact.label_email", "Email", "Email")}
                    </span>
                    <span className="truncate text-right font-medium text-white/90">
                      {emailValue}
                    </span>
                  </a>

                  <a
                    href={`tel:${phoneTel}`}
                    className="flex min-w-0 items-center justify-between gap-2 text-sm transition-colors hover:text-white"
                  >
                    <span className="inline-flex shrink-0 items-center gap-2 text-white/70">
                      <Phone className="h-4 w-4 shrink-0" />
                      {cms("footer.contact.label_phone", "Téléphone", "Phone")}
                    </span>
                    <span className="truncate text-right font-medium text-white/90">
                      {phoneValue}
                    </span>
                  </a>

                  <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
                    <span className="inline-flex shrink-0 items-center gap-2 text-white/70">
                      <Clock className="h-4 w-4 shrink-0" />
                      {cms("footer.contact.label_hours", "Horaires", "Hours")}
                    </span>
                    <span className="truncate text-right text-white/85">{hoursValue}</span>
                  </div>

                  <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
                    <span className="inline-flex shrink-0 items-center gap-2 text-white/70">
                      <MapPin className="h-4 w-4 shrink-0" />
                      {cms("footer.contact.label_zone", "Zone", "Service area")}
                    </span>
                    <span className="truncate text-right text-white/85">
                      {locationValue}
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-pro-blue text-white shadow-[0_10px_30px_rgba(59,130,246,0.25)] transition-all hover:bg-pro-blue/90"
                  onClick={() => setContactOpen(true)}
                >
                  <MessageSquare className="h-4 w-4" />
                  {cms("footer.contact.button", "Contacter le support", "Contact support")}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex min-w-0 flex-col gap-3 border-t border-white/10 pt-4 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-white/55">
              {cms(
                "footer.bottom.rights",
                `© ${year} ProxiServices. Tous droits réservés.`,
                `© ${year} ProxiServices. All rights reserved.`
              )}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/60">
              <Link to="/conditions" className="transition-colors hover:text-white">
                {cms("legal.terms.title", "Conditions d'utilisation", "Terms & Conditions")}
              </Link>
              <Link to="/confidentialite" className="transition-colors hover:text-white">
                {cms("legal.privacy.title", "Politique de confidentialité", "Privacy Notice")}
              </Link>
              <Link to="/cookies" className="transition-colors hover:text-white">
                {cms("legal.cookies.title", "Cookies", "Cookie Policy")}
              </Link>
            </div>
          </div>
        </div>

        <ContactModal
          open={contactOpen}
          onOpenChange={setContactOpen}
          defaultSubject={cms(
            "contact.modal.title",
            "Support ProxiServices",
            "ProxiServices Support"
          )}
        />
      </footer>
    </>
  );
};

export default Footer;
