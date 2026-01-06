import React, { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabaseClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PlanCode = "FREE" | "MONTHLY" | "YEARLY";
type PaymentMethod = "" | "card" | "paypal" | "mobile_money" | "google_pay";

interface WorkerFormState {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  country: string;
  region: string;
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

interface GuineaRegion {
  name: string;
  cities: GuineaCity[];
}

/**
 * Région -> Ville -> Commune -> Quartier (simplifié, extensible)
 */
const GUINEA_REGIONS: GuineaRegion[] = [
  {
    name: "Conakry",
    cities: [
      {
        name: "Conakry",
        communes: [
          {
            name: "Kaloum",
            districts: ["Sandervalia", "Tombo", "Boulbinet", "Coronthie", "Almamya"],
          },
          {
            name: "Dixinn",
            districts: ["Dixinn Centre", "Taouyah", "Belle-vue", "Minière", "Hamdallaye"],
          },
          {
            name: "Matam",
            districts: ["Matam Centre", "Bonfi", "Boussoura", "Carrière", "Hafia"],
          },
          {
            name: "Ratoma",
            districts: ["Ratoma Centre", "Kipé", "Nongo", "Lambanyi", "Sonfonia", "Cosa"],
          },
          {
            name: "Matoto",
            districts: ["Matoto Centre", "Enta", "Yimbaya", "Gbessia", "Sangoyah"],
          },
        ],
      },
    ],
  },
  {
    name: "Kindia",
    cities: [
      {
        name: "Kindia",
        communes: [
          { name: "Kindia Centre", districts: ["Koliady", "Banlieue", "Manquepas", "Féréfou"] },
          { name: "Friguiagbé", districts: ["Friguiagbé Centre", "Sinta", "Damakania"] },
        ],
      },
    ],
  },
  {
    name: "Mamou",
    cities: [
      { name: "Mamou", communes: [{ name: "Mamou Centre", districts: ["Poudrière", "Petel", "Horé Fello"] }] },
      { name: "Pita", communes: [{ name: "Pita Centre", districts: ["Timbi Madina", "Ley Miro"] }] },
    ],
  },
  {
    name: "Labé",
    cities: [
      { name: "Labé", communes: [{ name: "Labé Centre", districts: ["Kouroula", "Daka", "Pounthioun"] }] },
      { name: "Koubia", communes: [{ name: "Koubia Centre", districts: ["Fafaya", "Tougué"] }] },
    ],
  },
  {
    name: "Boké",
    cities: [
      { name: "Boké", communes: [{ name: "Boké Centre", districts: ["Boké Ville", "Tanmangué", "Dibiya"] }] },
      { name: "Kamsar", communes: [{ name: "Kamsar Centre", districts: ["Filima", "Kakandé"] }] },
    ],
  },
  {
    name: "Kankan",
    cities: [
      { name: "Kankan", communes: [{ name: "Kankan Centre", districts: ["Kabada", "Bordo", "Timbo", "Missira"] }] },
      { name: "Kérouané", communes: [{ name: "Kérouané Centre", districts: ["Banankoro"] }] },
    ],
  },
  {
    name: "Faranah",
    cities: [
      { name: "Faranah", communes: [{ name: "Faranah Centre", districts: ["Faranah Ville", "Syli", "Hérémakono"] }] },
    ],
  },
  {
    name: "N'Zérékoré",
    cities: [
      { name: "N'Zérékoré", communes: [{ name: "N'Zérékoré Centre", districts: ["Mohomou", "Dorota", "Gonia"] }] },
      { name: "Lola", communes: [{ name: "Lola Centre", districts: ["Bossou"] }] },
    ],
  },
];

// mapping pays → monnaie
const getCurrencyForCountry = (countryCode: string): CurrencyInfo => {
  switch (countryCode) {
    case "GN":
      return { code: "GNF", symbol: "FG" };
    case "SN":
    case "ML":
    case "CI":
    case "BJ":
    case "BF":
    case "NE":
      return { code: "XOF", symbol: "CFA" };
    case "MA":
    case "TN":
      return { code: "MAD", symbol: "MAD" };
    case "CH":
      return { code: "CHF", symbol: "CHF" };
    case "GB":
      return { code: "GBP", symbol: "£" };
    case "US":
      return { code: "USD", symbol: "$" };
    case "FR":
    case "BE":
    case "ES":
    case "DE":
    default:
      return { code: "EUR", symbol: "€" };
  }
};

const InscriptionOuvrier: React.FC = () => {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();

  const rawPlan = (searchParams.get("plan") || "").toUpperCase();
  const plan: PlanCode =
    rawPlan === "MONTHLY" || rawPlan === "YEARLY" ? (rawPlan as PlanCode) : "FREE";

  const [form, setForm] = useState<WorkerFormState>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    country: "GN",
    region: "",
    city: "",
    commune: "",
    district: "",
    postalCode: "",
    profession: "",
    description: "",
    hourlyRate: "",
  });

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Paiement
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [paymentCompleted, setPaymentCompleted] = useState(
    searchParams.get("payment_status") === "success"
  );
  const [paymentReference, setPaymentReference] = useState<string | null>(
    searchParams.get("payment_ref")
  );

  const isPaidPlan = plan === "MONTHLY" || plan === "YEARLY";

  const planMeta = useMemo(() => {
    if (plan === "MONTHLY") {
      return {
        label: t("subscription.monthly") || (language === "fr" ? "Mensuel" : "Monthly"),
        price: "5 000 FG / mois",
        badge: language === "fr" ? "Sans engagement" : "No commitment",
        description:
          language === "fr"
            ? "Accès complet à toutes les fonctionnalités, renouvelable chaque mois."
            : "Full access to all features, renewed monthly.",
      };
    }
    if (plan === "YEARLY") {
      return {
        label: t("subscription.yearly") || (language === "fr" ? "Annuel" : "Yearly"),
        price: "50 000 FG / an",
        badge: language === "fr" ? "2 mois offerts" : "2 months free",
        description:
          language === "fr"
            ? "La meilleure valeur : toutes les fonctionnalités avec réduction annuelle."
            : "Best value: all features with yearly discount.",
      };
    }
    return {
      label: language === "fr" ? "Gratuit" : "Free",
      price: "0 FG / mois",
      badge: language === "fr" ? "Fonctionnalités limitées" : "Limited features",
      description:
        language === "fr"
          ? "Idéal pour tester la plateforme avec une visibilité limitée."
          : "Perfect to test the platform with limited visibility.",
    };
  }, [plan, t, language]);

  const currency = useMemo(() => getCurrencyForCountry(form.country), [form.country]);

  // Guinée : région → ville → commune → quartier
  const selectedRegion = useMemo(
    () => GUINEA_REGIONS.find((r) => r.name === form.region) || null,
    [form.region]
  );

  const availableCities: GuineaCity[] =
    form.country === "GN" && selectedRegion ? selectedRegion.cities : [];

  const selectedCity = useMemo(
    () => availableCities.find((c) => c.name === form.city) || null,
    [availableCities, form.city]
  );

  const availableCommunes: GuineaCommune[] =
    form.country === "GN" && selectedCity ? selectedCity.communes : [];

  const selectedCommune = useMemo(
    () => availableCommunes.find((c) => c.name === form.commune) || null,
    [availableCommunes, form.commune]
  );

  const availableDistricts: string[] =
    form.country === "GN" && selectedCommune ? selectedCommune.districts : [];

  const handleChange =
    (field: keyof WorkerFormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
    };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setProfileFile(null);
      return;
    }
    // contrôle léger: max 2 Mo (comme l'UI l'indique)
    if (file.size > 2 * 1024 * 1024) {
      setError(language === "fr" ? "Image trop volumineuse (max 2 Mo)." : "Image too large (max 2MB).");
      e.target.value = "";
      setProfileFile(null);
      return;
    }
    setProfileFile(file);
  };

  const handleStartPayment = async () => {
    if (!isPaidPlan) return;

    if (!paymentMethod) {
      setError(
        language === "fr"
          ? "Veuillez choisir un moyen de paiement."
          : "Please select a payment method."
      );
      return;
    }

    if (!form.email.trim()) {
      setError(
        language === "fr"
          ? "Veuillez renseigner au minimum votre email avant de lancer le paiement."
          : "Please fill at least your email before starting the payment."
      );
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const successUrl = `${window.location.origin}/inscription-ouvrier?plan=${plan}&payment_status=success&payment_ref={REF}`;
      const cancelUrl = `${window.location.origin}/inscription-ouvrier?plan=${plan}&payment_status=cancel`;

      const res = await fetch("/.netlify/functions/payments-start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          paymentMethod,
          email: form.email.trim().toLowerCase(),
          language,
          successUrl,
          cancelUrl,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "Payment API error");
      }

      const data = await res.json();
      if (!data.redirectUrl) throw new Error("Missing redirectUrl from payment API.");

      window.location.href = data.redirectUrl as string;
    } catch (err: any) {
      console.error("Erreur démarrage paiement:", err);
      setError(
        language === "fr"
          ? "Erreur lors du démarrage du paiement. Merci de réessayer."
          : "Error while starting payment. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const validateBeforeSubmit = (): string | null => {
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      return language === "fr" ? "Email et mot de passe sont obligatoires." : "Email and password are required.";
    }
    if (password.length < 6) {
      return language === "fr"
        ? "Le mot de passe doit contenir au moins 6 caractères."
        : "Password must be at least 6 characters long.";
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return language === "fr" ? "Veuillez renseigner votre prénom et votre nom." : "Please provide your first and last name.";
    }
    if (!form.phone.trim()) {
      return language === "fr" ? "Le téléphone est obligatoire." : "Phone is required.";
    }
    if (!form.profession.trim()) {
      return language === "fr" ? "Le métier principal est obligatoire." : "Main trade is required.";
    }
    if (!form.description.trim()) {
      return language === "fr" ? "La description est obligatoire." : "Description is required.";
    }

    // Localisation: éviter les inserts avec champs vides si la DB est stricte (NOT NULL)
    if (form.country === "GN") {
      if (!form.region) return language === "fr" ? "Veuillez choisir une région." : "Please select a region.";
      if (!form.city) return language === "fr" ? "Veuillez choisir une ville." : "Please select a city.";
      if (!form.commune) return language === "fr" ? "Veuillez choisir une commune." : "Please select a commune.";
      if (!form.district) return language === "fr" ? "Veuillez choisir un quartier." : "Please select a neighborhood.";
    } else {
      if (!form.city.trim()) return language === "fr" ? "La ville est obligatoire." : "City is required.";
    }

    if (isPaidPlan && !paymentCompleted) {
      return language === "fr"
        ? "Votre paiement n'a pas encore été confirmé. Effectuez le paiement puis revenez avec payment_status=success."
        : "Your payment is not confirmed yet. Please complete the payment and come back with payment_status=success.";
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const validationError = validateBeforeSubmit();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    try {
      const email = form.email.trim().toLowerCase();
      const password = form.password;

      // 0) Vérifier doublon profil ouvrier (best-effort)
      const { data: existingWorker, error: existingWorkerError } = await supabase
        .from("op_ouvriers")
        .select("id,status")
        .eq("email", email)
        .maybeSingle();

      if (existingWorkerError) {
        console.warn("Vérification doublon ouvrier:", existingWorkerError);
      }
      if (existingWorker) {
        setError(
          language === "fr"
            ? "Un profil ouvrier existe déjà avec cet email. Connectez-vous ou utilisez une autre adresse."
            : "A worker profile already exists with this email. Please log in or use another address."
        );
        setLoading(false);
        return;
      }

      // 1) Auth Supabase
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: form.firstName,
            last_name: form.lastName,
            role: "worker",
          },
        },
      });

      if (authError) {
        const message = authError.message?.toLowerCase() ?? "";
        if (
          message.includes("user already registered") ||
          (authError as any).code === "user_already_exists"
        ) {
          setError(
            language === "fr"
              ? "Cet email est déjà enregistré. Connectez-vous avec ce compte ou utilisez une autre adresse."
              : "This email is already registered. Please log in with this account or use another email."
          );
          setLoading(false);
          return;
        }
        throw authError;
      }

      const user = authData.user;
      if (!user) {
        throw new Error(
          language === "fr"
            ? "Impossible de créer le compte. Veuillez réessayer."
            : "Could not create account. Please try again."
        );
      }

      // 2) Upload avatar (optionnel) — ne bloque pas l'inscription si échec
      let avatarUrl: string | null = null;
      if (profileFile) {
        try {
          const fileExt = profileFile.name.split(".").pop() || "jpg";
          const fileName = `${user.id}-${Date.now()}.${fileExt}`;

          const { data: storageData, error: storageError } = await supabase.storage
            .from("op_avatars")
            .upload(fileName, profileFile);

          if (storageError) {
            console.warn("Erreur upload avatar:", storageError);
          } else if (storageData) {
            const { data: publicUrlData } = supabase.storage
              .from("op_avatars")
              .getPublicUrl(storageData.path);
            avatarUrl = publicUrlData.publicUrl;
          }
        } catch (e) {
          console.warn("Upload avatar exception:", e);
        }
      }

      // 3) Synchroniser op_users
      const fullNameForUser = `${form.firstName} ${form.lastName}`.trim() || email;

      const { error: opUserError } = await supabase.from("op_users").upsert(
        {
          id: user.id,
          role: "worker",
          full_name: fullNameForUser,
        },
        { onConflict: "id" }
      );

      if (opUserError) {
        console.error("Erreur op_users:", opUserError);
        throw opUserError;
      }

      // 4) Insert profil ouvrier
      const hourlyRateTrim = form.hourlyRate.trim();
      const hourlyRateNumber =
        hourlyRateTrim === "" ? null : Number.isFinite(Number(hourlyRateTrim)) ? Number(hourlyRateTrim) : null;

      const isFreePlan = plan === "FREE";
      const isManualMobileMoney = !isFreePlan && paymentMethod === "mobile_money";
      const isPaymentReallyPaid = isFreePlan || (paymentCompleted && !isManualMobileMoney);

      const initialPaymentStatus: "unpaid" | "pending" | "paid" = isFreePlan
        ? "paid"
        : isManualMobileMoney
        ? "pending"
        : isPaymentReallyPaid
        ? "paid"
        : "unpaid";

      const { error: insertError } = await supabase.from("op_ouvriers").insert({
        user_id: user.id,
        first_name: form.firstName,
        last_name: form.lastName,
        email,
        phone: form.phone,
        country: form.country,
        region: form.region || null,
        city: form.city || null,
        commune: form.commune || null,
        district: form.district || null,
        postal_code: form.postalCode || null,
        profession: form.profession,
        description: form.description,
        plan_code: plan,
        status: "pending",
        hourly_rate: hourlyRateNumber,
        currency: currency.code,
        avatar_url: avatarUrl,
        created_at: new Date().toISOString(),
        payment_status: initialPaymentStatus,
        payment_provider: isFreePlan ? "free_plan" : paymentMethod || "unknown",
        payment_reference: paymentReference,
        payment_at: isPaymentReallyPaid ? new Date().toISOString() : null,
      } as any);

      if (insertError) throw insertError;

      setSuccess(true);
      setForm({
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        phone: "",
        country: "GN",
        region: "",
        city: "",
        commune: "",
        district: "",
        postalCode: "",
        profession: "",
        description: "",
        hourlyRate: "",
      });
      setProfileFile(null);
      setPaymentMethod("");
      setPaymentReference(null);
      setPaymentCompleted(false);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ??
          (language === "fr"
            ? "Une erreur inattendue s'est produite. Merci de réessayer."
            : "An unexpected error occurred. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const countryOptions = [
    { code: "GN", label: "Guinée" },
    { code: "FR", label: "France" },
    { code: "BE", label: "Belgique" },
    { code: "SN", label: "Sénégal" },
    { code: "ML", label: "Mali" },
    { code: "CI", label: "Côte d’Ivoire" },
    { code: "CH", label: "Suisse" },
    { code: "ES", label: "Espagne" },
    { code: "DE", label: "Allemagne" },
    { code: "GB", label: "Royaume-Uni" },
    { code: "US", label: "États-Unis" },
  ];

  const canSubmit = !loading && (!isPaidPlan || paymentCompleted);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-12">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* En-tête */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-pro-gray mb-2">
            {language === "fr" ? "Devenir Ouvrier Pro" : "Become a Pro Worker"}
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {language === "fr"
              ? "Complétez votre profil pour être visible auprès des particuliers et professionnels près de chez vous."
              : "Complete your profile to be visible to clients near you."}
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 items-start">
          {/* Colonne Plan */}
          <Card className="md:col-span-1 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-pro-gray">
                {language === "fr" ? "Plan sélectionné" : "Selected plan"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-3">
                <div className="text-xl font-bold text-pro-blue">{planMeta.label}</div>
                <div className="text-gray-700">{planMeta.price}</div>
                <div className="inline-block mt-2 px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
                  {planMeta.badge}
                </div>
              </div>
              <p className="text-sm text-gray-600">{planMeta.description}</p>

              <ul className="mt-4 text-sm text-gray-700 list-disc list-inside space-y-1">
                {plan === "FREE" ? (
                  <>
                    <li>
                      {language === "fr"
                        ? "1 métier affiché, contacts limités"
                        : "1 listed trade, limited contacts"}
                    </li>
                    <li>{language === "fr" ? "Profil simplifié" : "Simplified profile"}</li>
                  </>
                ) : (
                  <>
                    <li>
                      {language === "fr"
                        ? "Profil complet et mise en avant"
                        : "Full profile and highlight in search"}
                    </li>
                    <li>
                      {language === "fr"
                        ? "Contacts clients illimités"
                        : "Unlimited client contacts"}
                    </li>
                  </>
                )}
                <li>
                  {language === "fr"
                    ? "Votre inscription sera vérifiée par notre équipe."
                    : "Your registration will be reviewed by our team."}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Colonne Formulaire / Succès */}
          <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-pro-gray">
                {success
                  ? language === "fr"
                    ? "Inscription réussie"
                    : "Registration successful"
                  : language === "fr"
                  ? "Informations professionnelles"
                  : "Professional information"}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {success ? (
                <div className="space-y-6 text-center py-10">
                  <div className="text-green-700 bg-green-50 border border-green-200 rounded-lg px-4 py-4 text-base md:text-lg">
                    {language === "fr" ? (
                      plan === "FREE" ? (
                        <>
                          Votre inscription au plan <strong>Gratuit</strong> a bien été enregistrée.
                          <br />
                          Votre profil sera validé par un administrateur.
                        </>
                      ) : (
                        <>
                          Votre inscription au plan <strong>{planMeta.label}</strong> a bien été enregistrée.
                          <br />
                          Votre paiement a été pris en compte. Votre profil sera validé par un administrateur.
                        </>
                      )
                    ) : plan === "FREE" ? (
                      <>
                        Your registration to the <strong>Free</strong> plan has been saved.
                        <br />
                        Your profile will be reviewed by an administrator.
                      </>
                    ) : (
                      <>
                        Your registration to the <strong>{planMeta.label}</strong> plan has been saved.
                        <br />
                        Your payment has been recorded. Your profile will be reviewed by an administrator.
                      </>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => (window.location.href = "/")}
                    className="bg-pro-blue hover:bg-blue-700 px-6 py-3 text-base md:text-lg"
                  >
                    {language === "fr" ? "Retour à l'accueil" : "Return to home"}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Nom & Prénom */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === "fr" ? "Prénom" : "First name"}
                      </label>
                      <Input
                        required
                        value={form.firstName}
                        onChange={handleChange("firstName")}
                        placeholder={language === "fr" ? "Votre prénom" : "First name"}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === "fr" ? "Nom" : "Last name"}
                      </label>
                      <Input
                        required
                        value={form.lastName}
                        onChange={handleChange("lastName")}
                        placeholder={language === "fr" ? "Votre nom" : "Last name"}
                      />
                    </div>
                  </div>

                  {/* Email & Mot de passe */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <Input
                        type="email"
                        required
                        value={form.email}
                        onChange={handleChange("email")}
                        placeholder="vous@exemple.com"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === "fr" ? "Mot de passe" : "Password"}
                      </label>
                      <Input
                        type="password"
                        required
                        minLength={6}
                        value={form.password}
                        onChange={handleChange("password")}
                        placeholder={language === "fr" ? "Au moins 6 caractères" : "At least 6 characters"}
                      />
                    </div>
                  </div>

                  {/* Téléphone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === "fr" ? "Téléphone" : "Phone"}
                    </label>
                    <Input
                      required
                      value={form.phone}
                      onChange={handleChange("phone")}
                      placeholder="+224 6X XX XX XX"
                    />
                  </div>

                  {/* Pays */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === "fr" ? "Pays" : "Country"}
                    </label>
                    <select
                      value={form.country}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          country: e.target.value,
                          region: "",
                          city: "",
                          commune: "",
                          district: "",
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

                  {/* Localisation – Mode Guinée */}
                  {form.country === "GN" ? (
                    <>
                      {/* Région */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === "fr" ? "Région" : "Region"}
                        </label>
                        <select
                          value={form.region}
                          onChange={(e) =>
                            setForm((prev) => ({
                              ...prev,
                              region: e.target.value,
                              city: "",
                              commune: "",
                              district: "",
                            }))
                          }
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue bg-white"
                        >
                          <option value="">
                            {language === "fr" ? "Choisissez une région" : "Select a region"}
                          </option>
                          {GUINEA_REGIONS.map((r) => (
                            <option key={r.name} value={r.name}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Ville & Code postal */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === "fr" ? "Ville" : "City"}
                          </label>
                          <select
                            value={form.city}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                city: e.target.value,
                                commune: "",
                                district: "",
                              }))
                            }
                            disabled={!form.region}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue bg-white disabled:bg-gray-100"
                          >
                            <option value="">
                              {language === "fr" ? "Choisissez une ville" : "Select a city"}
                            </option>
                            {availableCities.map((city) => (
                              <option key={city.name} value={city.name}>
                                {city.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === "fr" ? "Code postal" : "Postal code"}
                          </label>
                          <Input
                            value={form.postalCode}
                            onChange={handleChange("postalCode")}
                            placeholder="1000"
                          />
                        </div>
                      </div>

                      {/* Commune / Quartier */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === "fr" ? "Commune" : "Commune"}
                          </label>
                          <select
                            value={form.commune}
                            onChange={(e) =>
                              setForm((prev) => ({
                                ...prev,
                                commune: e.target.value,
                                district: "",
                              }))
                            }
                            disabled={!form.city}
                            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue bg-white disabled:bg-gray-100"
                          >
                            <option value="">
                              {language === "fr" ? "Choisissez une commune" : "Select a commune"}
                            </option>
                            {availableCommunes.map((commune) => (
                              <option key={commune.name} value={commune.name}>
                                {commune.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === "fr" ? "Quartier" : "Neighborhood"}
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
                              {language === "fr" ? "Choisissez un quartier" : "Select a neighborhood"}
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
                      {/* Fallback autres pays */}
                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === "fr" ? "Ville" : "City"}
                          </label>
                          <Input
                            required
                            value={form.city}
                            onChange={handleChange("city")}
                            placeholder={language === "fr" ? "Votre ville" : "Your city"}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === "fr" ? "Code postal" : "Postal code"}
                          </label>
                          <Input
                            value={form.postalCode}
                            onChange={handleChange("postalCode")}
                            placeholder="75001"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === "fr" ? "Commune / Région" : "District / Region"}
                          </label>
                          <Input value={form.commune} onChange={handleChange("commune")} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === "fr" ? "Quartier" : "Neighborhood"}
                          </label>
                          <Input value={form.district} onChange={handleChange("district")} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* Métier principal */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === "fr" ? "Métier principal" : "Main trade"}
                    </label>
                    <Input
                      required
                      value={form.profession}
                      onChange={handleChange("profession")}
                      placeholder={
                        language === "fr"
                          ? "Plombier, électricien, maçon..."
                          : "Plumber, electrician, builder..."
                      }
                    />
                    {plan === "FREE" && (
                      <p className="mt-1 text-xs text-gray-500">
                        {language === "fr"
                          ? "Avec le plan Gratuit, un seul métier peut être affiché."
                          : "With the Free plan, only one trade can be listed."}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === "fr" ? "Description de vos services" : "Description of your services"}
                    </label>
                    <textarea
                      required
                      value={form.description}
                      onChange={handleChange("description")}
                      className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-pro-blue focus:border-pro-blue min-h-[100px]"
                      placeholder={
                        language === "fr"
                          ? "Décrivez votre expérience, vos services, vos zones d’intervention..."
                          : "Describe your experience, services and working area..."
                      }
                    />
                  </div>

                  {/* Tarif horaire */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === "fr"
                        ? `Tarif horaire (${currency.symbol} / h) (optionnel)`
                        : `Hourly rate (${currency.symbol} / h) (optional)`}
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={form.hourlyRate}
                      onChange={handleChange("hourlyRate")}
                      placeholder={
                        language === "fr"
                          ? `Ex : 250000 ${currency.symbol}`
                          : `e.g. 20 ${currency.symbol}`
                      }
                    />
                  </div>

                  {/* Photo de profil */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {language === "fr" ? "Photo de profil (optionnel)" : "Profile picture (optional)"}
                    </label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-pro-blue file:text-white hover:file:bg-blue-700"
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      {language === "fr"
                        ? "Format JPG ou PNG recommandé, taille max ~2 Mo."
                        : "JPG or PNG recommended, max size ~2MB."}
                    </p>
                  </div>

                  {/* Erreurs */}
                  {error && (
                    <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                      {error}
                    </div>
                  )}

                  {/* Paiement */}
                  {plan !== "FREE" && (
                    <div className="border border-amber-100 bg-amber-50 rounded-lg p-4 mb-3">
                      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold text-amber-800">
                            {language === "fr" ? "Résumé de votre abonnement" : "Subscription summary"}
                          </div>
                          <div className="text-xs text-amber-700">
                            {language === "fr"
                              ? "Le montant ci-dessous sera facturé selon le mode de paiement choisi."
                              : "The amount below will be charged according to the selected payment method."}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-amber-700 uppercase">
                            {language === "fr" ? "Total à payer" : "Total to pay"}
                          </div>
                          <div className="text-lg font-bold text-amber-900">
                            {plan === "MONTHLY" ? "5 000 FG / mois" : "50 000 FG / an"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid md:grid-cols-2 gap-3">
                        <div>
                          <div className="text-xs font-semibold text-amber-800 mb-1">
                            {language === "fr" ? "Choisissez un moyen de paiement" : "Choose a payment method"}
                          </div>
                          <div className="space-y-1 text-xs text-amber-900">
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="card"
                                checked={paymentMethod === "card"}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                              />
                              <span>
                                {language === "fr"
                                  ? "Carte bancaire (Visa, MasterCard...)"
                                  : "Credit / debit card (via Stripe)"}
                              </span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="paypal"
                                checked={paymentMethod === "paypal"}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                              />
                              <span>PayPal</span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="mobile_money"
                                checked={paymentMethod === "mobile_money"}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                              />
                              <span>
                                {language === "fr"
                                  ? "Mobile Money (Orange Money, MTN, etc.)"
                                  : "Mobile money"}
                              </span>
                            </label>
                            <label className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="paymentMethod"
                                value="google_pay"
                                checked={paymentMethod === "google_pay"}
                                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                              />
                              <span>Google Pay</span>
                            </label>
                          </div>
                        </div>

                        <div className="flex flex-col justify-between">
                          <div className="text-xs text-amber-800 mb-2 leading-relaxed">
                            {language === "fr"
                              ? "Étape 1 : choisissez votre moyen de paiement.\nÉtape 2 : cliquez sur « Procéder au paiement ».\nÉtape 3 : revenez avec payment_status=success pour valider."
                              : "Step 1: choose your payment method.\nStep 2: click “Proceed to payment”.\nStep 3: come back with payment_status=success to submit."}
                          </div>
                          <div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleStartPayment}
                              className="bg-amber-600 hover:bg-amber-700"
                              disabled={loading}
                            >
                              {language === "fr" ? "Procéder au paiement" : "Proceed to payment"}
                            </Button>
                            {paymentCompleted && (
                              <p className="text-[11px] text-emerald-700 mt-1">
                                {language === "fr"
                                  ? "Paiement confirmé. Vous pouvez maintenant valider votre inscription."
                                  : "Payment confirmed. You can now submit your registration."}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Bouton */}
                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full bg-pro-blue hover:bg-blue-700 disabled:opacity-60"
                    >
                      {loading
                        ? language === "fr"
                          ? "Enregistrement..."
                          : "Saving..."
                        : plan === "FREE"
                        ? language === "fr"
                          ? "Valider mon inscription"
                          : "Submit my registration"
                        : language === "fr"
                        ? "Valider mon inscription après paiement"
                        : "Submit my registration after payment"}
                    </Button>

                    {plan !== "FREE" && !paymentCompleted && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        {language === "fr"
                          ? "Vous devez d’abord effectuer le paiement (et revenir avec payment_status=success) pour activer ce bouton."
                          : "You must complete the payment first (and come back with payment_status=success) to enable this button."}
                      </p>
                    )}
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default InscriptionOuvrier;
