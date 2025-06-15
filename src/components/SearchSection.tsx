
import React, { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import WorkerCard from './WorkerCard';
import { Search, Filter, Wrench, Zap, Droplets, TreePine, Home, Monitor } from 'lucide-react';

const SearchSection = () => {
  const { t } = useLanguage();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTrade, setSelectedTrade] = useState('');
  const [priceRange, setPriceRange] = useState([0, 100]);
  const [minRating, setMinRating] = useState(0);

  // Mock data
  const mockWorkers = [
    {
      id: '1',
      name: 'Pierre Martin',
      trade: 'Plomberie',
      hourlyRate: 45,
      rating: 4.8,
      reviewCount: 156,
      location: 'Paris 15e',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      experience: 8,
      verified: true
    },
    {
      id: '2',
      name: 'Sophie Dubois',
      trade: 'Électricité',
      hourlyRate: 40,
      rating: 4.9,
      reviewCount: 203,
      location: 'Lyon 3e',
      avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b277?w=100&h=100&fit=crop&crop=face',
      experience: 12,
      verified: true
    },
    {
      id: '3',
      name: 'Marc Leroy',
      trade: 'Bâtiment',
      hourlyRate: 55,
      rating: 4.7,
      reviewCount: 89,
      location: 'Marseille',
      avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=100&h=100&fit=crop&crop=face',
      experience: 15,
      verified: true
    },
    {
      id: '4',
      name: 'Julie Moreau',
      trade: 'Jardinage',
      hourlyRate: 35,
      rating: 4.6,
      reviewCount: 124,
      location: 'Toulouse',
      avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
      experience: 6,
      verified: true
    }
  ];

  const trades = [
    { value: 'plomberie', label: 'Plomberie', icon: Droplets },
    { value: 'electricite', label: 'Électricité', icon: Zap },
    { value: 'batiment', label: 'Bâtiment', icon: Home },
    { value: 'jardinage', label: 'Jardinage', icon: TreePine },
    { value: 'informatique', label: 'Informatique', icon: Monitor },
    { value: 'reparation', label: 'Réparation', icon: Wrench }
  ];

  return (
    <section id="search" className="py-20 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-pro-gray mb-4">
            {t('search.title')}
          </h2>
        </div>

        <div className="grid lg:grid-cols-4 gap-8">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-gray-50 rounded-lg p-6 sticky top-24">
              <h3 className="font-semibold text-pro-gray mb-4 flex items-center">
                <Filter className="w-5 h-5 mr-2" />
                {t('search.filters')}
              </h3>

              <div className="space-y-6">
                {/* Search Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('search.trade')}
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Rechercher..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                {/* Trade Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('search.trade')}
                  </label>
                  <Select value={selectedTrade} onValueChange={setSelectedTrade}>
                    <SelectTrigger>
                      <SelectValue placeholder="Tous les métiers" />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="">Tous les métiers</SelectItem>
                      {trades.map((trade) => (
                        <SelectItem key={trade.value} value={trade.value}>
                          <div className="flex items-center space-x-2">
                            <trade.icon className="w-4 h-4" />
                            <span>{trade.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('search.price')} ({priceRange[0]}€ - {priceRange[1]}€)
                  </label>
                  <Slider
                    value={priceRange}
                    onValueChange={setPriceRange}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>

                {/* Rating Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('search.rating')}
                  </label>
                  <Select value={minRating.toString()} onValueChange={(value) => setMinRating(Number(value))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-white">
                      <SelectItem value="0">Toutes les notes</SelectItem>
                      <SelectItem value="4">4+ étoiles</SelectItem>
                      <SelectItem value="4.5">4.5+ étoiles</SelectItem>
                      <SelectItem value="4.8">4.8+ étoiles</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="lg:col-span-3">
            <div className="mb-6">
              <p className="text-gray-600">
                {mockWorkers.length} {t('search.results')}
              </p>
            </div>

            <div className="grid gap-6">
              {mockWorkers.map((worker) => (
                <WorkerCard key={worker.id} worker={worker} />
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SearchSection;
