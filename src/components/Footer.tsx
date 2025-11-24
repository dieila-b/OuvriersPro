
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone } from 'lucide-react';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-pro-gray text-white">
      <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="sm:col-span-2 md:col-span-1">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-pro-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">OP</span>
              </div>
              <span className="text-lg sm:text-xl font-bold">OuvriersPro</span>
            </div>
            <p className="text-gray-300 mb-4 text-sm sm:text-base">
              La plateforme qui connecte professionnels et particuliers pour tous vos projets.
            </p>
            <div className="flex space-x-4">
              <Facebook className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Twitter className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Instagram className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Linkedin className="w-5 h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Services</h3>
            <ul className="space-y-2 text-gray-300 text-sm sm:text-base">
              <li><a href="#" className="hover:text-white transition-colors">Bâtiment</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Plomberie</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Électricité</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Jardinage</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Informatique</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Entreprise</h3>
            <ul className="space-y-2 text-gray-300 text-sm sm:text-base">
              <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Carrières</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Presse</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Partenaires</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-base sm:text-lg mb-3 sm:mb-4">Contact</h3>
            <div className="space-y-3 text-gray-300 text-sm sm:text-base">
              <div className="flex items-center space-x-2">
                <Mail className="w-4 h-4 flex-shrink-0" />
                <span className="break-words">contact@ouvrierspro.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>+33 1 23 45 67 89</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-8 sm:mt-12 pt-6 sm:pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-gray-400 text-xs sm:text-sm text-center md:text-left">
            © 2024 OuvriersPro. Tous droits réservés.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 text-center">
            <a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">
              Conditions d'utilisation
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">
              Politique de confidentialité
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-xs sm:text-sm transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
