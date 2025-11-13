import React, { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabaseClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type PlanCode = 'FREE' | 'MONTHLY' | 'YEARLY';

interface WorkerFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  city: string;
  commune: string;
  district: string;
  postalCode: string;
  profession: string;
  description: string;
  hourlyRate: string;
}

interface CurrencyInfo {
  code: string;
  symbol: string;
}

interface GuineaCommune {
  name: string;
  districts: string[];
}

interface GuineaCity {
  name: string;
  communes: GuineaCommune[];
}

/**
 * Villes / Communes / Quartiers principaux de Guinée
 * (base de travail – tu peux compléter la liste au besoin)
 */
const GUINEA_CITIES: GuineaCity[] = [
  {
    name: 'Conakry',
    communes: [
      {
        name: 'Kaloum',
        districts: ['Sandervalia', 'Tombo', 'Boulbinet', 'Coronthie', 'Almamya'],
      },
      {
        name: 'Dixinn',
        districts: ['Dixinn Centre', 'Taouyah', 'Belle-vue', 'Minière', 'Hamdallaye'],
      },
      {
        name: 'Matam',
        districts: ['Matam Centre', 'Bonfi', 'Boussoura', 'Carrière', 'Hafia'],
      },
      {
        name: 'Ratoma',
        districts: ['Ratoma Centre', 'Kipé', 'Nongo', 'Lambanyi', 'Sonfonia', 'Cosa'],
      },
      {
        name: 'Matoto',
        districts: ['Matoto Centre', 'Enta', 'Yimbaya', 'Gbessia', 'Sangoyah'],
      },
    ],
  },
  {
    name: 'Kindia',
    communes: [
      {
        name: 'Kindia Centre',
        districts: ['Koliady', 'Banlieue', 'Manquepas', 'Féréfou'],
      },
      {
        name: 'Friguiagbé',
        districts: ['Friguiagbé Centre', 'Sinta', 'Damakania'],
      },
    ],
  },
  {
    name: 'Mamou',
    communes: [
      {
        name: 'Mamou Centre',
        districts: ['Poudrière', 'Petel', 'Horé Fello'],
      },
      {
        name: 'Pita',
        districts: ['Pita Centre', 'Timbi Madina', 'Ley Miro'],
      },
    ],
  },
  {
    name: 'Labé',
    communes: [
      {
        name: 'Labé Centre',
        districts: ['Kouroula', 'Daka', 'Pounthioun'],
      },
      {
        name: 'Koubia',
        districts: ['Koubia Centre', 'Fafaya', 'Tougué'],
      },
    ],
  },
  {
    name: 'Boké',
    communes: [
      {
        name: 'Boké Centre',
        districts: ['Boké Ville', 'Tanmangué', 'Dibiya'],
      },
      {
        name: 'Kamsar',
        districts: ['Kamsar Centre', 'Filima', 'Kakandé'],
      },
    ],
  },
  {
    name: 'Kankan',
    communes: [
      {
        name: 'Kankan Centre',
        districts: ['Kabada', 'Bordo', 'Timbo', 'Missira'],
      },
      {
        name: 'Kérouané',
        districts: ['Kérouané Centre', 'Banankoro'],
      },
    ],
  },
  {
    name: 'Faranah',
    communes: [
      {
        name: 'Faranah Centre',
        districts: ['Faranah Ville', 'Syli', 'Hérémakono'],
      },
    ],
  },
  {
    name: 'N’Zérékoré',
    communes: [
      {
        name: 'N’Zérékoré Centre',
        districts: ['Mohomou', 'Dorota', 'Gonia'],
      },
      {
        name: 'Lola',
        districts: ['Lola Centre', 'Bossou'],
      },
    ],
  },
];

// mapping pays → monnaie
const getCurrencyForCountry = (countryCode: string): CurrencyInfo => {
  switch (countryCode) {
    case 'GN':
      return { code: 'GNF', symbol: 'FG' }; // Guinée
    case 'SN':
    case 'ML':
    case 'CI':
    case 'BJ':
    case 'BF':
    case 'NE':
      return { code: 'XOF', symbol: 'CFA' };
    case 'MA':
    case 'TN':
      return { code: 'MAD', symbol: 'MAD' };
    case 'CH':
      return { code: 'CHF', symbol: 'CHF' };
    case 'GB':
      return { code: 'GBP', symbol: '£' };
    case 'US':
      return { code: 'USD', symbol: '$' };
    case 'FR':
    case 'BE':
    case 'ES':
    case 'DE':
    default:
      return { code: 'EUR', symbol: '€' };
  }
};

