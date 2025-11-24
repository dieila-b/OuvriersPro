
import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone } from 'lucide-react';

const Footer = () => {
  const { t } = useLanguage();

  return (
    <footer className="bg-pro-gray text-white">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-8 sm:py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {/* Company Info */}
          <div className="sm:col-span-2 lg:col-span-1">
            <div className="flex items-center space-x-2 mb-3">
              <div className="w-8 h-8 bg-pro-blue rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">OP</span>
              </div>
              <span className="text-base sm:text-lg font-bold">OuvriersPro</span>
            </div>
            <p className="text-gray-300 mb-3 text-xs sm:text-sm">
              La plateforme qui connecte professionnels et particuliers pour tous vos projets.
            </p>
            <div className="flex space-x-3">
              <Facebook className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Twitter className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Instagram className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
              <Linkedin className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 hover:text-white cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Services */}
          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Services</h3>
            <ul className="space-y-1.5 text-gray-300 text-xs sm:text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Bâtiment</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Plomberie</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Électricité</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Jardinage</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Informatique</a></li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Entreprise</h3>
            <ul className="space-y-1.5 text-gray-300 text-xs sm:text-sm">
              <li><a href="#" className="hover:text-white transition-colors">À propos</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Carrières</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Presse</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Partenaires</a></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-sm sm:text-base mb-2 sm:mb-3">Contact</h3>
            <div className="space-y-2 text-gray-300 text-xs sm:text-sm">
              <div className="flex items-start space-x-2">
                <Mail className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span className="break-all">contact@ouvrierspro.com</span>
              </div>
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 flex-shrink-0" />
                <span>+33 1 23 45 67 89</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-6 sm:mt-8 pt-4 sm:pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-gray-400 text-xs text-center sm:text-left">
            © 2024 OuvriersPro. Tous droits réservés.
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:gap-4 text-center">
            <a href="#" className="text-gray-400 hover:text-white text-xs transition-colors">
              Conditions d'utilisation
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-xs transition-colors">
              Politique de confidentialité
            </a>
            <a href="#" className="text-gray-400 hover:text-white text-xs transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
