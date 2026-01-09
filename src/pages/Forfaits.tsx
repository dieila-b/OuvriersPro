import React from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type PlanCode = "FREE" | "MONTHLY" | "YEARLY";

const Forfaits: React.FC = () => {
  const navigate = useNavigate();

  const go = (plan: PlanCode) => {
    navigate(`/inscription-ouvrier?plan=${plan}`);
  };

  // ✅ Masquage temporaire des forfaits payants
  const SHOW_MONTHLY = false;
  const SHOW_YEARLY = false;

  // ✅ Si on masque les 2, on centre la carte FREE
  const onlyFree = !SHOW_MONTHLY && !SHOW_YEARLY;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto px-4 py-10 max-w-5xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-pro-gray">Choisissez votre forfait</h1>
          <p className="text-gray-600 mt-2">
            Sélectionnez un forfait pour accéder au formulaire d’inscription prestataire.
          </p>
        </div>

        <div className={`grid gap-6 ${onlyFree ? "md:grid-cols-1" : "md:grid-cols-3"}`}>
          {/* FREE */}
          <Card className={`shadow-sm ${onlyFree ? "max-w-md mx-auto w-full" : ""}`}>
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

          {/* MONTHLY (masqué temporairement) */}
          {SHOW_MONTHLY && (
            <Card className="shadow-sm border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Mensuel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-bold">5 000 FG / mois</div>
                <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                  <li>Profil complet</li>
                  <li>Mise en avant dans la recherche</li>
                  <li>Contacts illimités</li>
                </ul>
                <Button className="w-full bg-pro-blue hover:bg-blue-700" onClick={() => go("MONTHLY")}>
                  Choisir ce forfait
                </Button>
              </CardContent>
            </Card>
          )}

          {/* YEARLY (masqué temporairement) */}
          {SHOW_YEARLY && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Annuel</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-2xl font-bold">50 000 FG / an</div>
                <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
                  <li>Meilleure valeur</li>
                  <li>Profil complet + mise en avant</li>
                  <li>Contacts illimités</li>
                </ul>
                <Button className="w-full bg-pro-blue hover:bg-blue-700" onClick={() => go("YEARLY")}>
                  Choisir ce forfait
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Forfaits;
