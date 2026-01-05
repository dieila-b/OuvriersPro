// src/components/Footer.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import ContactModal from "@/components/contact/ContactModal";

const Footer = () => {
  const { t, language } = useLanguage();
  const [contactOpen, setContactOpen] = React.useState(false);

  const year = new Date().getFullYear();

  return (
    <>
      <footer className="bg-pro-gray text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-8">
            {/* Company Info */}
            <div className="md:col-span-1">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-pro-blue rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">PS</span>
                </div>
                <span className="text-xl font-bold">ProxiServices</span>
              </div>

              <p className="text-gray-300 mb-4">
                {language === "fr"
                  ? "La plateforme de mise en relation qui connecte particuliers et professionnels pour répondre efficacement à vos besoins de services."
                  : "A marketplace connecting individuals and businesses with trusted professionals to handle your service needs efficiently."}
              </p>

              <div className="flex space-x-4">
                <a
                  href="#"
                  aria-label="Facebook"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Facebook className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  aria-label="Twitter"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Twitter className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  aria-label="Instagram"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Instagram className="w-5 h-5" />
                </a>
                <a
                  href="#"
                  aria-label="LinkedIn"
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Linkedin className="w-5 h-5" />
                </a>
              </div>
            </div>

            {/* Services */}
            <div>
              <h3 className="font-semibold text-lg mb-4">
                {language === "fr" ? "Services" : "Services"}
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {language === "fr" ? "Bâtiment" : "Construction"}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {language === "fr" ? "Plomberie" : "Plumbing"}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {language === "fr" ? "Électricité" : "Electrical"}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {language === "fr" ? "Jardinage" : "Gardening"}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {language === "fr" ? "Informatique" : "IT"}
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-semibold text-lg mb-4">
                {language === "fr" ? "Entreprise" : "Company"}
              </h3>
              <ul className="space-y-2 text-gray-300">
                <li>
                  <Link to="/faq" className="hover:text-white transition-colors">
                    {language === "fr" ? "Aide / FAQ" : "Help / FAQ"}
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {language === "fr" ? "À propos" : "About"}
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    {language === "fr" ? "Partenaires" : "Partners"}
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h3 className="font-semibold text-lg mb-4">
                {language === "fr" ? "Contact" : "Contact"}
              </h3>

              <div className="space-y-3 text-gray-300">
                <div className="flex items-center space-x-2">
                  <Mail className="w-4 h-4" />
                  <a
                    href="mailto:contact@proxiservices.com"
                    className="hover:text-white transition-colors"
                  >
                    contact@proxiservices.com
                  </a>
                </div>

                <div className="flex items-center space-x-2">
                  <Phone className="w-4 h-4" />
                  <a
                    href="tel:+33123456789"
                    className="hover:text-white transition-colors"
                  >
                    +33 1 23 45 67 89
                  </a>
                </div>

                {/* ✅ CTA pro : ouvre le modal Contact (sans changer de page) */}
                <div className="pt-2">
                  <Button
                    type="button"
                    onClick={() => setContactOpen(true)}
                    className="w-full rounded-xl bg-pro-blue hover:bg-pro-blue/90 flex items-center justify-center gap-2"
                  >
                    <MessageSquare className="w-4 h-4" />
                    {language === "fr" ? "Nous contacter" : "Contact us"}
                  </Button>
                  <p className="mt-2 text-xs text-gray-400">
                    {language === "fr"
                      ? "Réponse par email. Anti-spam activé."
                      : "We reply by email. Anti-spam enabled."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-600 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © {year} ProxiServices. {language === "fr" ? "Tous droits réservés." : "All rights reserved."}
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 md:mt-0">
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                {language === "fr" ? "Conditions d'utilisation" : "Terms of use"}
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                {language === "fr" ? "Politique de confidentialité" : "Privacy policy"}
              </a>
              <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">
                {language === "fr" ? "Cookies" : "Cookies"}
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* ✅ Modal Contact : même logique pro (auto-fill, cooldown, table op_contact_messages) */}
      <ContactModal open={contactOpen} onOpenChange={setContactOpen} cooldownSeconds={30} />
    </>
  );
};

export default Footer;
