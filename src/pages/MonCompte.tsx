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
        ? "Que vous soyez Ouvrier ou Particulier, utilisez le même bouton pour vous connecter."
        : "Whether you are a worker or a customer, use the same button to log in.",
    loginBtn: language === "fr" ? "Se connecter" : "Log in",
    orLabel: language === "fr" ? "— ou créer un nouveau compte —" : "— or create a new account —",
    newAccountTitle:
      language === "fr" ? "Créer un nouveau compte" : "Create a new account",
    clientAccountTitle:
      language === "fr"
        ? "Compte Particulier / Client"
        : "Customer account",
    clientAccountDesc:
      language === "fr"
        ? "Pour les particuliers ou entreprises qui recherchent un ouvrier et souhaitent envoyer des demandes de travaux."
        : "For individuals or companies looking for workers and wishing to send work requests.",
    createClientBtn:
      language === "fr"
        ? "Créer un compte Particulier"
        : "Create customer account",
    workerInfoTitle:
      language === "fr"
        ? "Vous êtes ouvrier ?"
        : "Are you a worker?",
    workerInfoText:
      language === "fr"
        ? "Créez d’abord votre compte client. Depuis votre espace, vous pourrez ensuite activer votre profil Ouvrier Pro et choisir votre forfait."
        : "First create your customer account. From your dashboard, you’ll then be able to activate your Pro worker profile and choose a plan.",
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
            {/* Carte compte client */}
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

              <ul className="space-y-2 text-sm text-slate-700 mb-5">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Recherche et contact direct des ouvriers</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Suivi de vos demandes de travaux</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Accès futur au profil Ouvrier Pro si vous êtes artisan</span>
                </li>
              </ul>

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

            {/* Info pour les ouvriers (sans deuxième carte) */}
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
                <li>• Un seul compte pour tout gérer</li>
                <li>• Vous pourrez choisir votre forfait (Gratuit, Mensuel, Annuel)</li>
                <li>• Votre profil sera mis en avant auprès des clients</li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MonCompte;
