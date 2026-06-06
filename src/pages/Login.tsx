// src/pages/Login.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNetworkStatus } from "@/services/networkService";
import { localStore } from "@/services/localStore";
import { signInWithGoogle, signInWithFacebook } from "@/lib/socialAuth";
import { Loader2 } from "lucide-react";

type LocationState = { from?: string };
type Role = "user" | "client" | "worker" | "admin";

const LOCAL_ROLE_KEY = "local_auth_role";
const LOCAL_USER_ID_KEY = "local_auth_user_id";

function safeRedirectPath(raw: string | null) {
  if (!raw) return null;
  let v = raw.trim();
  if (v.startsWith("#/")) v = v.slice(1);
  if (v.startsWith("#")) v = v.slice(1);
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.toLowerCase().startsWith("/http")) return null;
  if (v.startsWith("/#/")) v = v.replace("/#/", "/");
  if (v.includes("#/#/")) v = v.replace("#/#/", "#/");
  return v;
}

const normalizeRole = (r: any): Role => {
  const v = String(r ?? "").toLowerCase().trim();
  if (v === "admin") return "admin";
  if (v === "worker" || v === "ouvrier" || v === "provider" || v === "prestataire") return "worker";
  if (v === "client" || v === "customer") return "client";
  if (v === "user" || v === "particulier") return "user";
  return "user";
};

// ── Icône Google ──────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// ── Icône Facebook ────────────────────────────────────────────────────────────
const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true" fill="#1877F2">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Crée ou récupère le profil dans op_users et retourne le rôle résolu.
 * Pour les connexions sociales :
 *  - "user" (client) → accès direct, informations remontées en admin
 *  - "worker" → redirigé vers complétion de profil, validation admin requise
 */
const resolveUserProfile = async (
  userId: string,
  userEmail: string,
  fullName: string,
  metaRole: Role
): Promise<Role> => {
  let { data: profile } = await supabase
    .from("op_users")
    .select("id, role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    // Première connexion : création du profil
    const { data: inserted } = await supabase
      .from("op_users")
      .insert({
        id: userId,
        email: userEmail,
        full_name: fullName || null,
        role: metaRole === "worker" ? "worker" : "user",
      })
      .select("id, role")
      .maybeSingle();
    profile = inserted;
  }

  return normalizeRole(profile?.role ?? metaRole);
};

