// src/pages/Register.tsx
import React, { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ArrowLeft, Loader2, User, HardHat, Mail, Phone, Lock } from "lucide-react";

type AccountType = "client" | "worker";

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  profession: string;
};

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const [searchParams] = useSearchParams();

  const [accountType, setAccountType] = useState<AccountType>("client");

  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    profession: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const text = {
    title: language === "fr" ? "Créer un compte" : "Create an account",
    back: language === "fr" ? "Retour" : "Back",
    subtitleClient:
      language === "fr"
        ? "Compte pour les particuliers ou entreprises qui recherchent des ouvriers."
        : "Account for individuals or companies looking for workers.",
    subtitleWorker:
      language === "fr"
        ? "Compte pour les ouvriers qui souhaitent être visibles, choisir un forfait et recevoir des demandes."
        : "Account for workers who want to be visible, choose a plan and receive requests.",
    tabClient: language === "fr" ? "Particulier / Client" : "Customer",
    tabWorker: language === "fr" ? "Ouvrier Pro" : "Pro worker",
    fullName: language === "fr" ? "Nom complet" : "Full name",
    email: language === "fr" ? "Email" : "Email",
    phone: language === "fr" ? "Téléphone" : "Phone",
    password: language === "fr" ? "Mot de passe" : "Password",
    confirmPassword: language === "fr" ? "Confirmer le mot de passe" : "Confirm password",
    professionLabel: language === "fr" ? "Métier principal (facultatif)" : "Main profession (optional)",
    alreadyAccount: language === "fr" ? "Vous avez déjà un compte ?" : "Already have an account?",
    login: language === "fr" ? "Se connecter" : "Log in",
    submitClient: language === "fr" ? "Créer mon compte client" : "Create customer account",
    submitWorker: language === "fr" ? "Créer mon compte Ouvrier Pro" : "Create my Pro worker account",
    pwdTooShort:
      language === "fr"
        ? "Le mot de passe doit contenir au moins 6 caractères."
        : "Password must be at least 6 characters long.",
    pwdMismatch: language === "fr" ? "Les mots de passe ne correspondent pas." : "Passwords do not match.",
    genericError:
      language === "fr"
        ? "Une erreur est survenue lors de la création du compte."
        : "An error occurred while creating your account.",
  };

  // Détecter ?type=client / worker
  useEffect(() => {
    const typeParam = (searchParams.get("type") || "").toLowerCase();
    if (typeParam === "worker" || typeParam === "ouvrier") setAccountType("worker");
    else if (typeParam === "client") setAccountType("client");
  }, [searchParams]);

  // Si déjà connecté, on sort d’ici (évite boucle mon-compte/login/register)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      if (data.session?.user) {
        navigate("/espace-client", { replace: true });
      }
    })();
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (form.password.length < 6) {
      setErrorMsg(text.pwdTooShort);
      return;
    }
    if (form.password !== form.confirmPassword) {
      setErrorMsg(text.pwdMismatch);
      return;
    }

    setSubmitting(true);

    try {
      const normalizedEmail = form.email.trim().toLowerCase();

      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: form.password,
        options: {
          data: {
            full_name: form.fullName || null,
            phone: form.phone || null,
            role: accountType === "worker" ? "worker" : "user",
            profession: accountType === "worker" ? form.profession || null : null,
          },
        },
      });

      if (error) {
        console.error("register error:", error);
        setErrorMsg(error.message || text.genericError);
        return;
      }

      // ✅ Important: si email confirmation activée, session peut être null
      // Dans tous les cas : on redirige vers la prochaine étape logique, sans "#anchor".
      if (accountType === "worker") {
        // Forfaits = choix plan (stable, web + mobile)
        navigate("/forfaits", { replace: true });
      } else {
        // Client : page compte (qui enverra vers espace-client après login)
        navigate("/login", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setErrorMsg(text.genericError);
    } finally {
      setSubmitting(false);
    }
  };

  const isWorker = accountType === "worker";

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg mx-auto px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-slate-600"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>{text.back}</span>
          </Button>
        </div>

        <Card className="p-6 shadow-sm">
          <h1 className="text-2xl font-bold mb-2">{text.title}</h1>
          <p className="text-sm text-slate-600 mb-4">
            {isWorker ? text.subtitleWorker : text.subtitleClient}
          </p>

          {/* Tabs client / worker */}
          <Tabs
            value={accountType}
            onValueChange={(v) => {
              const value = v as AccountType;
              setAccountType(value);
              // ✅ On NE NAVIGUE PLUS ICI (sinon HashRouter => #/#/ bugs)
            }}
            className="mb-4"
          >
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="client" className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {text.tabClient}
              </TabsTrigger>
              <TabsTrigger value="worker" className="flex items-center gap-1">
                <HardHat className="w-4 h-4" />
                {text.tabWorker}
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {errorMsg && (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div>
              <Label htmlFor="fullName" className="mb-1 block">
                {text.fullName}
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label htmlFor="email" className="mb-1 block">
                {text.email}
              </Label>
              <div className="relative">
                <span className="absolute left-2 top-2.5 text-slate-400">
                  <Mail className="w-4 h-4" />
                </span>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  className="pl-8"
                  value={form.email}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone" className="mb-1 block">
                {text.phone}
              </Label>
              <div className="relative">
                <span className="absolute left-2 top-2.5 text-slate-400">
                  <Phone className="w-4 h-4" />
                </span>
                <Input
                  id="phone"
                  name="phone"
                  className="pl-8"
                  value={form.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {isWorker && (
              <div>
                <Label htmlFor="profession" className="mb-1 block">
                  {text.professionLabel}
                </Label>
                <Input
                  id="profession"
                  name="profession"
                  value={form.profession}
                  onChange={handleChange}
                  placeholder={
                    language === "fr"
                      ? "Ex : Plombier, Électricien..."
                      : "Ex: Plumber, Electrician..."
                  }
                />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="password" className="mb-1 block">
                  {text.password}
                </Label>
                <div className="relative">
                  <span className="absolute left-2 top-2.5 text-slate-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    className="pl-8"
                    value={form.password}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="confirmPassword" className="mb-1 block">
                  {text.confirmPassword}
                </Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-pro-blue hover:bg-pro-blue/90"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ...
                </>
              ) : isWorker ? (
                text.submitWorker
              ) : (
                text.submitClient
              )}
            </Button>
          </form>

          <p className="mt-4 text-xs text-slate-500 text-center">
            {text.alreadyAccount}{" "}
            <Link to="/login" className="font-medium text-pro-blue hover:underline">
              {text.login}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
};

export default Register;
