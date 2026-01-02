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

  // ✅ sécurité: on n'autorise que les chemins internes
  if (!v.startsWith("/")) return null;
  if (v.startsWith("//")) return null;
  if (v.toLowerCase().startsWith("/http")) return null;

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
  const redirectParam = useMemo(
    () => safeRedirectPath(searchParams.get("redirect")),
    [searchParams]
  );

  // ✅ si déjà connecté, on redirige direct (utile quand on revient sur /login par erreur)
  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data.session) {
        if (redirectParam) {
          navigate(redirectParam, { replace: true });
        } else {
          navigate("/espace-client", { replace: true });
        }
      }
    });

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
            ? "Impossible de récupérer votre compte."
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

      const role = (profile?.role as string) || "user";

      // ✅ redirect explicite (ex: /login?redirect=/ouvrier/xxx)
      // IMPORTANT : on évite de rediriger un ouvrier vers /ouvrier/:id (fiche publique)
      // Mais ici, ton besoin est: client non connecté -> login -> revenir sur la fiche.
      // Donc on autorise le redirect (pour les clients), et si c'est un admin/worker, on ignore.
      if (redirectParam && role !== "admin" && role !== "worker" && role !== "ouvrier") {
        navigate(redirectParam, { replace: true });
        return;
      }

      // Sinon, on redirige selon le rôle
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "worker" || role === "ouvrier") {
        navigate("/espace-ouvrier", { replace: true });
      } else if (role === "user" || role === "client" || role === "particulier") {
        navigate("/espace-client", { replace: true });
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
              {language === "fr"
                ? "Connectez-vous pour continuer."
                : "Sign in to continue."}
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
                ? "Les administrateurs sont redirigés vers le back-office, les ouvriers vers leur espace personnel, et les autres utilisateurs vers leur espace client."
                : "Admins are redirected to the back-office, workers to their dashboard, and other users to their client space."}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
