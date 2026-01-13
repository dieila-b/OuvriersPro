// src/pages/Login.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type LocationState = {
  from?: string;
};

function safeRedirectPath(raw: string | null) {
  if (!raw) return null;
  const v = raw.trim();

  // ✅ sécurité: uniquement chemins internes
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.toLowerCase().startsWith("/http")) return null;

  return v;
}

const Login: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation() as { state?: LocationState; search: string; pathname: string };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  // ✅ IMPORTANT :
  // - PrivateRoute (version corrigée) redirige vers /login?next=...
  // - on garde aussi compatibilité /login?redirect=...
  const nextParam = useMemo(
    () => safeRedirectPath(searchParams.get("next")),
    [searchParams]
  );
  const redirectParam = useMemo(
    () => safeRedirectPath(searchParams.get("redirect")),
    [searchParams]
  );

  const stateFrom = useMemo(
    () => safeRedirectPath(location.state?.from || null),
    [location.state?.from]
  );

  // ✅ destination finale (priorité: next > redirect > state.from)
  const targetAfterLogin = useMemo(
    () => nextParam || redirectParam || stateFrom || null,
    [nextParam, redirectParam, stateFrom]
  );

  const routeByRole = (role: string) => {
    const r = (role || "user").toLowerCase();
    if (r === "admin") return "/admin/dashboard";
    if (r === "worker") return "/espace-ouvrier";
    return "/espace-client";
  };

  // ✅ Si déjà connecté, on redirige tout de suite
  useEffect(() => {
    let mounted = true;

    const checkExistingSession = async () => {
      setChecking(true);
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!mounted) return;

        if (!sessionData.session?.user) {
          setChecking(false);
          return;
        }

        const user = sessionData.session.user;

        // tenter de récupérer le rôle (sinon fallback user)
        const { data: profile } = await supabase
          .from("op_users")
          .select("role")
          .eq("id", user.id)
          .maybeSingle();

        const role = (profile?.role as string) || "user";

        // si target présent et role user -> on respecte le target
        if (targetAfterLogin && role === "user") {
          navigate(targetAfterLogin, { replace: true });
          return;
        }

        navigate(routeByRole(role), { replace: true });
      } catch (e) {
        console.error("checkExistingSession error", e);
      } finally {
        if (mounted) setChecking(false);
      }
    };

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, [navigate, targetAfterLogin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) throw authError;

      const user = data.user;
      if (!user) {
        throw new Error(
          language === "fr"
            ? "Impossible de récupérer votre compte."
            : "Could not fetch user session."
        );
      }

      const userId = user.id;
      const userEmail = user.email ?? email.trim().toLowerCase();
      const defaultFullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        null;

      // 2) Récupérer / créer le profil dans op_users
      let { data: profile, error: profileError } = await supabase
        .from("op_users")
        .select("id, role, full_name")
        .eq("id", userId)
        .maybeSingle();

      // ⚠️ si ta RLS bloque la lecture, profileError peut arriver
      if (profileError) {
        console.warn("op_users select role error:", profileError);
      }

      if (!profile) {
        const { data: inserted, error: insertError } = await supabase
          .from("op_users")
          .insert({
            id: userId,
            email: userEmail,
            full_name: defaultFullName,
            role: "user",
          })
          .select("id, role, full_name")
          .maybeSingle();

        if (insertError) throw insertError;
        profile = inserted;
      }

      const role = ((profile?.role as string) || "user").toLowerCase();

      // ✅ Si un target est demandé et que c'est un client, on y va
      if (targetAfterLogin && role === "user") {
        navigate(targetAfterLogin, { replace: true });
        return;
      }

      // sinon, redirection par rôle
      navigate(routeByRole(role), { replace: true });
    } catch (err: any) {
      console.error(err);
      setError(
        err?.message ??
          (language === "fr"
            ? "Connexion impossible. Vérifiez vos identifiants."
            : "Unable to log in. Please check your credentials.")
      );
    } finally {
      setLoading(false);
    }
  };

  // ✅ Pendant le check session, on évite un flash de formulaire
  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="text-sm text-slate-500">
          {language === "fr" ? "Vérification de votre session..." : "Checking your session..."}
        </div>
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

          {targetAfterLogin && (
            <p className="mt-2 text-sm text-slate-600">
              {language === "fr" ? "Connectez-vous pour continuer." : "Sign in to continue."}
            </p>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <Input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={language === "fr" ? "Votre mot de passe" : "Your password"}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button type="submit" disabled={loading} className="w-full bg-pro-blue hover:bg-blue-700">
              {loading
                ? language === "fr"
                  ? "Connexion..."
                  : "Signing in..."
                : language === "fr"
                ? "Se connecter"
                : "Sign in"}
            </Button>

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
                ? "Les administrateurs vont au back-office, les ouvriers à leur espace, et les autres utilisateurs à l’espace client."
                : "Admins go to back-office, workers to their dashboard, and other users to the client space."}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
