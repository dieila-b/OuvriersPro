// src/pages/AccountPortal.tsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { User, HardHat } from "lucide-react";

const AccountPortal: React.FC = () => {
  const navigate = useNavigate();
  const { language } = useLanguage();

  const text = {
    title: language === "fr" ? "Mon compte" : "My account",
    subtitle:
      language === "fr"
        ? "Choisissez votre profil pour vous connecter ou créer un compte."
        : "Choose your profile to log in or create an account.",
    workerTitle:
      language === "fr" ? "Je suis un ouvrier / artisan" : "I am a worker",
    workerDesc:
      language === "fr"
        ? "Créez votre compte Ouvrier Pro, choisissez un forfait et recevez des demandes de clients."
        : "Create your pro worker account, choose a plan and receive customer requests.",
    workerLogin:
      language === "fr" ? "Se connecter (Ouvrier)" : "Log in as worker",
    workerRegister:
      language === "fr" ? "Créer mon compte Ouvrier Pro" : "Create worker account",
    workerPlansHint:
      language === "fr"
        ? "Vous serez redirigé directement vers le choix du forfait."
        : "You’ll be redirected directly to the plan selection.",
    customerTitle:
      language === "fr" ? "Je suis un particulier / client" : "I am a customer",
    customerDesc:
      language === "fr"
        ? "Créez un compte pour contacter les ouvriers, enregistrer vos demandes et suivre vos projets."
        : "Create an account to contact workers and track your requests.",
    customerLogin:
      language === "fr" ? "Se connecter (Particulier)" : "Log in as customer",
    customerRegister:
      language === "fr" ? "Créer un compte Particulier" : "Create customer account",
  };

  const currentPath = encodeURIComponent(window.location.pathname);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-10">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {text.title}
        </h1>
        <p className="text-sm text-slate-600 mb-8">{text.subtitle}</p>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bloc Ouvrier */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-pro-blue/10 flex items-center justify-center">
                  <HardHat className="w-5 h-5 text-pro-blue" />
                </div>
                <h2 className="text-lg font-semibold">{text.workerTitle}</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                {text.workerDesc}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  navigate(`/login?role=worker&redirect=${currentPath}`)
                }
              >
                {text.workerLogin}
              </Button>
              <Button
                className="w-full bg-pro-blue hover:bg-blue-700"
                onClick={() =>
                  // page de création + choix de forfait
                  navigate(`/inscription-ouvrier?step=plan`)
                }
              >
                {text.workerRegister}
              </Button>
              <p className="text-xs text-slate-500">
                {text.workerPlansHint}
              </p>
            </div>
          </Card>

          {/* Bloc Particulier */}
          <Card className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-900/5 flex items-center justify-center">
                  <User className="w-5 h-5 text-slate-800" />
                </div>
                <h2 className="text-lg font-semibold">{text.customerTitle}</h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                {text.customerDesc}
              </p>
            </div>

            <div className="space-y-2">
              <Button
                className="w-full"
                variant="outline"
                onClick={() =>
                  navigate(`/login?role=customer&redirect=${currentPath}`)
                }
              >
                {text.customerLogin}
              </Button>
              <Button
                className="w-full"
                onClick={() =>
                  navigate(`/register?role=customer&redirect=${currentPath}`)
                }
              >
                {text.customerRegister}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AccountPortal;
