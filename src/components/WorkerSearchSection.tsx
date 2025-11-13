import React, { useMemo, useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * On réutilise grossièrement la même structure que pour l'inscription,
 * mais ici uniquement pour la Guinée.
 */

interface GuineaCommune {
  name: string;
  districts: string[];
}

interface GuineaCity {
  name: string;
  communes: GuineaCommune[];
}

interface GuineaRegion {
  name: string;
  cities: GuineaCity[];
}

const GUINEA_REGIONS: GuineaRegion[] = [
  {
    name: 'Conakry',
    cities: [
      {
        name: 'Conakry',
        communes: [
          { name: 'Kaloum', districts: ['Sandervalia', 'Tombo', 'Boulbinet', 'Coronthie', 'Almamya'] },
          { name: 'Dixinn', districts: ['Dixinn Centre', 'Taouyah', 'Belle-vue', 'Minière', 'Hamdallaye'] },
          { name: 'Matam', districts: ['Matam Centre', 'Bonfi', 'Boussoura', 'Carrière', 'Hafia'] },
          { name: 'Ratoma', districts: ['Ratoma Centre', 'Kipé', 'Nongo', 'Lambanyi', 'Sonfonia', 'Cosa'] },
          { name: 'Matoto', districts: ['Matoto Centre', 'Enta', 'Yimbaya', 'Gbessia', 'Sangoyah'] },
        ],
      },
    ],
  },
  {
    name: 'Kindia',
    cities: [
      {
        name: 'Kindia',
        communes: [
          { name: 'Kindia Centre', districts: ['Koliady', 'Banlieue', 'Manquepas', 'Féréfou'] },
          { name: 'Friguiagbé', districts: ['Friguiagbé Centre', 'Sinta', 'Damakania'] },
        ],
      },
    ],
  },
  // 👉 tu peux compléter les autres régions comme dans InscriptionOuvrier.tsx
];

interface WorkerResult {
  id: string;
  first_name: string;
  last_name: string;
  profession: string;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  hourly_rate: number | null;
  currency: string | null;
  description: string | null;
  avatar_url: string | null;
}

const WorkerSearchSection: React.FC = () => {
  const { language } = useLanguage();

  const [professionQuery, setProfessionQuery] = useState('');
  const [country, setCountry] = useState<'GN' | 'OTHER'>('GN');
  const [region, setRegion] = useState('');
  const [city, setCity] = useState('');
  const [commune, setCommune] = useState('');
  const [district, setDistrict] = useState('');

  const [customCity, setCustomCity] = useState('');
  const [customPostal, setCustomPostal] = useState('');

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<WorkerResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Dérivés pour Guinée
  const selectedRegion = useMemo(
    () => GUINEA_REGIONS.find((r) => r.name === region) || null,
    [region]
  );

  const availableCities: GuineaCity[] = selectedRegion ? selectedRegion.cities : [];
  const selectedCity = useMemo(
    () => availableCities.find((c) => c.name === city) || null,
    [availableCities, city]
  );
  const availableCommunes: GuineaCommune[] = selectedCity ? selectedCity.communes : [];
  const selectedCommune = useMemo(
    () => availableCommunes.find((c) => c.name === commune) || null,
    [availableCommunes, commune]
  );
  const availableDistricts: string[] = selectedCommune ? selectedCommune.districts : [];

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setResults([]);

    try {
      let query = supabase
        .from('op_ouvriers')
        .select(
          'id, first_name, last_name, profession, country, region, city, commune, district, hourly_rate, currency, description, avatar_url'
        )
        .eq('status', 'approved');

      // filtre métier
      if (professionQuery.trim() !== '') {
        query = query.ilike('profession', `%${professionQuery.trim()}%`);
      }

      if (country === 'GN') {
        query = query.eq('country', 'GN');
        if (region) query = query.eq('region', region);
        if (city) query = query.eq('city', city);
        if (commune) query = query.eq('commune', commune);
        if (district) query = query.eq('district', district);
      } else {
        if (customCity.trim() !== '') {
          query = query.ilike('city', `%${customCity.trim()}%`);
        }
        if (customPostal.trim() !== '') {
          query = query.ilike('postal_code', `%${customPostal.trim()}%`);
        }
      }

      const { data, error: selectError } = await query;

      if (selectError) throw selectError;
      setResults((data || []) as WorkerResult[]);
    } catch (err: any) {
      console.error(err);
      setError(
        language === 'fr'
          ? "Une erreur s'est produite lors de la recherche."
          : 'An error occurred while searching.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section id="search" className="py-16 bg-white">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Titre */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-pro-gray mb-2">
            {language === 'fr'
              ? 'Trouvez le bon ouvrier près de chez vous'
              : 'Find the right worker near you'}
          </h2>
          <p className="text-gray-600">
            {language === 'fr'
              ? 'Filtrez par métier et par localisation pour trouver l’ouvrier le plus proche.'
              : 'Filter by trade and location to find the closest worker.'}
          </p>
        </div>

        {/* Formulaire de recherche */}
        <Card className="mb-10 shadow-md">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              {/* Métier */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'fr'
                    ? 'Quel métier recherchez-vous ?'
                    : 'Which trade are you looking for?'}
                </label>
                <Input
                  value={professionQuery}
                  onChange={(e) => setProfessionQuery(e.target.value)}
                  placeholder={
                    language === 'fr'
                      ? 'Plombier, maçon, électricien...'
                      : 'Plumber, builder, electrician...'
                  }
                />
              </div>

              {/* Choix Guinée / autre pays */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'fr' ? 'Zone de recherche' : 'Search area'}
                </label>
                <div className="flex flex-wrap gap-3">
                  <Button
                    type="button"
                    variant={country === 'GN' ? 'default' : 'outline'}
                    onClick={() => {
                      setCountry('GN');
                      setCustomCity('');
                      setCustomPostal('');
                    }}
                  >
                    Guinée
                  </Button>
                  <Button
                    type="button"
                    variant={country === 'OTHER' ? 'default' : 'outline'}
                    onClick={() => {
                      setCountry('OTHER');
                      setRegion('');
                      setCity('');
                      setCommune('');
                      setDistrict('');
                    }}
                  >
                    {language === 'fr' ? 'Autre pays' : 'Other country'}
                  </Button>
                </div>
              </div>

              {/* Localisation détaillée */}
              {country === 'GN' ? (
                <>
                  {/* Région */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Région' : 'Region'}
                    </label>
                    <select
                      value={region}
                      onChange={(e) => {
                        setRegion(e.target.value);
                        setCity('');
                        setCommune('');
                        setDistrict('');
                      }}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
                    >
                      <option value="">
                        {language === 'fr'
                          ? 'Toutes les régions'
                          : 'All regions'}
                      </option>
                      {GUINEA_REGIONS.map((r) => (
                        <option key={r.name} value={r.name}>
                          {r.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ville / Commune / Quartier */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'fr' ? 'Ville' : 'City'}
                      </label>
                      <select
                        value={city}
                        onChange={(e) => {
                          setCity(e.target.value);
                          setCommune('');
                          setDistrict('');
                        }}
                        disabled={!region}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pro-blue"
                      >
                        <option value="">
                          {language === 'fr'
                            ? 'Toutes les villes'
                            : 'All cities'}
                        </option>
                        {availableCities.map((c) => (
                          <option key={c.name} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'fr' ? 'Commune' : 'Commune'}
                      </label>
                      <select
                        value={commune}
                        onChange={(e) => {
                          setCommune(e.target.value);
                          setDistrict('');
                        }}
                        disabled={!city}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pro-blue"
                      >
                        <option value="">
                          {language === 'fr'
                            ? 'Toutes les communes'
                            : 'All communes'}
                        </option>
                        {availableCommunes.map((com) => (
                          <option key={com.name} value={com.name}>
                            {com.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'fr' ? 'Quartier' : 'Neighborhood'}
                      </label>
                      <select
                        value={district}
                        onChange={(e) => setDistrict(e.target.value)}
                        disabled={!commune}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm bg-white disabled:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-pro-blue"
                      >
                        <option value="">
                          {language === 'fr'
                            ? 'Tous les quartiers'
                            : 'All neighborhoods'}
                        </option>
                        {availableDistricts.map((q) => (
                          <option key={q} value={q}>
                            {q}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Mode "autre pays" : ville / code postal libres */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'fr' ? 'Ville' : 'City'}
                      </label>
                      <Input
                        value={customCity}
                        onChange={(e) => setCustomCity(e.target.value)}
                        placeholder={
                          language === 'fr'
                            ? 'Votre ville'
                            : 'Your city'
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'fr' ? 'Code postal' : 'Postal code'}
                      </label>
                      <Input
                        value={customPostal}
                        onChange={(e) => setCustomPostal(e.target.value)}
                        placeholder="75001"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Bouton Rechercher */}
              <div className="pt-2 text-right">
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-pro-blue hover:bg-blue-700"
                >
                  {loading
                    ? language === 'fr'
                      ? 'Recherche...'
                      : 'Searching...'
                    : language === 'fr'
                    ? 'Rechercher'
                    : 'Search'}
                </Button>
              </div>

              {/* Erreur */}
              {error && (
                <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                  {error}
                </div>
              )}
            </form>
          </CardContent>
        </Card>

        {/* Résultats */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-pro-gray mb-2">
              {language === 'fr'
                ? `${results.length} ouvrier(s) trouvé(s)`
                : `${results.length} worker(s) found`}
            </h3>

            {results.map((w) => (
              <Card key={w.id} className="shadow-sm">
                <CardContent className="py-4 flex gap-4 items-start">
                  {/* Avatar simple */}
                  <div className="w-14 h-14 rounded-full bg-pro-blue/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {w.avatar_url ? (
                      <img
                        src={w.avatar_url}
                        alt={`${w.first_name} ${w.last_name}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-pro-blue font-semibold text-lg">
                        {w.first_name?.[0]}
                        {w.last_name?.[0]}
                      </span>
                    )}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap justify-between gap-2">
                      <div>
                        <div className="font-semibold text-pro-gray">
                          {w.first_name} {w.last_name}
                        </div>
                        <div className="text-sm text-pro-blue font-medium">
                          {w.profession}
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-600">
                        {w.city && (
                          <div>
                            {w.city}
                            {w.commune ? `, ${w.commune}` : ''}
                          </div>
                        )}
                        {w.district && (
                          <div className="text-xs text-gray-500">
                            {language === 'fr' ? 'Quartier' : 'District'} :{' '}
                            {w.district}
                          </div>
                        )}
                        {w.hourly_rate && w.currency && (
                          <div className="mt-1 font-medium text-gray-800">
                            {w.hourly_rate.toLocaleString('fr-FR')} {w.currency}
                            /h
                          </div>
                        )}
                      </div>
                    </div>

                    {w.description && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-3">
                        {w.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!loading && !error && results.length === 0 && (
          <p className="text-center text-sm text-gray-500">
            {language === 'fr'
              ? 'Lancez une recherche pour voir les ouvriers disponibles.'
              : 'Start a search to see available workers.'}
          </p>
        )}
      </div>
    </section>
  );
};

export default WorkerSearchSection;
