// src/components/Footer.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Facebook,
  Twitter,
  Instagram,
  Linkedin,
  Mail,
  Phone,
  MessageSquare,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import ContactModal from "@/components/contact/ContactModal";

const Footer = () => {
  const { language } = useLanguage();
  const [contactOpen, setContactOpen] = React.useState(false);

  const year = new Date().getFullYear();

  const copy = React.useMemo(() => {
    const isFr = language === "fr";
    return {
      brand: "ProxiServices",
      tagline: isFr
        ? "Trouvez rapidement des prestataires fiables, près de chez vous."
        : "Find trusted professionals, fast — near you.",
      desc: isFr
        ? "Une plateforme de mise en relation entre particuliers/entreprises et prestataires vérifiés : services à domicile, santé, informatique, cours, et plus."
        : "A marketplace connecting individuals/businesses with verified providers: home services, health, IT, tutoring, and more.",
      ctaTitle: isFr ? "Besoin d’aide ?" : "Need help?",
      ctaSub: isFr
        ? "Notre équipe vous répond par email. Anti-spam activé."
        : "Our team replies by email. Anti-spam enabled.",
      ctaBtn: isFr ? "Contacter le support" : "Contact support",
      services: isFr ? "Services" : "Services",
      company: isFr ? "Entreprise" : "Company",
      resources: isFr ? "Ressources" : "Resources",
      contact: isFr ? "Contact" : "Contact",
      helpFaq: isFr ? "Aide / FAQ" : "Help / FAQ",
      about: isFr ? "À propos" : "About",
      partners: isFr ? "Partenaires" : "Partners",
      terms: isFr ? "Conditions d'utilisation" : "Terms of use",
      privacy: isFr ? "Politique de confidentialité" : "Privacy policy",
      cookies: isFr ? "Cookies" : "Cookies",
      rights: isFr ? "Tous droits réservés." : "All rights reserved.",
      seeMore: isFr ? "Voir plus" : "See more",
      mail: "contact@proxiservices.com",
      phone: "+33 1 23 45 67 89",
      phoneHref: "tel:+33123456789",
      mailHref: "mailto:contact@proxiservices.com",
    };
  }, [language]);

  return (
    <>
      <footer className="bg-pro-gray text-white">
        <div className="container mx-auto px-4 py-14 sm:py-16">
          {/* Top CTA */}
          <div className="mb-10 rounded-3xl border border-white/10 bg-white/5 p-6 sm:p-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h3 className="text-lg sm:text-xl font-semibold">{copy.ctaTitle}</h3>
                <p className="mt-1 text-sm text-white/70">{copy.ctaSub}</p>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  onClick={() => setContactOpen(true)}
                  className="rounded-xl bg-pro-blue hover:bg-pro-blue/90 flex items-center gap-2"
                >
                  <MessageSquare className="w-4 h-4" />
                  {copy.ctaBtn}
                </Button>

                <Link
                  to="/faq"
                  className="inline-flex items-center gap-1 text-sm text-white/75 hover:text-white transition-colors"
                >
                  {copy.helpFaq} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </div>

          {/* Main grid */}
          <div className="grid gap-10 md:grid-cols-4">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 bg-pro-blue rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">PS</span>
                </div>
                <div className="min-w-0">
                  <div className="text-lg font-bold leading-tight">{copy.brand}</div>
                  <div className="text-xs text-white/60">{copy.tagline}</div>
                </div>
              </div>

              <p className="mt-4 text-sm text-white/70 leading-relaxed">{copy.desc}</p>

              <div className="mt-5 flex items-center gap-3">
                <a
                  href="#"
                  aria-label="Facebook"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Facebook className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  aria-label="Twitter"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  aria-label="Instagram"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Linkedin className="w-4 h-4" />
                </a>
              </div>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-sm font-semibold tracking-wide text-white/90">{copy.services}</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>
                  <span className="hover:text-white transition-colors cursor-default">
                    {language === "fr" ? "Bâtiment" : "Construction"}
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-default">
                    {language === "fr" ? "Plomberie" : "Plumbing"}
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-default">
                    {language === "fr" ? "Électricité" : "Electrical"}
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-default">
                    {language === "fr" ? "Jardinage" : "Gardening"}
                  </span>
                </li>
                <li>
                  <span className="hover:text-white transition-colors cursor-default">
                    {language === "fr" ? "Informatique" : "IT"}
                  </span>
                </li>
                <li className="pt-1">
                  <Link
                    to="/#search"
                    className="inline-flex items-center gap-1 text-sm text-white/75 hover:text-white transition-colors"
                  >
                    {copy.seeMore} <ArrowRight className="w-4 h-4" />
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company / Resources */}
            <div>
              <h4 className="text-sm font-semibold tracking-wide text-white/90">{copy.company}</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors">
                    {copy.helpFaq}
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {copy.about}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {copy.partners}
                  </a>
                </li>
              </ul>

              <h4 className="mt-8 text-sm font-semibold tracking-wide text-white/90">{copy.resources}</h4>
              <ul className="mt-4 space-y-2 text-sm text-white/70">
                <li>
                  <Link to="/conditions" className="hover:text-white transition-colors">
                    {copy.terms}
                  </Link>
                </li>
                <li>
                  <Link to="/confidentialite" className="hover:text-white transition-colors">
                    {copy.privacy}
                  </Link>
                </li>
                <li>
                  <Link to="/cookies" className="hover:text-white transition-colors">
                    {copy.cookies}
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold tracking-wide text-white/90">{copy.contact}</h4>

              <div className="mt-4 space-y-3 text-sm text-white/70">
                <a
                  href={copy.mailHref}
                  className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  <Mail className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                  <span className="truncate">{copy.mail}</span>
                </a>

                <a
                  href={copy.phoneHref}
                  className="group flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 hover:bg-white/10 transition-colors"
                >
                  <Phone className="w-4 h-4 text-white/70 group-hover:text-white transition-colors" />
                  <span className="truncate">{copy.phone}</span>
                </a>

                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => setContactOpen(true)}
                    className="w-full rounded-xl bg-pro-blue hover:bg-pro-blue/90 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {language === "fr" ? "Ouvrir le formulaire" : "Open contact form"}
                  </Button>
                  <p className="mt-2 text-xs text-white/55">{copy.ctaSub}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="mt-12 border-t border-white/10 pt-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-xs text-white/55">
              © {year} {copy.brand}. {copy.rights}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
              <Link to="/conditions" className="text-white/60 hover:text-white transition-colors">
                {copy.terms}
              </Link>
              <Link to="/confidentialite" className="text-white/60 hover:text-white transition-colors">
                {copy.privacy}
              </Link>
              <Link to="/cookies" className="text-white/60 hover:text-white transition-colors">
                {copy.cookies}
              </Link>
            </div>
          </div>
        </div>
      </footer>

      {/* Modal Contact */}
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} cooldownSeconds={30} />
    </>
  );
};

export default Footer;
