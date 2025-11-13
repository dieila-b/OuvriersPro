import React, { useEffect, useMemo, useState } from 'react';
import { Search, Star, MapPin, Phone, Mail } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';

// --------- Types ---------
type WorkerRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  profession: string | null;
  description: string | null;
  hourly_rate: number | null;
  currency: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null; // quartier
  years_experience: number | null;
  average_rating: number | null;
  rating_count: number | null;
  avatar_url: string | null;
  status: string | null;
};

// --------- Données géographiques Guinée ---------

type District = { code: string; name: string };
type Commune = { code: string; name: string; districts: District[] };
type City = { code: string; name: string; communes: Commune[] };
type Region = { code: string; name: string; cities: City[] };

const GUINEA_REGIONS: Region[] = [
  {
    code: 'CONAKRY',
    name: 'Conakry',
    cities: [
      {
        code: 'CONAKRY_VILLE',
        name: 'Conakry',
        communes: [
          {
            code: 'KALOUM',
            name: 'Kaloum',
            districts: [
              { code: 'ALMAMYA', name: 'Almamya' },
              { code: 'BOULBINET', name: 'Boulbinet' },
              { code: 'SANDERVALIA', name: 'Sandervalia' },
            ],
          },
          {
            code: 'DIXINN',
            name: 'Dixinn',
            districts: [
              { code: 'BELLEVUE', name: 'Bellevue' },
              { code: 'DIXINN_BORA', name: 'Dixinn Bora' },
              { code: 'CITE_UNI', name: 'Cité des Nations Unies' },
            ],
          },
          {
            code: 'RATOMA',
            name: 'Ratoma',
            districts: [
              { code: 'KIPÉ', name: 'Kipé' },
              { code: 'LAMBA', name: 'Lambanyi' },
              { code: 'COBG', name: 'Cosa' },
            ],
          },
          {
            code: 'MATAM',
            name: 'Matam',
            districts: [
              { code: 'MATAM_CENTRE', name: 'Matam Centre' },
              { code: 'BONFI', name: 'Bonfi' },
            ],
          },
          {
            code: 'MATOTO',
            name: 'Matoto',
            districts: [
              { code: 'MATOTO_CENTRE', name: 'Matoto Centre' },
              { code: 'GBESSIA', name: 'Gbessia' },
              { code: 'YIMBAYA', name: 'Yimbaya' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'KINDIA',
    name: 'Kindia',
    cities: [
      {
        code: 'KINDIA_VILLE',
        name: 'Kindia',
        communes: [
          {
            code: 'URBAINE_KINDIA',
            name: 'Commune urbaine',
            districts: [
              { code: 'KOLENTÉ', name: 'Kolenté' },
              { code: 'SAMAYA', name: 'Samaya' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'MAMOU',
    name: 'Mamou',
    cities: [
      {
        code: 'MAMOU_VILLE',
        name: 'Mamou',
        communes: [
          {
            code: 'URBAINE_MAMOU',
            name: 'Commune urbaine',
            districts: [
              { code: 'PETEL', name: 'Petel' },
              { code: 'HORÉ', name: 'Horé' },
            ],
          },
        ],
      },
    ],
  },
  {
    code: 'LABÉ',
    name: 'Labé',
    cities: [
      {
        code: 'LABE_VILLE',
        name: 'Labé',
        communes: [
          {
            code: 'URBAINE_LABE',
            name: 'Commune urbaine',
            districts: [
              { code: 'DONGHOL', name: 'Donghol' },
              { code: 'PONDEKOU', name: 'Pondékou' },
            ],
          },
        ],
      },
    ],
  },
  // Tu pourras compléter progressivement les autres régions :
  // Boké, Kankan, Faranah, N’Zérékoré, etc.
];

// --------- Composant principal ---------

const WorkerSearchSection: React.FC = () => {
  const { language } = useLanguage();

  // Filtres
  const [searchText, setSearchText] = useState('');
  const [jobFilter, setJobFilter] = useState('');
  const [maxHourlyRate, setMaxHourlyRate] = useState<number>(100);
  const [minRating, setMinRating] = useState<number>(0);

  const [country, setCountry] = useState<'GN' | 'OTHER'>('GN');
  const [region, setRegion] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [commune, setCommune] = useState<string>('');
  const [district, setDistrict] = useState<string>('');

  const [workers, setWorkers] = useState<WorkerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --------- Options dérivées pour les selects géographiques ---------

  const regionOptions = useMemo(
    () => GUINEA_REGIONS.map((r) => ({ value: r.name, label: r.name })),
    []
  );

  const cityOptions = useMemo(() => {
    if (country !== 'GN' || !region) return [];
    const regionObj = GUINEA_REGIONS.find((r) => r.name === region);
    if (!regionObj) return [];
    return regionObj.cities.map((c) => ({ value: c.name, label: c.name }));
  }, [region, country]);

  const communeOptions = useMemo(() => {
    if (country !== 'GN' || !region || !city) return [];
    const regionObj = GUINEA_REGIONS.find((r) => r.name === region);
    const cityObj = regionObj?.cities.find((c) => c.name === city);
    if (!cityObj) return [];
    return cityObj.communes.map((c) => ({ value: c.name, label: c.name }));
  }, [region, city, country]);

  const districtOptions = useMemo(() => {
    if (country !== 'GN' || !region || !city || !commune) return [];
    const regionObj = GUINEA_REGIONS.find((r) => r.name === region);
    const cityObj = regionObj?.cities.find((c) => c.name === city);
    const communeObj = cityObj?.communes.find((co) => co.name === commune);
    if (!communeObj) return [];
    return communeObj.districts.map((d) => ({ value: d.name, label: d.name }));
  }, [region, city, commune, country]);

  // Reset hiérarchiques
  const handleChangeRegion = (value: string) => {
    setRegion(value);
    setCity('');
    setCommune('');
    setDistrict('');
  };

  const handleChangeCity = (value: string) => {
    setCity(value);
    setCommune('');
    setDistrict('');
  };

  const handleChangeCommune = (value: string) => {
    setCommune(value);
    setDistrict('');
  };

  // --------- Chargement depuis Supabase ---------

  const fetchWorkers = async () => {
    setLoading(true);
    setError(null);

    try {
      let query = supabase
        .from('op_ouvriers')
        .select('*')
        .eq('status', 'approved');

      // Pays
      if (country === 'GN') {
        query = query.eq('country', 'Guinée');
      }

      // Filtres texte / métier
      if (searchText.trim()) {
        query = query.or(
          `profession.ilike.%${searchText}%,description.ilike.%${searchText}%`
        );
      }

      if (jobFilter.trim()) {
        query = query.ilike('profession', `%${jobFilter}%`);
      }

      // Filtres géographiques
      if (region) query = query.eq('region', region);
      if (city) query = query.eq('city', city);
      if (commune) query = query.eq('commune', commune);
      if (district) query = query.eq('district', district);

      // Filtre prix max si renseigné
      if (maxHourlyRate < 100) {
        query = query.lte('hourly_rate', maxHourlyRate);
      }

      const { data, error: supaError } = await query;

      if (supaError) throw supaError;

      let rows = (data || []) as WorkerRow[];

      // Filtre note minimum côté client (si colonne présente)
      if (minRating > 0) {
        rows = rows.filter(
          (w) => (w.average_rating ?? 0) >= minRating
        );
      }

      setWorkers(rows);
    } catch (err: any) {
      console.error(err);
      setError(
        language === 'fr'
          ? "Impossible de charger les ouvriers."
          : 'Unable to load workers.'
      );
    } finally {
      setLoading(false);
    }
  };

  // On recharge quand les filtres principaux changent
  useEffect(() => {
    fetchWorkers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [country, region, city, commune, district, maxHourlyRate, minRating]);

  // --------- Helpers UI ---------

  const formatCurrency = (amount: number | null, currency: string | null) => {
    if (amount == null) return language === 'fr' ? 'Tarif non renseigné' : 'No rate';
    const cur = currency || (country === 'GN' ? 'GNF' : '€');
    if (cur === 'GNF') {
      return `${amount.toLocaleString('fr-FR')} GNF /h`;
    }
    return `${amount.toLocaleString('fr-FR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    })} ${cur} /h`;
  };

  const tText = (fr: string, en: string) => (language === 'fr' ? fr : en);

  // --------- Rendu ---------

  return (
    <section id="search" className="py-16 bg-white">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-pro-gray mb-8">
          {tText('Trouvez votre professionnel', 'Find your professional')}
        </h2>

        <div className="grid md:grid-cols-[280px,1fr] gap-8">
          {/* Filtres */}
          <aside className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-6">
            <div className="flex items-center space-x-2 mb-2">
              <Search className="w-4 h-4 text-pro-blue" />
              <h3 className="font-semibold text-pro-gray">
                {tText('Filtres', 'Filters')}
              </h3>
            </div>

            {/* Recherche libre */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tText('Métier / mot-clé', 'Job / keyword')}
              </label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
                placeholder={tText('Rechercher…', 'Search…')}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onBlur={fetchWorkers}
              />
            </div>

            {/* Métier simple */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tText('Métier (texte libre)', 'Job (free text)')}
              </label>
              <input
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
                placeholder={tText('Ex : Plombier, Électricien…', 'e.g. Plumber, Electrician…')}
                value={jobFilter}
                onChange={(e) => setJobFilter(e.target.value)}
                onBlur={fetchWorkers}
              />
            </div>

            {/* Pays */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tText('Pays', 'Country')}
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
                value={country}
                onChange={(e) => {
                  const val = e.target.value as 'GN' | 'OTHER';
                  setCountry(val);
                  setRegion('');
                  setCity('');
                  setCommune('');
                  setDistrict('');
                }}
              >
                <option value="GN">Guinée</option>
                <option value="OTHER">
                  {tText('Autre pays', 'Other country')}
                </option>
              </select>
            </div>

            {country === 'GN' && (
              <>
                {/* Région */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tText('Région', 'Region')}
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
                    value={region}
                    onChange={(e) => handleChangeRegion(e.target.value)}
                  >
                    <option value="">
                      {tText('Toutes les régions', 'All regions')}
                    </option>
                    {regionOptions.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ville */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tText('Ville', 'City')}
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
                    value={city}
                    onChange={(e) => handleChangeCity(e.target.value)}
                    disabled={!region}
                  >
                    <option value="">
                      {tText('Toutes les villes', 'All cities')}
                    </option>
                    {cityOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Commune */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tText('Commune', 'Commune')}
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
                    value={commune}
                    onChange={(e) => handleChangeCommune(e.target.value)}
                    disabled={!city}
                  >
                    <option value="">
                      {tText('Toutes les communes', 'All communes')}
                    </option>
                    {communeOptions.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quartier */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {tText('Quartier', 'District')}
                  </label>
                  <select
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    disabled={!commune}
                  >
                    <option value="">
                      {tText('Tous les quartiers', 'All districts')}
                    </option>
                    {districtOptions.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            {/* Prix par heure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tText('Prix par heure (max)', 'Hourly rate (max)')}
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={maxHourlyRate}
                onChange={(e) => setMaxHourlyRate(Number(e.target.value))}
                className="w-full"
              />
              <div className="text-xs text-gray-600 mt-1">
                {maxHourlyRate === 100
                  ? tText('Tous les tarifs', 'All rates')
                  : `${maxHourlyRate} ${country === 'GN' ? '€/h (exemple)' : '€/h'}`}
              </div>
            </div>

            {/* Note minimum */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {tText('Note minimum', 'Minimum rating')}
              </label>
              <select
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pro-blue"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
              >
                <option value={0}>{tText('Toutes les notes', 'All ratings')}</option>
                <option value={3}>3+ ⭐</option>
                <option value={4}>4+ ⭐</option>
                <option value={4.5}>4.5+ ⭐</option>
              </select>
            </div>

            <button
              type="button"
              onClick={fetchWorkers}
              className="w-full mt-2 inline-flex justify-center items-center rounded-md bg-pro-blue text-white text-sm font-semibold px-4 py-2 hover:bg-blue-700 transition-colors"
            >
              <Search className="w-4 h-4 mr-2" />
              {tText('Appliquer les filtres', 'Apply filters')}
            </button>
          </aside>

          {/* Résultats */}
          <div className="space-y-4">
            {loading && (
              <div className="text-gray-500 text-sm">
                {tText('Chargement des résultats…', 'Loading results…')}
              </div>
            )}
            {error && (
              <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            {!loading && !error && workers.length === 0 && (
              <div className="text-gray-500 text-sm">
                {tText(
                  'Aucun ouvrier trouvé avec ces critères.',
                  'No workers found with these filters.'
                )}
              </div>
            )}

            {workers.map((w) => {
              const name = `${w.first_name ?? ''} ${w.last_name ?? ''}`.trim() || tText('Ouvrier', 'Worker');
              const locationParts = [w.city, w.commune, w.district].filter(Boolean);
              const location = locationParts.join(' • ');

              return (
                <div
                  key={w.id}
                  className="bg-white border border-gray-200 rounded-xl shadow-sm px-5 py-4 flex items-center justify-between"
                >
                  <div className="flex items-center space-x-4">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 overflow-hidden">
                      {w.avatar_url ? (
                        <img
                          src={w.avatar_url}
                          alt={name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-pro-gray">{name}</h3>
                        {w.average_rating != null && (
                          <div className="flex items-center text-xs text-yellow-500">
                            <Star className="w-4 h-4 mr-1 fill-yellow-400" />
                            <span>
                              {w.average_rating.toFixed(1)}{' '}
                              <span className="text-gray-500">
                                ({w.rating_count ?? 0})
                              </span>
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="text-sm text-gray-600">
                        {w.profession ?? tText('Métier non renseigné', 'Job not specified')}
                      </div>
                      {location && (
                        <div className="flex items-center text-xs text-gray-500 mt-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          {location}
                        </div>
                      )}
                      {w.years_experience != null && (
                        <div className="text-xs text-gray-500 mt-1">
                          {tText(
                            `${w.years_experience} ans d’expérience`,
                            `${w.years_experience} years of experience`
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2">
                    <div className="text-sm font-semibold text-pro-blue">
                      {formatCurrency(w.hourly_rate, w.currency)}
                    </div>
                    <button className="inline-flex items-center rounded-md bg-pro-blue text-white text-xs font-semibold px-3 py-2 hover:bg-blue-700">
                      {tText('Contacter', 'Contact')}
                    </button>
                    <div className="flex space-x-2 text-gray-400">
                      <Phone className="w-4 h-4" />
                      <Mail className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WorkerSearchSection;
