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
  let v = raw.trim();

  // ✅ accepte "#/xxx" (HashRouter) et normalise -> "/xxx"
  if (v.startsWith("#/")) v = v.slice(1); // "#/x" -> "/x"
  if (v.startsWith("#")) v = v.slice(1);  // "#x" -> "x" (puis invalidé)

  // ✅ sécurité: on n'autorise que les chemins internes
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.toLowerCase().startsWith("/http")) return null;

  // ✅ évite le double hash déjà présent dans certains cas
  if (v.startsWith("/#/")) v = v.replace("/#/", "/");
  if (v.includes("#/#/")) v = v.replace("#/#/", "#/");

  return v;
}

const Login: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation() as { state?: LocationState; search: string };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const redirectParam = useMemo(() => safeRedirectPath(searchParams.get("redirect")), [searchParams]);

  // ✅ Si déjà connecté, rediriger immédiatement (sans appeler getUser)
  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session?.user) {
        // ✅ priorité au redirectParam (si valide)
        if (redirectParam) navigate(redirectParam, { replace: true });
        else navigate("/espace-client", { replace: true });
      }
    })();

    return () => {
      mounted = false;
    };
  }, [navigate, redirectParam]);

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
            ? "Impossible de récupérer votre session."
            : "Could not fetch user session."
        );
      }

      const userId = user.id;
      const userEmail = user.email ?? email.trim().toLowerCase();
      const defaultFullName =
        (user.user_metadata?.full_name as string | undefined) ||
        (user.user_metadata?.name as string | undefined) ||
        "";

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

      const roleRaw = String(profile?.role ?? "user").toLowerCase();
      const role =
        roleRaw === "ouvrier" || roleRaw === "provider" || roleRaw === "prestataire"
          ? "worker"
          : roleRaw === "client" || roleRaw === "particulier"
          ? "user"
          : roleRaw;

      // ✅ redirect explicite autorisé uniquement pour les clients
      if (redirectParam && role !== "admin" && role !== "worker") {
        navigate(redirectParam, { replace: true });
        return;
      }

      // ✅ Redirect par rôle (stables / conformes à tes routes)
      if (role === "admin") {
        navigate("/admin", { replace: true });
      } else if (role === "worker") {
        navigate("/espace-ouvrier", { replace: true });
      } else {
        navigate("/espace-client", { replace: true });
      }
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
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Button type="submit" disabled={loading} className="w-full bg-pro-blue hover:bg-blue-700">
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
