// src/pages/MonCompte.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  LogIn,
  UserPlus,
  CheckCircle2,
  HardHat,
  ArrowRight,
  User,
} from "lucide-react";

const MonCompte: React.FC = () => {
  const { language } = useLanguage();

  const text = {
    title: language === "fr" ? "Mon compte" : "My account",
    subtitle:
      language === "fr"
        ? "Connectez-vous ou créez un compte pour accéder aux profils des prestataires et gérer vos demandes."
        : "Log in or create an account to access provider profiles and manage your requests.",
    alreadyHaveAccount:
      language === "fr"
        ? "Vous avez déjà un compte ?"
        : "Already have an account?",
    loginHint:
      language === "fr"
        ? "Que vous soyez prestataire, particulier ou entreprise, utilisez le même bouton pour vous connecter."
        : "Whether you are a provider, individual or company, use the same button to log in.",
    loginBtn: language === "fr" ? "Se connecter" : "Log in",
    orLabel:
      language === "fr"
        ? "— ou créer un nouveau compte —"
        : "— or create a new account —",
    newAccountTitle:
      language === "fr" ? "Créer un nouveau compte" : "Create a new account",

    clientAccountTitle:
      language === "fr"
        ? "Compte client / prestataire"
        : "Client / provider account",
    clientAccountDesc:
      language === "fr"
        ? "Un seul compte pour tous : particuliers, entreprises et prestataires. Créez votre compte ProxiServices, puis choisissez votre usage : rechercher un service ou proposer vos prestations."
        : "One account for everyone: individuals, companies and providers. Create your ProxiServices account, then choose how you use the platform: find a service or offer your services.",
    createClientBtn:
      language === "fr"
        ? "Créer mon compte (client ou prestataire)"
        : "Create my account (client or provider)",

    workerInfoTitle:
      language === "fr" ? "Vous êtes prestataire ?" : "Are you a provider?",
    workerInfoText:
      language === "fr"
        ? "Commencez par créer le même compte que les clients. Depuis votre espace, vous pourrez ensuite activer votre profil prestataire, choisir votre forfait et gagner en visibilité auprès des clients."
        : "Start by creating the same account as clients. From your dashboard, you can then activate your provider profile, choose a plan and increase your visibility with clients.",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-10">
        {/* En-tête */}
        <header className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm border border-slate-100 mb-3">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {language === "fr"
              ? "Espace sécurisé ProxiServices"
              : "Secure ProxiServices space"}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mb-2">
            {text.title}
          </h1>
          <p className="text-sm md:text-base text-slate-600">{text.subtitle}</p>
        </header>

        {/* Bloc connexion existant */}
        <Card className="mb-8 p-6 md:p-7 border-slate-200 shadow-sm bg-white/90 rounded-2xl">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-9 w-9 rounded-full bg-pro-blue/10 flex items-center justify-center">
                  <LogIn className="w-4 h-4 text-pro-blue" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">
                  {text.alreadyHaveAccount}
                </h2>
              </div>
              <p className="text-sm text-slate-600">{text.loginHint}</p>
            </div>

            <Button
              asChild
              className="mt-2 md:mt-0 bg-pro-blue hover:bg-pro-blue/90 px-6 rounded-full shadow-md shadow-pro-blue/20 transition"
            >
              <Link to="/login" className="flex items-center gap-2">
                <LogIn className="w-4 h-4" />
                {text.loginBtn}
              </Link>
            </Button>
          </div>
        </Card>

        {/* séparateur */}
        <div className="my-6 flex items-center justify-center gap-4 text-xs uppercase tracking-wide text-slate-400">
          <span className="h-px flex-1 bg-slate-200" />
          {text.orLabel}
          <span className="h-px flex-1 bg-slate-200" />
        </div>

        {/* Bloc création de compte */}
        <Card className="p-6 md:p-7 border-slate-200 shadow-sm bg-white/90 rounded-2xl">
          <div className="flex items-center justify-between mb-5 gap-3">
            <div>
              <h2 className="text-xl md:text-2xl font-semibold text-slate-900 mb-1">
                {text.newAccountTitle}
              </h2>
              <p className="text-sm text-slate-600">
                {language === "fr"
                  ? "Choisissez comment vous allez utiliser la plateforme."
                  : "Choose how you will use the platform."}
              </p>
            </div>
            <div className="hidden md:inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-500 border border-slate-100">
              <span className="h-1.5 w-1.5 rounded-full bg-pro-blue" />
              {language === "fr"
                ? "Étape 1 : création du compte"
                : "Step 1: create your account"}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[2.1fr,1.4fr] items-start">
            {/* Carte compte Client / Prestataire */}
            <div className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-pro-blue/10 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-pro-blue" />
                </div>
                <div>
                  <h3 className="font-semibold text-slate-900 text-base md:text-lg">
                    {text.clientAccountTitle}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === "fr"
                      ? "Pour particuliers, entreprises et prestataires."
                      : "For clients, companies and providers."}
                  </p>
                </div>
              </div>

              <p className="text-sm text-slate-600 mb-5 leading-relaxed">
                {text.clientAccountDesc}
              </p>

              <div className="grid gap-3 sm:grid-cols-2 mb-6">
                {/* Colonne "Je cherche un service" */}
                <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 hover:border-pro-blue/40 hover:shadow-sm transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full bg-pro-blue/10 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-pro-blue" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase text-slate-600">
                      {language === "fr"
                        ? "Je cherche un service"
                        : "I’m looking for a service"}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-[2px] w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Recherche et contact direct des prestataires"
                          : "Search and contact providers directly"}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-[2px] w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Suivi de vos demandes"
                          : "Track your requests"}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-[2px] w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Historique de vos échanges"
                          : "History of your conversations"}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Colonne "Je suis prestataire" */}
                <div className="rounded-xl bg-white border border-slate-200/80 p-3.5 hover:border-amber-400/60 hover:shadow-sm transition">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="h-7 w-7 rounded-full bg-amber-50 flex items-center justify-center">
                      <HardHat className="w-3.5 h-3.5 text-amber-600" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase text-slate-600">
                      {language === "fr"
                        ? "Je suis prestataire"
                        : "I’m a provider"}
                    </span>
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-[2px] w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Un seul compte pour gérer vos demandes et votre profil"
                          : "One account to manage your requests and profile"}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-[2px] w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Activation de votre profil prestataire et choix du forfait"
                          : "Activate your provider profile and choose a plan"}
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-[2px] w-3.5 h-3.5 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Visibilité auprès des clients de votre zone"
                          : "Visibility with clients in your area"}
                      </span>
                    </li>
                  </ul>
                </div>
              </div>

              <Button
                asChild
                className="w-full bg-pro-blue hover:bg-pro-blue/95 rounded-full py-5 text-sm font-semibold shadow-md shadow-pro-blue/20 transition"
              >
                <Link
                  to="/register?type=client"
                  className="flex items-center justify-center gap-2"
                >
                  {text.createClientBtn}
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Info pour les prestataires */}
            <div className="rounded-2xl border border-dashed border-amber-200 bg-gradient-to-br from-amber-50 to-white p-5 md:p-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <HardHat className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-semibold text-slate-900 text-sm md:text-base">
                  {text.workerInfoTitle}
                </h3>
              </div>
              <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                {text.workerInfoText}
              </p>
              <ul className="space-y-1.5 text-xs text-slate-600">
                <li>
                  •{" "}
                  {language === "fr"
                    ? "Un seul compte pour tout gérer (demandes, profil, facturation...)"
                    : "One account to manage everything (requests, profile, billing, etc.)"}
                </li>
                <li>
                  •{" "}
                  {language === "fr"
                    ? "Choix du forfait (Gratuit, Mensuel, Annuel) une fois votre profil activé"
                    : "Choose a plan (Free, Monthly, Yearly) once your profile is activated"}
                </li>
                <li>
                  •{" "}
                  {language === "fr"
                    ? "Profil mis en avant auprès des clients de votre secteur"
                    : "Profile highlighted to clients in your area"}
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MonCompte;
