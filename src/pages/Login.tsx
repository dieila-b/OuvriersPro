// src/pages/Login.tsx
import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Login: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const location = useLocation() as { state?: { from?: string } };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword(
        {
          email: email.trim().toLowerCase(),
          password,
        }
      );

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

      // Récupérer le rôle dans op_users
      const { data: profile, error: profileError } = await supabase
        .from("op_users")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError || !profile) {
        throw new Error(
          language === "fr"
            ? "Aucun rôle associé à ce compte."
            : "No role associated to this account."
        );
      }

      const role = profile.role as "admin" | "worker";

      // Si on venait d’une route protégée, tu peux décider de respecter "from"
      // MAIS on suit ta demande : redirection automatique par rôle.
      if (role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (role === "worker") {
        navigate("/espace-ouvrier", { replace: true });
      } else {
        navigate("/", { replace: true });
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
                  language === "fr"
                    ? "Votre mot de passe"
                    : "Your password"
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

            <p className="mt-2 text-xs text-slate-500">
              {language === "fr"
                ? "Les administrateurs seront redirigés vers le back-office, les ouvriers vers leur espace personnel."
                : "Admins will be redirected to the back-office, workers to their personal dashboard."}
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
