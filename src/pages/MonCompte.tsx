// src/pages/MonCompte.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { User, HardHat, LogIn } from "lucide-react";

const MonCompte: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const text = {
    title: language === "fr" ? "Mon compte" : "My account",
    subtitle:
      language === "fr"
        ? "Connectez-vous ou créez un compte pour accéder aux détails des ouvriers et gérer vos demandes."
        : "Log in or create an account to access worker details and manage your requests.",
    sectionLogin: language === "fr" ? "Vous avez déjà un compte ?" : "Already have an account?",
    loginBtn: language === "fr" ? "Se connecter" : "Log in",
    or: language === "fr" ? "ou" : "or",
    createTitle:
      language === "fr" ? "Créer un nouveau compte" : "Create a new account",
    clientTitle:
      language === "fr" ? "Compte Particulier / Client" : "Customer account",
    clientDesc:
      language === "fr"
        ? "Pour les particuliers ou entreprises qui recherchent un ouvrier et souhaitent envoyer des demandes de travaux."
        : "For individuals or companies looking for workers and sending job requests.",
    clientBtn:
      language === "fr" ? "Créer un compte Particulier" : "Create customer account",
    workerTitle:
      language === "fr" ? "Compte Ouvrier Pro" : "Pro worker account",
    workerDesc:
      language === "fr"
        ? "Pour les ouvriers qui veulent s’inscrire sur la plateforme, choisir un forfait et recevoir des demandes de clients."
        : "For workers who want to register on the platform, choose a plan and receive customer requests.",
    workerBtn:
      language === "fr"
        ? "Créer mon compte Ouvrier Pro"
        : "Create my Pro worker account",
  };

  const handleLogin = () => {
    navigate("/login");
  };

  const handleCreateClient = () => {
    // Tu pourras gérer le type dans /register (ex: via query ?type=client)
    navigate("/register?type=client");
  };

  const handleCreateWorker = () => {
    // Redirection directe vers ton flux d’inscription ouvrier + forfaits
    navigate("/inscription-ouvrier");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">
          {text.title}
        </h1>
        <p className="text-sm text-slate-600 mb-8 max-w-2xl">
          {text.subtitle}
        </p>

        {/* Bloc connexion existant */}
        <Card className="p-6 mb-8">
          <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-pro-blue" />
            {text.sectionLogin}
          </h2>
          <p className="text-sm text-slate-600 mb-4">
            {language === "fr"
              ? "Que vous soyez Ouvrier ou Particulier, utilisez le même bouton pour vous connecter."
              : "Whether you are a worker or a customer, use the same button to log in."}
          </p>
          <Button
            className="bg-pro-blue hover:bg-pro-blue/90"
            onClick={handleLogin}
          >
            <LogIn className="w-4 h-4 mr-2" />
            {text.loginBtn}
          </Button>
        </Card>

        <div className="text-center text-xs text-slate-500 mb-6">
          — {text.or} —
        </div>

        {/* Création de compte : Particulier / Ouvrier */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">
            {text.createTitle}
          </h2>

          <div className="grid gap-6 md:grid-cols-2">
            {/* Compte client / particulier */}
            <div className="border border-slate-200 rounded-lg p-4 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-5 h-5 text-pro-blue" />
                <h3 className="font-semibold text-slate-900">
                  {text.clientTitle}
                </h3>
              </div>
              <p className="text-sm text-slate-600 mb-4 flex-1">
                {text.clientDesc}
              </p>
              <Button
                variant="outline"
                className="mt-auto"
                onClick={handleCreateClient}
              >
                {text.clientBtn}
              </Button>
            </div>

            {/* Compte ouvrier pro */}
            <div className="border border-slate-200 rounded-lg p-4 flex flex-col h-full">
              <div className="flex items-center gap-2 mb-2">
                <HardHat className="w-5 h-5 text-pro-blue" />
                <h3 className="font-semibold text-slate-900">
                  {text.workerTitle}
                </h3>
              </div>
              <p className="text-sm text-slate-600 mb-4 flex-1">
                {text.workerDesc}
              </p>
              <Button
                className="mt-auto bg-pro-blue hover:bg-pro-blue/90"
                onClick={handleCreateWorker}
              >
                {text.workerBtn}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default MonCompte;
