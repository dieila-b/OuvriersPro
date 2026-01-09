import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PlanCode = "FREE" | "MONTHLY" | "YEARLY";

const Forfaits: React.FC = () => {
  const navigate = useNavigate();

  // ✅ Désactivation temporaire des plans payants
  const ENABLED_PLANS: Record<PlanCode, boolean> = {
    FREE: true,
    MONTHLY: false,
    YEARLY: false,
  };

  const go = (plan: PlanCode) => {
    if (!ENABLED_PLANS[plan]) return; // ✅ sécurité
    navigate(`/inscription-ouvrier?plan=${plan}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pro-gray">Choisissez votre forfait</h1>
          <p className="text-gray-600 mt-2">
            Sélectionnez un forfait pour accéder au formulaire d’inscription prestataire.
          </p>

          {/* ✅ Info temporaire */}
          <div className="mt-4 inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
            Forfaits Mensuel & Annuel temporairement indisponibles.
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* FREE */}
          <Card className="shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Gratuit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold">0 FG</div>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>1 métier affiché</li>
                <li>Profil simplifié</li>
                <li>Contacts limités</li>
              </ul>
              <Button className="w-full bg-pro-blue hover:bg-blue-700" onClick={() => go("FREE")}>
                Choisir ce forfait
              </Button>
            </CardContent>
          </Card>

          {/* MONTHLY (désactivé) */}
          <Card className="shadow-sm border-blue-200 opacity-60 grayscale">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between gap-2">
                <span>Mensuel</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                  Indisponible
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold">5 000 FG / mois</div>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>Profil complet</li>
                <li>Mise en avant dans la recherche</li>
                <li>Contacts illimités</li>
              </ul>

              <Button
                className="w-full bg-pro-blue hover:bg-blue-700"
                disabled
                onClick={() => go("MONTHLY")}
                title="Temporairement indisponible"
              >
                Bientôt disponible
              </Button>
            </CardContent>
          </Card>

          {/* YEARLY (désactivé) */}
          <Card className="shadow-sm opacity-60 grayscale">
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between gap-2">
                <span>Annuel</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                  Indisponible
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-2xl font-bold">50 000 FG / an</div>
              <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                <li>Meilleure valeur</li>
                <li>Profil complet + mise en avant</li>
                <li>Contacts illimités</li>
              </ul>

              <Button
                className="w-full bg-pro-blue hover:bg-blue-700"
                disabled
                onClick={() => go("YEARLY")}
                title="Temporairement indisponible"
              >
                Bientôt disponible
              </Button>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Forfaits;