const InscriptionOuvrier: React.FC = () => {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();

  const rawPlan = (searchParams.get('plan') || '').toUpperCase();
  const plan: PlanCode =
    rawPlan === 'MONTHLY' || rawPlan === 'YEARLY' ? (rawPlan as PlanCode) : 'FREE';

  const [form, setForm] = useState<WorkerFormState>({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    phone: '',
    country: 'GN', // Guinée par défaut
    city: '',
    commune: '',
    district: '',
    postalCode: '',
    profession: '',
    description: '',
    hourlyRate: '',
  });

  const [profileFile, setProfileFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const planMeta = useMemo(() => {
    if (plan === 'MONTHLY') {
      return {
        label: t('subscription.monthly'),
        price: '29€ / mois',
        badge: language === 'fr' ? 'Sans engagement' : 'No commitment',
        description:
          language === 'fr'
            ? 'Accès complet à toutes les fonctionnalités, renouvelable chaque mois.'
            : 'Full access to all features, renewed monthly.',
      };
    }
    if (plan === 'YEARLY') {
      return {
        label: t('subscription.yearly'),
        price: '290€ / an',
        badge: language === 'fr' ? '2 mois offerts' : '2 months free',
        description:
          language === 'fr'
            ? 'La meilleure valeur : toutes les fonctionnalités avec réduction annuelle.'
            : 'Best value: all features with yearly discount.',
      };
    }
    return {
      label: language === 'fr' ? 'Gratuit' : 'Free',
      price: '0€ / mois',
      badge:
        language === 'fr'
          ? 'Fonctionnalités limitées'
          : 'Limited features',
      description:
        language === 'fr'
          ? 'Idéal pour tester la plateforme avec une visibilité limitée.'
          : 'Perfect to test the platform with limited visibility.',
    };
  }, [plan, t, language]);

  const currency = useMemo(
    () => getCurrencyForCountry(form.country),
    [form.country]
  );

  // données dérivées pour la Guinée
  const selectedGuineaCity = useMemo(
    () => GUINEA_CITIES.find((c) => c.name === form.city) || null,
    [form.city]
  );

  const availableGuineaCommunes: GuineaCommune[] =
    form.country === 'GN' && selectedGuineaCity ? selectedGuineaCity.communes : [];

  const selectedGuineaCommune = useMemo(
    () =>
      availableGuineaCommunes.find((c) => c.name === form.commune) || null,
    [availableGuineaCommunes, form.commune]
  );

  const availableGuineaDistricts: string[] =
    form.country === 'GN' && selectedGuineaCommune
      ? selectedGuineaCommune.districts
      : [];

  const handleChange =
    (field: keyof WorkerFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProfileFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // 1) Auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
        options: {
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            role: 'worker',
          },
        },
      });

      if (authError) throw authError;

      const user = authData.user;
      if (!user) {
        throw new Error(
          language === 'fr'
            ? "Impossible de créer le compte. Veuillez réessayer."
            : 'Could not create account. Please try again.'
        );
      }

      // 2) Upload avatar (optionnel)
      let avatarUrl: string | null = null;
      if (profileFile) {
        const fileExt = profileFile.name.split('.').pop();
        const fileName = `${user.id}-${Date.now()}.${fileExt}`;
        const { data: storageData, error: storageError } =
          await supabase.storage.from('op_avatars').upload(fileName, profileFile);

        if (storageError) {
          console.warn('Erreur upload avatar:', storageError.message);
        } else if (storageData) {
          const { data: publicUrlData } = supabase.storage
            .from('op_avatars')
            .getPublicUrl(storageData.path);
          avatarUrl = publicUrlData.publicUrl;
        }
      }

      // 3) Insert profil ouvrier
      const hourlyRateNumber =
        form.hourlyRate.trim() === '' ? null : Number(form.hourlyRate);

      const { error: insertError } = await supabase.from('op_ouvriers').insert({
        user_id: user.id,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        country: form.country,
        city: form.city,
        commune: form.commune,
        district: form.district,
        postal_code: form.postalCode,
        profession: form.profession,
        description: form.description,
        plan_code: plan,
        status: 'pending',
        hourly_rate: hourlyRateNumber,
        currency: currency.code,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
      });

      if (insertError) throw insertError;

      setSuccess(true);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        country: 'GN',
        city: '',
        commune: '',
        district: '',
        postalCode: '',
        profession: '',
        description: '',
        hourlyRate: '',
      });
      setProfileFile(null);
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const countryOptions = [
    { code: 'GN', label: 'Guinée' },
    { code: 'FR', label: 'France' },
    { code: 'BE', label: 'Belgique' },
    { code: 'SN', label: 'Sénégal' },
    { code: 'ML', label: 'Mali' },
    { code: 'CI', label: "Côte d’Ivoire" },
    { code: 'CH', label: 'Suisse' },
    { code: 'ES', label: 'Espagne' },
    { code: 'DE', label: 'Allemagne' },
    { code: 'GB', label: 'Royaume-Uni' },
    { code: 'US', label: 'États-Unis' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* En-tête */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-pro-gray mb-2">
            {language === 'fr'
              ? 'Devenir Ouvrier Pro'
              : 'Become a Pro Worker'}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {language === 'fr'
              ? 'Complétez votre profil pour être visible auprès des particuliers et professionnels près de chez vous.'
              : 'Complete your profile to be visible to clients near you.'}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {/* Colonne Plan */}
          <Card className="md:col-span-1 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-pro-gray">
                {language === 'fr'
                  ? 'Plan sélectionné'
                  : 'Selected plan'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <div className="text-xl font-bold text-pro-blue">
                  {planMeta.label}
                </div>
                <div className="text-gray-700">{planMeta.price}</div>
                <div className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                  {planMeta.badge}
                </div>
              </div>
              <p className="text-sm text-gray-600">{planMeta.description}</p>

              <ul className="mt-4 text-sm text-gray-700 list-disc list-inside space-y-1">
                {plan === 'FREE' && (
                  <>
                    <li>
                      {language === 'fr'
                        ? '1 métier affiché, contacts limités'
                        : '1 listed trade, limited contacts'}
                    </li>
                    <li>
                      {language === 'fr'
                        ? 'Profil simplifié'
                        : 'Simplified profile'}
                    </li>
                  </>
                )}
                {plan !== 'FREE' && (
                  <>
                    <li>
                      {language === 'fr'
                        ? 'Profil complet et mise en avant'
                        : 'Full profile and highlight in search'}
                    </li>
                    <li>
                      {language === 'fr'
                        ? 'Contacts clients illimités'
                        : 'Unlimited client contacts'}
                    </li>
                  </>
                )}
                <li>
                  {language === 'fr'
                    ? 'Votre inscription sera vérifiée par notre équipe.'
                    : 'Your registration will be reviewed by our team.'}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Colonne Formulaire */}
          <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-pro-gray">
                {language === 'fr'
                  ? 'Informations professionnelles'
                  : 'Professional information'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Nom & Prénom */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Prénom' : 'First name'}
                    </label>
                    <Input
                      required
                      value={form.firstName}
                      onChange={handleChange('firstName')}
                      placeholder={
                        language === 'fr' ? 'Votre prénom' : 'First name'
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Nom' : 'Last name'}
                    </label>
                    <Input
                      required
                      value={form.lastName}
                      onChange={handleChange('lastName')}
                      placeholder={
                        language === 'fr' ? 'Votre nom' : 'Last name'
                      }
                    />
                  </div>
                </div>

                {/* Email & Mot de passe */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <Input
                      type="email"
                      required
                      value={form.email}
                      onChange={handleChange('email')}
                      placeholder="vous@exemple.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === 'fr' ? 'Mot de passe' : 'Password'}
                    </label>
                    <Input
                      type="password"
                      required
                      minLength={6}
                      value={form.password}
                      onChange={handleChange('password')}
                      placeholder={
                        language === 'fr'
                          ? 'Au moins 6 caractères'
                          : 'At least 6 characters'
                      }
                    />
                  </div>
                </div>

                {/* Téléphone */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'fr' ? 'Téléphone' : 'Phone'}
                  </label>
                  <Input
                    required
                    value={form.phone}
                    onChange={handleChange('phone')}
                    placeholder="+224 6X XX XX XX"
                  />
                </div>

                {/* Pays */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'fr' ? 'Pays' : 'Country'}
                  </label>
                  <select
                    value={form.country}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        country: e.target.value,
                        // si on quitte la Guinée, on garde les valeurs texte
                      }))
                    }
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue bg-white"
                  >
                    {countryOptions.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Ville / Code postal */}
                {form.country === 'GN' ? (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? 'Ville' : 'City'}
                        </label>
                        <select
                          value={form.city}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              city: e.target.value,
                              commune: '',
                              district: '',
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue bg-white"
                        >
                          <option value="">
                            {language === 'fr'
                              ? 'Choisissez une ville'
                              : 'Select a city'}
                          </option>
                          {GUINEA_CITIES.map((city) => (
                            <option key={city.name} value={city.name}>
                              {city.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? 'Code postal' : 'Postal code'}
                        </label>
                        <Input
                          value={form.postalCode}
                          onChange={handleChange('postalCode')}
                          placeholder="1000"
                        />
                      </div>
                    </div>

                    {/* Commune / Quartier */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? 'Commune' : 'Commune'}
                        </label>
                        <select
                          value={form.commune}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              commune: e.target.value,
                              district: '',
                            }))
                          }
                          disabled={!form.city}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue bg-white disabled:bg-gray-100"
                        >
                          <option value="">
                            {language === 'fr'
                              ? 'Choisissez une commune'
                              : 'Select a commune'}
                          </option>
                          {availableGuineaCommunes.map((commune) => (
                            <option key={commune.name} value={commune.name}>
                              {commune.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? 'Quartier' : 'Neighborhood'}
                        </label>
                        <select
                          value={form.district}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              district: e.target.value,
                            }))
                          }
                          disabled={!form.commune}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue bg-white disabled:bg-gray-100"
                        >
                          <option value="">
                            {language === 'fr'
                              ? 'Choisissez un quartier'
                              : 'Select a neighborhood'}
                          </option>
                          {availableGuineaDistricts.map((q) => (
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
                    {/* Fallback pour les autres pays : champs texte */}
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? 'Ville' : 'City'}
                        </label>
                        <Input
                          required
                          value={form.city}
                          onChange={handleChange('city')}
                          placeholder={
                            language === 'fr' ? 'Votre ville' : 'Your city'
                          }
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? 'Code postal' : 'Postal code'}
                        </label>
                        <Input
                          value={form.postalCode}
                          onChange={handleChange('postalCode')}
                          placeholder="75001"
                        />
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr'
                            ? 'Commune'
                            : 'District / Borough'}
                        </label>
                        <Input
                          value={form.commune}
                          onChange={handleChange('commune')}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'fr' ? 'Quartier' : 'Neighborhood'}
                        </label>
                        <Input
                          value={form.district}
                          onChange={handleChange('district')}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Métier principal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'fr'
                      ? 'Métier principal'
                      : 'Main trade'}
                  </label>
                  <Input
                    required
                    value={form.profession}
                    onChange={handleChange('profession')}
                    placeholder={
                      language === 'fr'
                        ? 'Plombier, électricien, maçon...'
                        : 'Plumber, electrician, builder...'
                    }
                  />
                  {plan === 'FREE' && (
                    <p className="mt-1 text-xs text-gray-500">
                      {language === 'fr'
                        ? 'Avec le plan Gratuit, un seul métier peut être affiché.'
                        : 'With the Free plan, only one trade can be listed.'}
                    </p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'fr'
                      ? 'Description de vos services'
                      : 'Description of your services'}
                  </label>
                  <textarea
                    required
                    value={form.description}
                    onChange={handleChange('description')}
                    className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue min-h-[100px]"
                    placeholder={
                      language === 'fr'
                        ? 'Décrivez votre expérience, vos services, vos zones d’intervention...'
                        : 'Describe your experience, services and working area...'
                    }
                  />
                </div>

                {/* Tarif horaire (optionnel) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'fr'
                      ? `Tarif horaire (${currency.symbol} / h) (optionnel)`
                      : `Hourly rate (${currency.symbol} / h) (optional)`}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    value={form.hourlyRate}
                    onChange={handleChange('hourlyRate')}
                    placeholder={
                      language === 'fr'
                        ? `Ex : 250 000 ${currency.symbol}`
                        : `e.g. 20 ${currency.symbol}`
                    }
                  />
                </div>

                {/* Photo de profil (optionnelle) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {language === 'fr'
                      ? 'Photo de profil (optionnel)'
                      : 'Profile picture (optional)'}
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pro-blue file:text-white hover:file:bg-blue-700"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    {language === 'fr'
                      ? 'Format JPG ou PNG recommandé, taille max ~2 Mo.'
                      : 'JPG or PNG recommended, max size ~2MB.'}
                  </p>
                </div>

                {/* Messages */}
                {error && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                    {error}
                  </div>
                )}
                {success && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-100 rounded-md px-3 py-2">
                    {language === 'fr'
                      ? "Votre inscription a bien été enregistrée. Un email de confirmation vous a été envoyé et votre profil sera validé par un administrateur."
                      : 'Your registration has been saved. A confirmation email has been sent and your profile will be reviewed by an administrator.'}
                  </div>
                )}

                {/* Bouton */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-pro-blue hover:bg-blue-700"
                  >
                    {loading
                      ? language === 'fr'
                        ? 'Enregistrement...'
                        : 'Saving...'
                      : language === 'fr'
                      ? 'Valider mon inscription'
                      : 'Submit my registration'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InscriptionOuvrier;
