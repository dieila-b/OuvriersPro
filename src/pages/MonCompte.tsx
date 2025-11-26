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
        ? "Connectez-vous ou créez un compte pour accéder aux détails des ouvriers et gérer vos demandes."
        : "Log in or create an account to access worker details and manage your requests.",
    alreadyHaveAccount:
      language === "fr"
        ? "Vous avez déjà un compte ?"
        : "Already have an account?",
    loginHint:
      language === "fr"
        ? "Que vous soyez ouvrier, particulier ou entreprise, utilisez le même bouton pour vous connecter."
        : "Whether you are a worker, an individual or a company, use the same button to log in.",
    loginBtn: language === "fr" ? "Se connecter" : "Log in",
    orLabel:
      language === "fr"
        ? "— ou créer un nouveau compte —"
        : "— or create a new account —",
    newAccountTitle:
      language === "fr" ? "Créer un nouveau compte" : "Create a new account",

    // Carte compte principal
    clientAccountTitle:
      language === "fr"
        ? "Compte client / ouvrier"
        : "Client / worker account",
    clientAccountDesc:
      language === "fr"
        ? "Un seul compte pour tous : particuliers, entreprises et ouvriers. Créez votre compte OuvriersPro, puis choisissez comment vous utilisez la plateforme : pour chercher un ouvrier ou pour proposer vos services."
        : "A single account for everyone: individuals, companies and workers. Create your OuvriersPro account, then choose how you use the platform: to find a worker or to offer your services.",
    createClientBtn:
      language === "fr"
        ? "Créer mon compte (particulier ou ouvrier)"
        : "Create my account (client or worker)",

    // Bloc info ouvrier
    workerInfoTitle:
      language === "fr" ? "Vous êtes ouvrier / artisan ?" : "Are you a worker?",
    workerInfoText:
      language === "fr"
        ? "Commencez par créer le même compte que les clients. Depuis votre espace, vous pourrez ensuite activer votre profil Ouvrier Pro, choisir votre forfait et être mis en avant auprès des clients."
        : "Start by creating the same account as clients. From your dashboard, you’ll then be able to activate your Pro worker profile, choose a plan and be highlighted to potential clients.",
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Titre */}
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            {text.title}
          </h1>
          <p className="text-sm text-slate-600">{text.subtitle}</p>
        </header>

        {/* Bloc connexion existant */}
        <Card className="mb-8 p-6 border-slate-200 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <LogIn className="w-5 h-5 text-pro-blue" />
                <h2 className="text-lg font-semibold text-slate-900">
                  {text.alreadyHaveAccount}
                </h2>
              </div>
              <p className="text-sm text-slate-600">{text.loginHint}</p>
            </div>

            <Button asChild className="mt-2 md:mt-0 bg-pro-blue hover:bg-pro-blue/90">
              <Link to="/login">
                <LogIn className="w-4 h-4 mr-2" />
                {text.loginBtn}
              </Link>
            </Button>
          </div>
        </Card>

        {/* séparateur */}
        <div className="my-6 flex items-center justify-center">
          <span className="text-xs uppercase tracking-wide text-slate-400">
            {text.orLabel}
          </span>
        </div>

        {/* Bloc création de compte */}
        <Card className="p-6 border-slate-200 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">
            {text.newAccountTitle}
          </h2>

          <div className="grid gap-6 lg:grid-cols-[2fr,1.5fr] items-start">
            {/* Carte compte Client / Ouvrier */}
            <div className="rounded-lg border border-slate-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-full bg-pro-blue/10 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-pro-blue" />
                </div>
                <h3 className="font-semibold text-slate-900">
                  {text.clientAccountTitle}
                </h3>
              </div>

              <p className="text-sm text-slate-600 mb-4">
                {text.clientAccountDesc}
              </p>

              <div className="grid gap-3 sm:grid-cols-2 mb-5">
                {/* Colonne "Je cherche un ouvrier" */}
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-4 h-4 text-pro-blue" />
                    <span className="text-xs font-semibold uppercase text-slate-600">
                      {language === "fr"
                        ? "Je cherche un ouvrier"
                        : "I’m looking for a worker"}
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Recherche et contact direct des ouvriers"
                          : "Search and contact workers directly"}
                      </span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Suivi de vos demandes de travaux"
                          : "Track your work requests"}
                      </span>
                    </li>
                  </ul>
                </div>

                {/* Colonne "Je suis ouvrier" */}
                <div className="rounded-md bg-slate-50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <HardHat className="w-4 h-4 text-amber-600" />
                    <span className="text-xs font-semibold uppercase text-slate-600">
                      {language === "fr"
                        ? "Je suis ouvrier / artisan"
                        : "I’m a worker / craftsman"}
                    </span>
                  </div>
                  <ul className="space-y-1 text-xs text-slate-700">
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Un seul compte pour gérer vos demandes et votre profil"
                          : "One account to manage your requests and profile"}
                      </span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      <span>
                        {language === "fr"
                          ? "Activation ensuite de votre profil Ouvrier Pro et choix du forfait"
                          : "Later activate your Pro worker profile and choose a plan"}
                      </span>
                    </li>
                    <li className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" />
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
                className="w-full bg-pro-blue hover:bg-pro-blue/90"
              >
                <Link to="/register?type=client">
                  {text.createClientBtn}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </div>

            {/* Info pour les ouvriers */}
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center">
                  <HardHat className="w-4 h-4 text-amber-600" />
                </div>
                <h3 className="font-semibold text-slate-900">
                  {text.workerInfoTitle}
                </h3>
              </div>
              <p className="text-sm text-slate-600 mb-3">
                {text.workerInfoText}
              </p>
              <ul className="space-y-1 text-xs text-slate-500">
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
