// src/pages/Register.tsx
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Register: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"particulier" | "ouvrier">("particulier");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const text = {
    title:
      language === "fr"
        ? "Créer un compte"
        : "Create an account",
    subtitle:
      language === "fr"
        ? "Créez votre compte pour pouvoir contacter les ouvriers."
        : "Create your account to contact workers.",
    name: language === "fr" ? "Nom complet" : "Full name",
    email: language === "fr" ? "Adresse e-mail" : "Email address",
    password: language === "fr" ? "Mot de passe" : "Password",
    roleLabel:
      language === "fr"
        ? "Vous êtes"
        : "You are",
    roleParticulier:
      language === "fr" ? "Particulier / Client" : "Individual / Client",
    roleOuvrier: language === "fr" ? "Ouvrier" : "Worker",
    submit:
      language === "fr" ? "Créer mon compte" : "Create my account",
    submitting:
      language === "fr" ? "Création en cours..." : "Creating...",
    alreadyAccount:
      language === "fr"
        ? "Vous avez déjà un compte ?"
        : "Already have an account?",
    login: language === "fr" ? "Se connecter" : "Log in",
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role, // "particulier" ou "ouvrier"
        },
      },
    });

    if (error) {
      console.error(error);
      setErrorMsg(
        language === "fr"
          ? "Impossible de créer votre compte. Vérifiez vos informations."
          : "Unable to create your account. Please check your information."
      );
      setLoading(false);
      return;
    }

    // Redirection vers la page de connexion (ou directement sur /)
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-xl border border-slate-200 shadow-sm p-6">
        <h1 className="text-xl font-semibold text-slate-900 mb-1">
          {text.title}
        </h1>
        <p className="text-xs text-slate-500 mb-4">
          {text.subtitle}
        </p>

        {errorMsg && (
          <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {text.name}
            </label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {text.email}
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {text.password}
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              {text.roleLabel}
            </label>
            <select
              value={role}
              onChange={(e) =>
                setRole(e.target.value as "particulier" | "ouvrier")
              }
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
            >
              <option value="particulier">{text.roleParticulier}</option>
              <option value="ouvrier">{text.roleOuvrier}</option>
            </select>
          </div>

          <Button
            type="submit"
            className="w-full bg-pro-blue hover:bg-blue-700 mt-2"
            disabled={loading}
          >
            {loading ? text.submitting : text.submit}
          </Button>
        </form>

        <p className="mt-4 text-xs text-center text-slate-500">
          {text.alreadyAccount}{" "}
          <Link
            to="/login"
            className="text-pro-blue hover:underline font-medium"
          >
            {text.login}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
