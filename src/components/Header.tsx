import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Languages, Search, User, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';

const Header = () => {
  const { language, setLanguage, t } = useLanguage();
  const navigate = useNavigate();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-pro-blue rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">OP</span>
            </div>
            <span className="text-xl font-bold text-pro-gray">OuvriersPro</span>
          </div>

          {/* Navigation Desktop */}
          <nav className="hidden md:flex items-center space-x-6">
            <a
              href="#search"
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t('nav.search')}
            </a>
            <a
              href="#subscription"
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t('nav.subscribe')}
            </a>
            <a
              href="#faq"
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t('nav.faq')}
            </a>
            <a
              href="#contact"
              className="text-pro-gray hover:text-pro-blue transition-colors"
            >
              {t('nav.contact')}
            </a>
          </nav>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            {/* CTA Devenir Ouvrier Pro (desktop) */}
            <Button
              size="sm"
              className="hidden md:inline-flex bg-pro-blue text-white hover:bg-pro-blue/90"
              onClick={() => navigate('/inscription-ouvrier')}
            >
              Devenir Ouvrier Pro
            </Button>

            {/* Language Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center space-x-1">
                  <Languages className="w-4 h-4" />
                  <span className="uppercase">{language}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => setLanguage('fr')} className="cursor-pointer">
                  🇫🇷 Français
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLanguage('en')} className="cursor-pointer">
                  🇬🇧 English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="md:hidden">
                  <Menu className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-white">
                <DropdownMenuItem onClick={() => navigate('#search')}>
                  <Search className="w-4 h-4 mr-2" />
                  {t('nav.search')}
                </DropdownMenuItem>
                {/* CTA Devenir Ouvrier Pro (mobile) */}
                <DropdownMenuItem
                  onClick={() => navigate('/inscription-ouvrier')}
                  className="cursor-pointer"
                >
                  <User className="w-4 h-4 mr-2" />
                  Devenir Ouvrier Pro
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
