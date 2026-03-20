// src/pages/InscriptionOuvrier.tsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/lib/supabase";
import { Capacitor } from "@capacitor/core";

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
  latitude: string;
  longitude: string;
  accuracy: string;
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
          { name: "Kaloum", districts: ["Sandervalia", "Tombo", "Boulbinet", "Coronthie", "Almamya"] },
          { name: "Dixinn", districts: ["Dixinn Centre", "Taouyah", "Belle-vue", "Minière", "Hamdallaye"] },
          { name: "Matam", districts: ["Matam Centre", "Bonfi", "Boussoura", "Carrière", "Hafia"] },
          { name: "Ratoma", districts: ["Ratoma Centre", "Kipé", "Nongo", "Lambanyi", "Sonfonia", "Cosa"] },
          { name: "Matoto", districts: ["Matoto Centre", "Enta", "Yimbaya", "Gbessia", "Sangoyah"] },
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

/**
 * ✅ HashRouter route builder
 * HashRouter: "#/inscription-ouvrier?plan=FREE"
 */
function toHashRoute(pathWithQuery: string) {
  const p = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return `#${p}`;
}

const InscriptionOuvrier: React.FC = () => {
  const { language, t } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  const cms = useCallback(
    (fallbackFr: string, fallbackEn: string) => (language === "fr" ? fallbackFr : fallbackEn),
    [language]
  );

  // ✅ Détection native (robuste)
  const isNative =
    (() => {
      try {
        return Capacitor?.isNativePlatform?.() ?? false;
      } catch {
        return false;
      }
    })() ||
    window.location.protocol === "capacitor:" ||
    window.location.protocol === "file:";

  /**
   * ✅ Plans payants masqués → FREE
   */
  const SHOW_MONTHLY = false;
  const SHOW_YEARLY = false;

  const rawPlan = (searchParams.get("plan") || "").toUpperCase();
  const requestedPlan: PlanCode =
    rawPlan === "MONTHLY" || rawPlan === "YEARLY" ? (rawPlan as PlanCode) : "FREE";

  const plan: PlanCode = useMemo(() => {
    if (requestedPlan === "MONTHLY" && !SHOW_MONTHLY) return "FREE";
    if (requestedPlan === "YEARLY" && !SHOW_YEARLY) return "FREE";
    return requestedPlan;
  }, [requestedPlan]);

  /**
   * ✅ ROUTE LOCK (Natif)
   */
  const didLockRef = useRef(false);

  const forceHash = useCallback((targetPathWithQuery: string, replace = true) => {
    try {
      const desired = toHashRoute(targetPathWithQuery);
      const url = new URL(window.location.href);

      if (url.hash !== desired) {
        url.hash = desired;
        if (replace) window.history.replaceState({}, "", url.toString());
        else window.history.pushState({}, "", url.toString());
      }
    } catch {
      try {
        window.location.hash = toHashRoute(targetPathWithQuery);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!isNative) return;
    if (didLockRef.current) return;
    didLockRef.current = true;

    const initialTarget = `/inscription-ouvrier?plan=${encodeURIComponent(plan)}`;
    forceHash(initialTarget, true);

    const t1 = window.setTimeout(() => forceHash(initialTarget, true), 60);
    const t2 = window.setTimeout(() => forceHash(initialTarget, true), 250);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [isNative, forceHash, plan]);

  useEffect(() => {
    if (plan === requestedPlan) return;

    const target = "/inscription-ouvrier?plan=FREE";

    if (isNative) {
      forceHash(target, true);
      try {
        navigate(target, { replace: true });
      } catch {}
      return;
    }

    navigate(target, { replace: true });
  }, [plan, requestedPlan, isNative, forceHash, navigate]);

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
    latitude: "",
    longitude: "",
    accuracy: "",
  });

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("");
  const [paymentCompleted, setPaymentCompleted] = useState(
    searchParams.get("payment_status") === "success"
  );
  const [paymentReference, setPaymentReference] = useState<string | null>(
    searchParams.get("payment_ref")
  );

  const isPaidPlan = plan === "MONTHLY" || plan === "YEARLY";

  useEffect(() => {
    if (!isPaidPlan) {
      setPaymentMethod("");
      setPaymentReference(null);
      setPaymentCompleted(false);
    }
  }, [isPaidPlan]);

  useEffect(() => {
    const status = searchParams.get("payment_status");
    const ref = searchParams.get("payment_ref");
    setPaymentCompleted(status === "success");
    setPaymentReference(ref);
  }, [searchParams]);

  const planMeta = useMemo(() => {
    if (plan === "MONTHLY") {
      return {
        label: cms("Visibilité Pro Mensuelle", "Monthly Pro Visibility"),
        price: "5 000 FG / mois",
        badge: cms("Croissance continue", "Continuous growth"),
        description: cms(
          "Développez votre présence avec une visibilité renforcée et un accès élargi aux opportunités.",
          "Grow your presence with stronger visibility and broader access to opportunities."
        ),
      };
    }
    if (plan === "YEARLY") {
      return {
        label: cms("Visibilité Pro Annuelle", "Yearly Pro Visibility"),
        price: "50 000 FG / an",
        badge: cms("Meilleure valeur", "Best value"),
        description: cms(
          "Installez durablement votre activité avec une présence renforcée sur le long terme.",
          "Build long-term visibility and strengthen your activity over time."
        ),
      };
    }
    return {
      label: cms("Présence ProxiServices", "ProxiServices Presence"),
      price: cms("Inscription prestataire", "Provider registration"),
      badge: cms("Idéal pour commencer", "Perfect to get started"),
      description: cms(
        "Créez votre profil professionnel et commencez à être visible auprès de clients qui recherchent déjà vos services.",
        "Create your professional profile and start being visible to clients already looking for your services."
      ),
    };
  }, [plan, cms]);

  const currency = useMemo(() => getCurrencyForCountry(form.country), [form.country]);

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
    if (file.size > 2 * 1024 * 1024) {
      setError(cms("Image trop volumineuse (max 2 Mo).", "Image too large (max 2MB)."));
      e.target.value = "";
      setProfileFile(null);
      return;
    }
    setProfileFile(file);
  };

  const handleGeolocate = async () => {
    setError(null);

    if (!("geolocation" in navigator)) {
      setError(
        cms(
          "La géolocalisation n’est pas supportée sur ce navigateur.",
          "Geolocation is not supported in this browser."
        )
      );
      return;
    }

    try {
      setGeoLoading(true);

      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const acc = pos.coords.accuracy;

            setForm((prev) => ({
              ...prev,
              latitude: String(lat),
              longitude: String(lng),
              accuracy: acc ? String(Math.round(acc)) : "",
            }));

            resolve();
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 60_000 }
        );
      });
    } catch (err: any) {
      const code = err?.code;
      const msgFR =
        code === 1
          ? "Permission refusée. Vous pouvez continuer sans géolocalisation, mais vous serez moins facile à trouver."
          : code === 2
          ? "Position indisponible. Vérifiez votre GPS / réseau, puis réessayez."
          : "Impossible d’obtenir votre position. Réessayez.";
      const msgEN =
        code === 1
          ? "Permission denied. You can continue without location, but you may be harder to find."
          : code === 2
          ? "Position unavailable. Check GPS / network, then try again."
          : "Unable to get your position. Please try again.";

      setError(language === "fr" ? msgFR : msgEN);
    } finally {
      setGeoLoading(false);
    }
  };

  const getApiBaseUrl = () => {
    const envBase = (import.meta as any)?.env?.VITE_WEB_BASE_URL as string | undefined;
    if (isNative && envBase) return envBase.replace(/\/$/, "");
    return "";
  };

  const buildReturnUrl = (status: "success" | "cancel") => {
    const origin = window.location.origin;
    const basePath = isNative ? "/#/" : "/";
    const refPart = status === "success" ? "&payment_ref={REF}" : "";
    return `${origin}${basePath}inscription-ouvrier?plan=${plan}&payment_status=${status}${refPart}`;
  };

  const handleStartPayment = async () => {
    if (!isPaidPlan) return;

    if (!paymentMethod) {
      setError(cms("Veuillez choisir un moyen de paiement.", "Please select a payment method."));
      return;
    }

    if (!form.email.trim()) {
      setError(
        cms(
          "Veuillez renseigner au minimum votre email avant de lancer le paiement.",
          "Please fill at least your email before starting the payment."
        )
      );
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const successUrl = buildReturnUrl("success");
      const cancelUrl = buildReturnUrl("cancel");

      const apiBase = getApiBaseUrl();
      const endpoint = `${apiBase}/.netlify/functions/payments-start`;

      const res = await fetch(endpoint, {
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
        cms(
          "Erreur lors du démarrage du paiement. Merci de réessayer.",
          "Error while starting payment. Please try again."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  const validateBeforeSubmit = (): string | null => {
    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password)
      return cms("Email et mot de passe sont obligatoires.", "Email and password are required.");
    if (password.length < 6)
      return cms(
        "Le mot de passe doit contenir au moins 6 caractères.",
        "Password must be at least 6 characters long."
      );
    if (!form.firstName.trim() || !form.lastName.trim())
      return cms(
        "Veuillez renseigner votre prénom et votre nom.",
        "Please provide your first and last name."
      );
    if (!form.phone.trim()) return cms("Le téléphone est obligatoire.", "Phone is required.");
    if (!form.profession.trim())
      return cms("Le métier principal est obligatoire.", "Main trade is required.");
    if (!form.description.trim())
      return cms("La description est obligatoire.", "Description is required.");

    if (form.country === "GN") {
      if (!form.region) return cms("Veuillez choisir une région.", "Please select a region.");
      if (!form.city) return cms("Veuillez choisir une ville.", "Please select a city.");
      if (!form.commune) return cms("Veuillez choisir une commune.", "Please select a commune.");
      if (!form.district)
        return cms("Veuillez choisir un quartier.", "Please select a neighborhood.");
    } else {
      if (!form.city.trim()) return cms("La ville est obligatoire.", "City is required.");
    }

    if (isPaidPlan && !paymentCompleted) {
      return cms(
        "Votre paiement n'a pas encore été confirmé. Effectuez le paiement puis revenez avec payment_status=success.",
        "Your payment is not confirmed yet. Please complete the payment and come back with payment_status=success."
      );
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

      const { data: existingWorker, error: existingWorkerError } = await supabase
        .from("op_ouvriers")
        .select("id,status")
        .eq("email", email)
        .maybeSingle();

      if (existingWorkerError) console.warn("Vérification doublon ouvrier:", existingWorkerError);

      if (existingWorker) {
        setError(
          cms(
            "Un profil ouvrier existe déjà avec cet email. Connectez-vous ou utilisez une autre adresse.",
            "A worker profile already exists with this email. Please log in or use another address."
          )
        );
        setLoading(false);
        return;
      }

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { first_name: form.firstName, last_name: form.lastName, role: "worker" } },
      });

      if (authError) {
        const message = authError.message?.toLowerCase() ?? "";
        if (
          message.includes("user already registered") ||
          (authError as any).code === "user_already_exists"
        ) {
          setError(
            cms(
              "Cet email est déjà enregistré. Connectez-vous avec ce compte ou utilisez une autre adresse.",
              "This email is already registered. Please log in with this account or use another email."
            )
          );
          setLoading(false);
          return;
        }
        throw authError;
      }

      const user = authData.user;
      if (!user) {
        throw new Error(
          cms(
            "Impossible de créer le compte. Veuillez réessayer.",
            "Could not create account. Please try again."
          )
        );
      }

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

      const fullNameForUser = `${form.firstName} ${form.lastName}`.trim() || email;

      const { error: opUserError } = await supabase
        .from("op_users")
        .upsert({ id: user.id, role: "worker", full_name: fullNameForUser }, { onConflict: "id" });
      if (opUserError) throw opUserError;

      const hourlyRateTrim = form.hourlyRate.trim();
      const hourlyRateNumber =
        hourlyRateTrim === ""
          ? null
          : Number.isFinite(Number(hourlyRateTrim))
          ? Number(hourlyRateTrim)
          : null;

      const isFreePlan = plan === "FREE";
      const isManualMobileMoney = !isFreePlan && paymentMethod === "mobile_money";
      const isPaymentReallyPaid = isFreePlan || (paymentCompleted && !isManualMobileMoney);

      const initialPaymentStatus: "unpaid" | "pending" | "paid" =
        isFreePlan ? "paid" : isManualMobileMoney ? "pending" : isPaymentReallyPaid ? "paid" : "unpaid";

      const lat = form.latitude.trim() ? Number(form.latitude) : null;
      const lng = form.longitude.trim() ? Number(form.longitude) : null;
      const acc = form.accuracy.trim() ? Number(form.accuracy) : null;

      const payload: any = {
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
      };

      if (lat !== null && Number.isFinite(lat) && lng !== null && Number.isFinite(lng)) {
        payload.latitude = lat;
        payload.longitude = lng;
        payload.geoloc_accuracy_m = acc !== null && Number.isFinite(acc) ? acc : null;
        payload.geoloc_updated_at = new Date().toISOString();
      }

      const { error: insertError } = await supabase.from("op_ouvriers").insert(payload as any);
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
        latitude: "",
        longitude: "",
        accuracy: "",
      });
      setProfileFile(null);
      setPaymentMethod("");
      setPaymentReference(null);
      setPaymentCompleted(false);
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ??
          cms(
            "Une erreur inattendue s'est produite. Merci de réessayer.",
            "An unexpected error occurred. Please try again."
          )
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100 py-10 md:py-14">
      <div className="container mx-auto max-w-5xl px-4">
        {/* Retour */}
        <div className="mb-6 flex items-center justify-start">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate("/")}
            className="rounded-xl border border-transparent px-3 text-slate-700 shadow-sm hover:border-slate-200 hover:bg-white/70 hover:text-slate-900"
            style={{ touchAction: "manipulation" as any }}
          >
            {cms("← Retour à l'accueil", "← Back to home")}
          </Button>
        </div>

        {/* Hero onboarding */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center rounded-full border border-blue-100 bg-white px-3 py-1 text-xs font-medium text-pro-blue shadow-sm">
            {cms("Rejoignez ProxiServices", "Join ProxiServices")}
          </div>

          <h1 className="mb-3 text-3xl font-bold tracking-tight text-pro-gray md:text-5xl">
            {cms("Créez votre profil prestataire", "Create your provider profile")}
          </h1>

          <p className="mx-auto max-w-3xl text-base leading-relaxed text-slate-600 md:text-lg">
            {cms(
              "Mettez en valeur votre métier, inspirez confiance et commencez à être visible auprès de clients près de chez vous.",
              "Showcase your trade, build trust, and start being visible to clients near you."
            )}
          </p>
        </div>

        <div className="grid items-start gap-8 md:grid-cols-3">
          {/* Colonne latérale */}
          <Card className="rounded-2xl border-slate-200/70 bg-white/85 shadow-lg backdrop-blur md:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-pro-gray">
                {cms("Votre présence sur ProxiServices", "Your presence on ProxiServices")}
              </CardTitle>
            </CardHeader>

            <CardContent>
              <div className="mb-4">
                <div className="text-xl font-bold text-pro-blue">{planMeta.label}</div>
                <div className="text-slate-700">{planMeta.price}</div>
                <div className="mt-2 inline-flex items-center rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs text-emerald-700">
                  {planMeta.badge}
                </div>
              </div>

              <p className="text-sm leading-relaxed text-slate-600">{planMeta.description}</p>

              <ul className="mt-5 list-inside list-disc space-y-1.5 text-sm text-slate-700">
                <li>
                  {cms(
                    "Présentez votre activité avec un rendu professionnel",
                    "Present your activity with a professional look"
                  )}
                </li>
                <li>
                  {cms(
                    "Soyez plus facilement trouvé dans les recherches locales",
                    "Be easier to find in local searches"
                  )}
                </li>
                <li>
                  {cms(
                    "Votre inscription sera vérifiée par notre équipe",
                    "Your registration will be reviewed by our team"
                  )}
                </li>
              </ul>
            </CardContent>
          </Card>

          {/* Formulaire */}
          <Card className="rounded-2xl border-slate-200/70 bg-white/90 shadow-lg backdrop-blur md:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold text-pro-gray">
                {success
                  ? cms("Votre demande a bien été envoyée", "Your application has been sent")
                  : cms("Construisez votre profil professionnel", "Build your professional profile")}
              </CardTitle>
            </CardHeader>

            <CardContent>
              {success ? (
                <div className="space-y-6 py-10 text-center">
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-base leading-relaxed text-emerald-800 md:text-lg">
                    {cms(
                      "Votre inscription a bien été enregistrée. Votre profil sera examiné par notre équipe avant publication.",
                      "Your registration has been successfully recorded. Your profile will be reviewed by our team before publication."
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => navigate("/")}
                    className="rounded-xl bg-pro-blue px-6 py-3 text-base shadow-sm hover:bg-blue-700 md:text-lg"
                    style={{ touchAction: "manipulation" as any }}
                  >
                    {cms("Retour à l'accueil", "Return to home")}
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Identité */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {cms("Votre identité professionnelle", "Your professional identity")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {cms(
                          "Commencez par vos informations essentielles pour créer un profil crédible et rassurant.",
                          "Start with your essential details to create a credible and reassuring profile."
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {cms("Prénom", "First name")}
                        </label>
                        <Input required value={form.firstName} onChange={handleChange("firstName")} className="rounded-xl" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {cms("Nom", "Last name")}
                        </label>
                        <Input required value={form.lastName} onChange={handleChange("lastName")} className="rounded-xl" />
                      </div>
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
                        <Input type="email" required value={form.email} onChange={handleChange("email")} className="rounded-xl" />
                      </div>
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {cms("Mot de passe", "Password")}
                        </label>
                        <Input
                          type="password"
                          required
                          minLength={6}
                          value={form.password}
                          onChange={handleChange("password")}
                          className="rounded-xl"
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        {cms("Téléphone", "Phone")}
                      </label>
                      <Input required value={form.phone} onChange={handleChange("phone")} className="rounded-xl" />
                    </div>
                  </div>

                  {/* Localisation */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {cms("Votre zone d’intervention", "Your service area")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {cms(
                          "Aidez les clients à vous trouver plus facilement autour d’eux.",
                          "Help clients find you more easily near them."
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-slate-800">
                            {cms("Géolocalisation recommandée", "Recommended geolocation")}
                          </div>
                          <div className="text-xs text-slate-600">
                            {cms(
                              "Permet aux clients de vous trouver plus rapidement près de chez eux.",
                              "Helps clients find you faster near them."
                            )}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGeolocate}
                          disabled={geoLoading || loading}
                          className="rounded-xl"
                          style={{ touchAction: "manipulation" as any }}
                        >
                          {geoLoading
                            ? cms("Localisation...", "Locating...")
                            : cms("Se géolocaliser", "Use my location")}
                        </Button>
                      </div>

                      {form.latitude && form.longitude && (
                        <div className="mt-2 text-xs text-emerald-700">
                          {cms("Position détectée", "Location detected")} —{" "}
                          {Number(form.latitude).toFixed(6)}, {Number(form.longitude).toFixed(6)}
                          {form.accuracy ? ` • ±${form.accuracy}m` : ""}
                        </div>
                      )}
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        {cms("Pays", "Country")}
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
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-pro-blue focus:outline-none focus:ring-2 focus:ring-pro-blue"
                      >
                        {countryOptions.map((c) => (
                          <option key={c.code} value={c.code}>
                            {c.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {form.country === "GN" ? (
                      <>
                        <div className="mt-4">
                          <label className="mb-1 block text-sm font-medium text-slate-700">
                            {cms("Région", "Region")}
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
                            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-pro-blue focus:outline-none focus:ring-2 focus:ring-pro-blue"
                          >
                            <option value="">{cms("Choisissez une région", "Select a region")}</option>
                            {GUINEA_REGIONS.map((r) => (
                              <option key={r.name} value={r.name}>
                                {r.name}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              {cms("Ville", "City")}
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
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-pro-blue focus:outline-none focus:ring-2 focus:ring-pro-blue disabled:bg-slate-100"
                            >
                              <option value="">{cms("Choisissez une ville", "Select a city")}</option>
                              {availableCities.map((city) => (
                                <option key={city.name} value={city.name}>
                                  {city.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              {cms("Code postal", "Postal code")}
                            </label>
                            <Input value={form.postalCode} onChange={handleChange("postalCode")} className="rounded-xl" />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              {cms("Commune", "Commune")}
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
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-pro-blue focus:outline-none focus:ring-2 focus:ring-pro-blue disabled:bg-slate-100"
                            >
                              <option value="">{cms("Choisissez une commune", "Select a commune")}</option>
                              {availableCommunes.map((commune) => (
                                <option key={commune.name} value={commune.name}>
                                  {commune.name}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              {cms("Quartier", "Neighborhood")}
                            </label>
                            <select
                              value={form.district}
                              onChange={(e) =>
                                setForm((prev) => ({ ...prev, district: e.target.value }))
                              }
                              disabled={!form.commune}
                              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-pro-blue focus:outline-none focus:ring-2 focus:ring-pro-blue disabled:bg-slate-100"
                            >
                              <option value="">{cms("Choisissez un quartier", "Select a neighborhood")}</option>
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
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              {cms("Ville", "City")}
                            </label>
                            <Input required value={form.city} onChange={handleChange("city")} className="rounded-xl" />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              {cms("Code postal", "Postal code")}
                            </label>
                            <Input value={form.postalCode} onChange={handleChange("postalCode")} className="rounded-xl" />
                          </div>
                        </div>

                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              {cms("Commune / Région", "District / Region")}
                            </label>
                            <Input value={form.commune} onChange={handleChange("commune")} className="rounded-xl" />
                          </div>
                          <div>
                            <label className="mb-1 block text-sm font-medium text-slate-700">
                              {cms("Quartier", "Neighborhood")}
                            </label>
                            <Input value={form.district} onChange={handleChange("district")} className="rounded-xl" />
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Activité */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5">
                    <div className="mb-3">
                      <div className="text-sm font-semibold text-slate-900">
                        {cms("Votre activité", "Your activity")}
                      </div>
                      <div className="text-xs text-slate-500">
                        {cms(
                          "Décrivez clairement votre métier pour inspirer confiance et donner envie de vous contacter.",
                          "Describe your trade clearly to inspire trust and encourage clients to contact you."
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        {cms("Métier principal", "Main trade")}
                      </label>
                      <Input required value={form.profession} onChange={handleChange("profession")} className="rounded-xl" />
                      <p className="mt-1 text-xs text-slate-500">
                        {cms(
                          "Choisissez le métier qui représente le mieux votre expertise principale.",
                          "Choose the trade that best represents your main expertise."
                        )}
                      </p>
                    </div>

                    <div className="mt-4">
                      <label className="mb-1 block text-sm font-medium text-slate-700">
                        {cms("Présentation de vos services", "Presentation of your services")}
                      </label>
                      <textarea
                        required
                        value={form.description}
                        onChange={handleChange("description")}
                        className="min-h-[110px] w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-pro-blue focus:outline-none focus:ring-2 focus:ring-pro-blue"
                      />
                    </div>

                    <div className="mt-4 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {language === "fr"
                            ? `Tarif horaire (${currency.symbol} / h) (optionnel)`
                            : `Hourly rate (${currency.symbol} / h) (optional)`}
                        </label>
                        <Input
                          type="number"
                          min={0}
                          value={form.hourlyRate}
                          onChange={handleChange("hourlyRate")}
                          className="rounded-xl"
                        />
                      </div>

                      <div>
                        <label className="mb-1 block text-sm font-medium text-slate-700">
                          {cms("Photo de profil (optionnel)", "Profile picture (optional)")}
                        </label>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleFileChange}
                          className="block w-full text-sm text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-pro-blue file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                        />
                        <p className="mt-1 text-xs text-slate-500">
                          {cms(
                            "Format JPG/PNG recommandé, taille max ~2 Mo.",
                            "JPG/PNG recommended, max ~2MB."
                          )}
                        </p>
                      </div>
                    </div>
                  </div>

                  {error && (
                    <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  {/* Paiement si plan payant */}
                  {plan !== "FREE" && (
                    <div className="mb-3 rounded-2xl border border-amber-100 bg-amber-50 p-4 shadow-sm md:p-5">
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                        <div>
                          <div className="text-sm font-semibold text-amber-800">
                            {cms("Résumé de votre visibilité", "Visibility summary")}
                          </div>
                          <div className="text-xs text-amber-700">
                            {cms(
                              "Le montant ci-dessous sera facturé selon le mode de paiement choisi.",
                              "The amount below will be charged according to the selected payment method."
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs uppercase text-amber-700">
                            {cms("Total à payer", "Total to pay")}
                          </div>
                          <div className="text-lg font-bold text-amber-900">
                            {plan === "MONTHLY" ? "5 000 FG / mois" : "50 000 FG / an"}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid gap-3 md:grid-cols-2">
                        <div>
                          <div className="mb-1 text-xs font-semibold text-amber-800">
                            {cms("Choisissez un moyen de paiement", "Choose a payment method")}
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
                              <span>{cms("Carte bancaire (Visa, MasterCard...)", "Credit / debit card")}</span>
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
                              <span>{cms("Mobile Money", "Mobile money")}</span>
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
                          <div className="mb-2 text-xs leading-relaxed text-amber-800">
                            {cms(
                              "Étape 1 : choisissez votre moyen de paiement.\nÉtape 2 : cliquez sur « Procéder au paiement ».\nÉtape 3 : revenez avec payment_status=success pour finaliser.",
                              "Step 1: choose your payment method.\nStep 2: click “Proceed to payment”.\nStep 3: come back with payment_status=success to finalize."
                            )
                              .split("\n")
                              .map((line, i) => (
                                <div key={i}>{line}</div>
                              ))}
                          </div>

                          <div>
                            <Button
                              type="button"
                              size="sm"
                              onClick={handleStartPayment}
                              className="rounded-xl bg-amber-600 hover:bg-amber-700"
                              disabled={loading}
                              style={{ touchAction: "manipulation" as any }}
                            >
                              {cms("Procéder au paiement", "Proceed to payment")}
                            </Button>

                            {paymentCompleted && (
                              <p className="mt-1 text-[11px] text-emerald-700">
                                {cms(
                                  "Paiement confirmé. Vous pouvez maintenant finaliser votre inscription.",
                                  "Payment confirmed. You can now finalize your registration."
                                )}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="pt-2">
                    <Button
                      type="submit"
                      disabled={!canSubmit}
                      className="w-full rounded-xl bg-pro-blue py-5 shadow-sm hover:bg-blue-700 disabled:opacity-60"
                      style={{ touchAction: "manipulation" as any }}
                    >
                      {loading
                        ? cms("Enregistrement...", "Saving...")
                        : plan === "FREE"
                        ? cms("Créer mon profil prestataire", "Create my provider profile")
                        : cms(
                            "Finaliser mon inscription prestataire",
                            "Finalize my provider registration"
                          )}
                    </Button>

                    {plan !== "FREE" && !paymentCompleted && (
                      <p className="mt-1 text-[11px] text-amber-700">
                        {cms(
                          "Vous devez d’abord effectuer le paiement pour activer ce bouton.",
                          "You must complete the payment first to enable this button."
                        )}
                      </p>
                    )}

                    {isNative &&
                      plan !== "FREE" &&
                      !(import.meta as any)?.env?.VITE_WEB_BASE_URL && (
                        <p className="mt-2 text-[11px] text-amber-700">
                          {cms(
                            "Note Android: définis VITE_WEB_BASE_URL (ex: https://ton-site.netlify.app) pour éviter les 404 sur les fonctions de paiement.",
                            "Android note: set VITE_WEB_BASE_URL (e.g. https://your-site.netlify.app) to avoid 404 on payment functions."
                          )}
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
