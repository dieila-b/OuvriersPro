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
  city: string;
  postalCode: string;
  profession: string;
  description: string;
}

const InscriptionOuvrier: React.FC = () => {
  const { t, language } = useLanguage();
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
    city: '',
    postalCode: '',
    profession: '',
    description: '',
  });

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
    // FREE
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

  const handleChange =
    (field: keyof WorkerFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);

    try {
      // 1) Création du compte auth Supabase
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

      if (authError) {
        throw authError;
      }

      const user = authData.user;
      if (!user) {
        throw new Error(
          language === 'fr'
            ? "Impossible de créer le compte. Veuillez réessayer."
            : 'Could not create account. Please try again.'
        );
      }

      // 2) Insertion du profil ouvrier
      const { error: insertError } = await supabase.from('op_ouvriers').insert({
        user_id: user.id,
        first_name: form.firstName,
        last_name: form.lastName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        postal_code: form.postalCode,
        profession: form.profession,
        description: form.description,
        plan_code: plan,
        status: 'pending', // en attente de validation par l'admin
        created_at: new Date().toISOString(),
      });

      if (insertError) {
        throw insertError;
      }

      setSuccess(true);
      setForm({
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        phone: '',
        city: '',
        postalCode: '',
        profession: '',
        description: '',
      });
    } catch (err: any) {
      console.error(err);
      setError(err.message ?? 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

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
          {/* Colonne Plan sélectionné */}
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
                    placeholder="+33 6 12 34 56 78"
                  />
                </div>

                {/* Ville & Code postal */}
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
                      {language === 'fr'
                        ? 'Code postal'
                        : 'Postal code'}
                    </label>
                    <Input
                      required
                      value={form.postalCode}
                      onChange={handleChange('postalCode')}
                      placeholder="75001"
                    />
                  </div>
                </div>

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

                {/* Messages erreur / succès */}
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