const Login: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation() as { state?: LocationState; search: string };
  const { connected } = useNetworkStatus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [facebookLoading, setFacebookLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Onglet sélectionné : "client" ou "worker"
  const [loginTab, setLoginTab] = useState<"client" | "worker">("client");

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const redirectParam = useMemo(() => safeRedirectPath(searchParams.get("redirect")), [searchParams]);

  const goAfterLogin = (role: Role, redirect?: string | null, needsProfileCompletion = false) => {
    // Ouvrier sans profil complet → page de complétion
    if (role === "worker" && needsProfileCompletion) {
      navigate("/inscription-ouvrier?social=1", { replace: true });
      return;
    }
    if (redirect && role !== "admin" && role !== "worker") {
      navigate(redirect, { replace: true });
      return;
    }
    if (role === "admin") navigate("/admin", { replace: true });
    else if (role === "worker") navigate("/espace-ouvrier", { replace: true });
    else navigate("/espace-client", { replace: true });
  };

  // Vérification session existante
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!mounted) return;
        if (error) { console.warn("[Login] getSession:", error); return; }
        if (data.session?.user) {
          const user = data.session.user;
          const cachedRole = await localStore.get<Role>(LOCAL_ROLE_KEY);
          if (!mounted) return;
          if (cachedRole) { goAfterLogin(cachedRole, redirectParam); return; }
          goAfterLogin(
            normalizeRole(user.user_metadata?.role ?? user.app_metadata?.role ?? null),
            redirectParam
          );
        }
      } finally {
        if (mounted) setCheckingSession(false);
      }
    })();
    return () => { mounted = false; };
  }, [navigate, redirectParam]);

  // ── Connexion email/mot de passe ───────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });
      if (authError) throw authError;

      const user = data.user;
      if (!user) throw new Error(
        language === "fr" ? "Impossible de récupérer votre session." : "Could not fetch user session."
      );

      const metaRole = normalizeRole(user.user_metadata?.role ?? user.app_metadata?.role ?? null);
      const fullName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "";

      const resolvedRole = await resolveUserProfile(user.id, user.email ?? normalizedEmail, fullName, metaRole);

      await Promise.all([
        localStore.set(LOCAL_USER_ID_KEY, user.id),
        localStore.set(LOCAL_ROLE_KEY, resolvedRole),
      ]);

      goAfterLogin(resolvedRole, redirectParam);
    } catch (err: any) {
      console.error(err);
      const raw = String(err?.message ?? "").toLowerCase();
      setError(
        raw.includes("failed to fetch") || raw.includes("network")
          ? language === "fr"
            ? "Connexion impossible. Vérifiez votre réseau puis réessayez."
            : "Unable to sign in. Please check your connection and try again."
          : err?.message ?? (language === "fr"
            ? "Connexion impossible. Vérifiez vos identifiants."
            : "Unable to log in. Please check your credentials.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Connexion sociale (Google / Facebook) ─────────────────────────────────
  const handleSocialLogin = async (provider: "google" | "facebook") => {
    setError(null);
    if (provider === "google") setGoogleLoading(true);
    else setFacebookLoading(true);

    try {
      const { error } = provider === "google"
        ? await signInWithGoogle()
        : await signInWithFacebook();

      if (error) { setError(error); return; }

      const { data } = await supabase.auth.getSession();
      if (!data.session?.user) return; // Web OAuth → redirection automatique

      const user = data.session.user;
      const metaRole = normalizeRole(user.user_metadata?.role ?? user.app_metadata?.role ?? "user");
      const fullName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "";

      // Pour les ouvriers connectés via social : forcer le rôle worker
      const intendedRole: Role = loginTab === "worker" ? "worker" : "user";

      const resolvedRole = await resolveUserProfile(
        user.id,
        user.email ?? "",
        fullName,
        intendedRole
      );

      await Promise.all([
        localStore.set(LOCAL_USER_ID_KEY, user.id),
        localStore.set(LOCAL_ROLE_KEY, resolvedRole),
      ]);

      // Ouvrier connecté via social → complétion de profil obligatoire
      const needsCompletion = resolvedRole === "worker";
      goAfterLogin(resolvedRole, redirectParam, needsCompletion);
    } finally {
      if (provider === "google") setGoogleLoading(false);
      else setFacebookLoading(false);
    }
  };

  const anyLoading = loading || googleLoading || facebookLoading;

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <Card className="w-full max-w-md shadow-lg">
          <CardContent className="py-10 text-center text-slate-600">
            {language === "fr" ? "Vérification de votre session..." : "Checking your session..."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-8">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-slate-800">
            {language === "fr" ? "Connexion à votre espace" : "Sign in to your account"}
          </CardTitle>
          {redirectParam && (
            <p className="mt-1 text-sm text-slate-600">
              {language === "fr" ? "Connectez-vous pour continuer." : "Sign in to continue."}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-5 pt-2">

          {/* ── Onglets Client / Ouvrier ───────────────────────────────────── */}
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
            <button
              type="button"
              onClick={() => { setLoginTab("client"); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                loginTab === "client"
                  ? "bg-white text-pro-blue shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {language === "fr" ? "Je suis client" : "I am a client"}
            </button>
            <button
              type="button"
              onClick={() => { setLoginTab("worker"); setError(null); }}
              className={`flex-1 rounded-lg py-2 text-sm font-medium transition-all ${
                loginTab === "worker"
                  ? "bg-white text-pro-blue shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {language === "fr" ? "Je suis prestataire" : "I am a provider"}
            </button>
          </div>

          {/* Message informatif selon l'onglet */}
          {loginTab === "worker" && (
            <div className="rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
              {language === "fr"
                ? "Les prestataires doivent compléter leur profil après connexion. Votre compte sera activé après validation par notre équipe."
                : "Providers must complete their profile after signing in. Your account will be activated after review by our team."}
            </div>
          )}

          {/* ── Boutons sociaux ───────────────────────────────────────────── */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-11 border-slate-300 hover:bg-slate-50"
              onClick={() => handleSocialLogin("google")}
              disabled={anyLoading || !connected}
            >
              {googleLoading
                ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                : <GoogleIcon />}
              <span className="text-sm font-medium text-slate-700">
                {language === "fr" ? "Continuer avec Google" : "Continue with Google"}
              </span>
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full flex items-center justify-center gap-3 h-11 border-slate-300 hover:bg-blue-50"
              onClick={() => handleSocialLogin("facebook")}
              disabled={anyLoading || !connected}
            >
              {facebookLoading
                ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                : <FacebookIcon />}
              <span className="text-sm font-medium text-slate-700">
                {language === "fr" ? "Continuer avec Facebook" : "Continue with Facebook"}
              </span>
            </Button>
          </div>

          {/* ── Séparateur ────────────────────────────────────────────────── */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs text-slate-500">
              <span className="bg-white px-3">
                {language === "fr" ? "ou avec votre email" : "or with your email"}
              </span>
            </div>
          </div>

          {/* ── Formulaire email/mot de passe ─────────────────────────────── */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                disabled={anyLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                {language === "fr" ? "Mot de passe" : "Password"}
              </label>
              <Input
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === "fr" ? "Votre mot de passe" : "Your password"}
                disabled={anyLoading}
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Button
                type="submit"
                disabled={anyLoading}
                className="w-full bg-pro-blue hover:bg-blue-700 h-11"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {loading
                  ? language === "fr" ? "Connexion..." : "Signing in..."
                  : language === "fr" ? "Se connecter" : "Sign in"}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => navigate("/")}
                disabled={anyLoading}
              >
                {language === "fr" ? "Retour à l'accueil" : "Back to home"}
              </Button>
            </div>
          </form>

          <p className="text-sm text-center text-slate-600">
            {language === "fr" ? (
              <>
                Vous n&apos;avez pas encore de compte ?{" "}
                <Link to="/register" className="text-pro-blue hover:underline font-medium">
                  Créer un compte
                </Link>
              </>
            ) : (
              <>
                Don&apos;t have an account yet?{" "}
                <Link to="/register" className="text-pro-blue hover:underline font-medium">
                  Create an account
                </Link>
              </>
            )}
          </p>

          <p className="text-xs text-slate-500 text-center">
            {language === "fr"
              ? "Admins → back-office, ouvriers → espace ouvrier, autres utilisateurs → espace client."
              : "Admins → back-office, workers → worker dashboard, others → client space."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
