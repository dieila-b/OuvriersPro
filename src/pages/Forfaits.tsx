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

        {/* ✅ 1 seul forfait affiché */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* FREE */}
          <Card className="shadow-sm md:col-start-2">
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

          {/* MONTHLY (masqué) */}
          {SHOW_MONTHLY && (
           
