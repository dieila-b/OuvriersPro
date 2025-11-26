// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type LocationState = {
  from?: string;
};

const Login: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation() as { state?: LocationState };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1) Auth Supabase
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (authError) {
        throw authError;
      }

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

      if (profileError) {
        throw profileError;
      }

      if (!profile) {
        // ➜ Création automatique d’un profil "user" simple
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

        if (insertError) {
          throw insertError;
        }
        profile = inserted;
      }

      const role = (profile?.role as string) || "user";

      // 3) Redirection selon le rôle
      const from = location.state?.from;

      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "worker") {
        // les vrais ouvriers validés
        navigate("/espace-ouvrier", { replace: true });
      } else {
        // role "user" ou autre ➜ simple compte utilisateur
        if (from) {
          navigate(from, { replace: true });
        } else {
          navigate("/", { replace: true });
        }
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 relative">
      {/* Bouton retour en haut à gauche */}
      <div className="absolute top-4 left-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{language === "fr" ? "Retour" : "Back"}</span>
        </Button>
      </div>

      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-slate-800">
            {language === "fr"
              ? "Connexion à votre espace"
              : "Sign in to your account"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Email
              </label>
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
                placeholder={
                  language === "fr" ? "Votre mot de passe" : "Your password"
                }
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
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

            {/* Lien "Créer un compte" */}
            <p className="mt-3 text-sm text-center text-slate-600">
              {language === "fr" ? (
                <>
                  Vous n&apos;avez pas encore de compte ?{" "}
                  <Link
                    to="/register"
                    className="text-pro-blue hover:underline font-medium"
                  >
                    Créer un compte
                  </Link>
                </>
              ) : (
                <>
                  Don&apos;t have an account yet?{" "}
                  <Link
                    to="/register"
                    className="text-pro-blue hover:underline font-medium"
                  >
                    Create an account
                  </Link>
                </>
              )}
            </p>

            <p className="mt-2 text-xs text-slate-500">
              {language === "fr"
                ? "Les administrateurs seront redirigés vers le back-office, les ouvriers vers leur espace personnel. Les autres utilisateurs restent sur le site public."
                : "Admins are redirected to the back-office, workers to their dashboard. Other users stay on the public site."}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
