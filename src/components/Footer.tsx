// src/components/Footer.tsx
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
  MessageCircle,
  Sparkles,
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
  const whatsappTel = cms("footer.contact.whatsapp_tel", phoneTel, phoneTel);
  const whatsappValue = cms("footer.contact.whatsapp_value", phoneValue, phoneValue);

  return (
    <>
      <footer className="relative overflow-hidden border-t border-white/10 bg-[#1e293b] text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="absolute -top-20 left-1/2 h-52 w-52 -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-white/[0.03] blur-3xl" />
          <div className="absolute right-0 top-1/3 h-44 w-44 rounded-full bg-blue-400/10 blur-3xl" />
        </div>

        <div className="relative mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-start gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 shadow-[0_16px_30px_rgba(37,99,235,0.28)]">
                  <span className="text-sm font-bold text-white">PS</span>
                </div>

                <div>
                  <div className="text-lg font-bold text-white">
                    {cms("brand.name", "ProxiServices", "ProxiServices")}
                  </div>
                  <div className="mt-1 max-w-xs text-sm leading-6 text-white/65">
                    {cms(
                      "footer.brand.tagline",
                      "Trouvez rapidement des prestataires fiables, près de chez vous.",
                      "Find trusted providers quickly, near you."
                    )}
                  </div>
                </div>
              </div>

              <p className="mt-5 max-w-sm text-sm leading-7 text-white/72">
                {cms(
                  "footer.brand.desc",
                  "Une plateforme moderne de mise en relation entre particuliers, entreprises et prestataires vérifiés dans plusieurs métiers du quotidien.",
                  "A modern platform connecting individuals, businesses and verified providers across multiple everyday services."
                )}
              </p>

              {social.length > 0 && (
                <div className="mt-5">
                  <div className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-white/40">
                    {cms("footer.social.follow_label", "Suivez-nous", "Follow us")}
                  </div>
                  <div className="flex items-center gap-2.5">
                    {social.map(({ name, href, Icon }) => (
                      <a
                        key={name}
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={name}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-white/65 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/10 hover:text-white"
                      >
                        <Icon className="h-4 w-4" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white/95">
                {cms("footer.services.title", "Services", "Services")}
              </h3>

              <ul className="mt-4 space-y-3 text-sm text-white/72">
                <li>{cms("footer.services.item1", "Bâtiment", "Construction")}</li>
                <li>{cms("footer.services.item2", "Plomberie", "Plumbing")}</li>
                <li>{cms("footer.services.item3", "Électricité", "Electrical")}</li>
                <li>{cms("footer.services.item4", "Jardinage", "Gardening")}</li>
                <li>{cms("footer.services.item5", "Informatique", "IT services")}</li>
              </ul>

              <button
                type="button"
                onClick={() => navigate("/#search")}
                className="mt-5 inline-flex items-center gap-2 text-sm text-blue-300 transition-colors hover:text-white"
              >
                {cms("footer.services.more", "Découvrir", "Explore")}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white/95">
                {cms("footer.company.title", "Entreprise", "Company")}
              </h3>

              <ul className="mt-4 space-y-3 text-sm text-white/72">
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

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/15 text-blue-300">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {cms(
                        "footer.company.promo.title",
                        "Développez votre visibilité",
                        "Grow your visibility"
                      )}
                    </div>
                    <div className="mt-1 text-sm leading-6 text-white/65">
                      {cms(
                        "footer.company.promo.text",
                        "Créez votre présence professionnelle et attirez davantage de clients dans votre zone.",
                        "Build your professional presence and attract more clients in your area."
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-sm font-semibold tracking-wide text-white/95">
                {cms("footer.contact.title", "Contact", "Contact")}
              </h3>

              <div className="mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_18px_40px_rgba(0,0,0,0.18)] backdrop-blur-sm">
                <div className="space-y-3">
                  <a
                    href={`mailto:${emailValue}`}
                    className="flex items-center justify-between gap-2 text-sm text-white/75 transition-colors hover:text-white"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      {cms("footer.contact.label_email", "Email", "Email")}
                    </span>
                    <span className="truncate font-medium text-white/90">{emailValue}</span>
                  </a>

                  <a
                    href={`tel:${phoneTel}`}
                    className="flex items-center justify-between gap-2 text-sm text-white/75 transition-colors hover:text-white"
                  >
                    <span className="inline-flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {cms("footer.contact.label_phone", "Téléphone", "Phone")}
                    </span>
                    <span className="truncate font-medium text-white/90">{phoneValue}</span>
                  </a>

                  <a
                    href={`https://wa.me/${whatsappTel.replace(/[^\d]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between gap-2 text-sm text-white/75 transition-colors hover:text-white"
                  >
                    <span className="inline-flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      {cms("footer.contact.label_whatsapp", "WhatsApp", "WhatsApp")}
                    </span>
                    <span className="truncate text-white/90">{whatsappValue}</span>
                  </a>

                  <div className="flex items-center justify-between gap-2 text-sm text-white/75">
                    <span className="inline-flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {cms("footer.contact.label_hours", "Horaires", "Hours")}
                    </span>
                    <span className="truncate text-white/90">{hoursValue}</span>
                  </div>
                </div>

                <Button
                  type="button"
                  className="mt-5 h-11 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-[0_12px_28px_rgba(37,99,235,0.25)] hover:from-blue-700 hover:to-blue-700"
                  onClick={() => setContactOpen(true)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {cms("footer.contact.button", "Contacter le support", "Contact support")}
                </Button>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 border-t border-white/10 pt-5 md:flex-row md:items-center md:justify-between">
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
