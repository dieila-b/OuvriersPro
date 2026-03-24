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

type LocationState = {
  from?: string;
};

type Role = "user" | "client" | "worker" | "admin";

const LOCAL_ROLE_KEY = "local_auth_role";
const LOCAL_USER_ID_KEY = "local_auth_user_id";

function safeRedirectPath(raw: string | null) {
  if (!raw) return null;
  let v = raw.trim();

  // ✅ accepte "#/xxx" (HashRouter) et normalise -> "/xxx"
  if (v.startsWith("#/")) v = v.slice(1);
  if (v.startsWith("#")) v = v.slice(1);

  // ✅ sécurité: on n'autorise que les chemins internes
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.toLowerCase().startsWith("/http")) return null;

  // ✅ évite le double hash déjà présent dans certains cas
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

const Login: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation() as { state?: LocationState; search: string };
  const { connected, initialized } = useNetworkStatus();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [checkingSession, setCheckingSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const redirectParam = useMemo(() => safeRedirectPath(searchParams.get("redirect")), [searchParams]);

  const goAfterLogin = (role: string, redirect?: string | null) => {
    const normalizedRole = normalizeRole(role);

    // redirect explicite autorisé uniquement pour clients/users
    if (redirect && normalizedRole !== "admin" && normalizedRole !== "worker") {
      navigate(redirect, { replace: true });
      return;
    }

    if (normalizedRole === "admin") {
      navigate("/admin", { replace: true });
    } else if (normalizedRole === "worker") {
      navigate("/espace-ouvrier", { replace: true });
    } else {
      navigate("/espace-client", { replace: true });
    }
  };

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (!mounted) return;

        if (error) {
          console.warn("[Login] getSession warning:", error);
          return;
        }

        if (data.session?.user) {
          const user = data.session.user;

          // essaie de relire le rôle local d'abord pour accélérer le boot offline
          const cachedRole = await localStore.get<Role>(LOCAL_ROLE_KEY);
          if (!mounted) return;

          if (cachedRole) {
            goAfterLogin(cachedRole, redirectParam);
            return;
          }

          const metaRole = normalizeRole(
            user.user_metadata?.role ?? user.app_metadata?.role ?? null
          );

          goAfterLogin(metaRole, redirectParam);
        }
      } finally {
        if (mounted) setCheckingSession(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate, redirectParam]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    setError(null);

    if (initialized && !connected) {
      setError(
        language === "fr"
          ? "Connexion Internet requise pour vous connecter. Si vous vous êtes déjà connecté auparavant, revenez quand la session locale est encore active."
          : "An internet connection is required to sign in. If you already signed in before, come back when the local session is still active."
      );
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
      });

      if (authError) throw authError;

      const user = data.user;
      if (!user) {
        throw new Error(
          language === "fr"
            ? "Impossible de récupérer votre session."
            : "Could not fetch user session."
        );
      }

      const userId = user.id;
      const userEmail = user.email ?? normalizedEmail;
      const defaultFullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        "";

      let resolvedRole: Role = normalizeRole(
        user.user_metadata?.role ?? user.app_metadata?.role ?? null
      );

      // 2) Récupérer / créer le profil dans op_users
      let { data: profile, error: profileError } = await supabase
        .from("op_users")
        .select("id, role, full_name")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!profile) {
        const { data: inserted, error: insertError } = await supabase
          .from("op_users")
          .insert({
            id: userId,
            email: userEmail,
            full_name: defaultFullName || null,
            role: "user",
          })
          .select("id, role, full_name")
          .maybeSingle();

        if (insertError) throw insertError;
        profile = inserted;
      }

      if (profile?.role) {
        resolvedRole = normalizeRole(profile.role);
      }

      // persistance locale pour aider le mode offline-safe
      await Promise.all([
        localStore.set(LOCAL_USER_ID_KEY, userId),
        localStore.set(LOCAL_ROLE_KEY, resolvedRole),
      ]);

      goAfterLogin(resolvedRole, redirectParam);
    } catch (err: any) {
      console.error(err);

      const rawMessage = String(err?.message ?? "").toLowerCase();

      if (rawMessage.includes("failed to fetch") || rawMessage.includes("network")) {
        setError(
          language === "fr"
            ? "Connexion impossible sans Internet. Vérifiez votre réseau puis réessayez."
            : "Unable to sign in without internet. Please check your connection and try again."
        );
      } else {
        setError(
          err?.message ??
            (language === "fr"
              ? "Connexion impossible. Vérifiez vos identifiants."
              : "Unable to log in. Please check your credentials.")
        );
      }
    } finally {
      setLoading(false);
    }
  };

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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            {language === "fr" ? "Connexion à votre espace" : "Sign in to your account"}
          </CardTitle>

          {redirectParam && (
            <p className="mt-2 text-sm text-slate-600">
              {language === "fr" ? "Connectez-vous pour continuer." : "Sign in to continue."}
            </p>
          )}

          {initialized && !connected && (
            <div className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              {language === "fr"
                ? "Vous êtes hors connexion. Une nouvelle connexion nécessite Internet, mais une session déjà enregistrée peut encore permettre l’accès."
                : "You are offline. A new sign-in requires internet, but a previously saved session may still allow access."}
            </div>
          )}
        </CardHeader>

        <CardContent>
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
                disabled={loading || (initialized && !connected)}
                className="w-full bg-pro-blue hover:bg-blue-700"
              >
                {loading
                  ? language === "fr"
                    ? "Connexion..."
                    : "Signing in..."
                  : language === "fr"
                  ? "Se connecter"
                  : "Sign in"}
              </Button>

              <Button type="button" variant="outline" className="w-full" onClick={() => navigate("/")}>
                {language === "fr" ? "Retour à l'accueil" : "Back to home"}
              </Button>
            </div>

            <p className="mt-3 text-sm text-center text-slate-600">
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

            <p className="mt-2 text-xs text-slate-500">
              {language === "fr"
                ? "Admins → back-office, ouvriers → espace ouvrier, autres utilisateurs → espace client."
                : "Admins → back-office, workers → worker dashboard, others → client space."}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
