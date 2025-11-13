
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, MapPin } from 'lucide-react';

const HeroSection = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [location, setLocation] = useState('');

  const handleSearch = () => {
    console.log('Searching for:', searchTerm, 'in:', location);
    // Implement search functionality
  };

  return (
    <section className="bg-gradient-to-br from-pro-blue to-blue-600 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto animate-fade-in">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            {t('home.title')}
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-blue-100">
            {t('home.subtitle')}
          </p>

          {/* Search Form */}
          <div className="bg-white rounded-lg p-6 shadow-xl max-w-3xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t('home.search.placeholder')}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 py-3 text-gray-900"
                />
              </div>
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder={t('home.location.placeholder')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10 py-3 text-gray-900"
                />
              </div>
              <Button
                onClick={handleSearch}
                className="bg-pro-blue hover:bg-blue-700 px-8 py-3"
              >
                {t('home.search.button')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
