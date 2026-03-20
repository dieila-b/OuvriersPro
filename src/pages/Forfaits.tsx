// src/pages/Forfaits.tsx
import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, CheckCircle2, Clock, ShieldCheck } from "lucide-react";

type PlanCode = "FREE" | "MONTHLY" | "YEARLY";

function isNativeRuntime(): boolean {
  try {
    const wCap = (window as any)?.Capacitor;
    if (wCap?.isNativePlatform?.()) return true;
  } catch {}

  try {
    const p = window.location?.protocol ?? "";
    if (p === "capacitor:" || p === "file:") return true;
  } catch {}

  // cas Android Capacitor local server
  try {
    const wCap = (window as any)?.Capacitor;
    const { protocol, hostname } = window.location;
    if (wCap && protocol === "http:" && hostname === "localhost") return true;
  } catch {}

  return false;
}

/**
 * HashRouter-friendly path builder
 * HashRouter attend "#/route?x=1"
 */
function toHashPath(pathnameWithQuery: string) {
  const p = pathnameWithQuery.startsWith("/") ? pathnameWithQuery : `/${pathnameWithQuery}`;
  return `#${p}`;
}

const Forfaits: React.FC = () => {
  const navigate = useNavigate();
  const isNative = useMemo(() => isNativeRuntime(), []);

  /**
   * ✅ Navigation ultra fiable sur Android WebView:
   * - En natif: on force d'abord window.location.hash (HashRouter)
   * - Fallback: navigate()
   * - Self-heal: si détourné, on refait un hash force
   */
  const go = useCallback(
    (plan: PlanCode) => {
      const targetPath = `/inscription-ouvrier?plan=${encodeURIComponent(plan)}`;

      // Scroll top (best effort)
      const scrollTop = () => {
        try {
          window.scrollTo({ top: 0, behavior: "auto" });
        } catch {}
      };

      // 1) NATIF: hash-first (plus stable que navigate dans certains WebView)
      if (isNative) {
        try {
          const desiredHash = toHashPath(targetPath);

          // Set hash directly => HashRouter route immédiatement
          window.location.hash = desiredHash;

          // fallback navigate (au cas où)
          requestAnimationFrame(() => {
            try {
              navigate(targetPath);
            } catch {}
          });

          // self-heal si un autre click détourne la nav
          window.setTimeout(() => {
            try {
              const nowHash = window.location.hash || "";
              // on attend "#/inscription-ouvrier?plan=..."
              if (!nowHash.includes("/inscription-ouvrier")) {
                window.location.hash = desiredHash;
              }
              scrollTop();
            } catch {}
          }, 450);

          scrollTop();
          return;
        } catch {
          // si hash fail => on tombe sur navigate
        }
      }

      // 2) WEB/DESKTOP: navigate normal
      navigate(targetPath);
      requestAnimationFrame(scrollTop);
    },
    [navigate, isNative]
  );

  /**
   * ✅ Masquage provisoire des forfaits payants sur le site
   */
  const SHOW_MONTHLY = false;
  const SHOW_YEARLY = false;
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
          {/* ✅ FREE */}
          <Card
            className={[
              "shadow-lg border border-gray-200 overflow-hidden",
              onlyFree ? "max-w-2xl mx-auto w-full" : "",
            ].join(" ")}
          >
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-pro-gray">Gratuit</CardTitle>
                  <p className="mt-2 text-sm text-gray-600">
                    Pour créer votre profil et apparaître dans les recherches.
                  </p>
                </div>
                <Badge className="bg-blue-50 text-pro-blue border border-blue-100">
                  Idéal pour démarrer
                </Badge>
              </div>

              <div className="mt-4 flex items-end justify-between">
                <div className="flex items-end gap-2">
                  <span className="text-5xl font-extrabold text-pro-blue">0</span>
                  <span className="text-xl font-semibold text-pro-blue">FG</span>
                </div>
                <span className="text-gray-600 text-sm">/mois</span>
              </div>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Bénéfices */}
              <div className="space-y-4">
                <div className="flex gap-3">
                  <ShieldCheck className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-pro-gray">Votre profil en ligne</div>
                    <div className="text-sm text-gray-600">
                      Présentez votre métier, votre zone et vos infos de contact.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-pro-gray">Apparition dans les recherches</div>
                    <div className="text-sm text-gray-600">
                      Les clients vous trouvent par métier et quartier.
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Clock className="w-5 h-5 text-green-600 mt-0.5" />
                  <div className="min-w-0">
                    <div className="font-semibold text-pro-gray">Mise en route rapide</div>
                    <div className="text-sm text-gray-600">
                      Profil simplifié pour démarrer en quelques minutes.
                    </div>
                  </div>
                </div>
              </div>

              {/* Inclus */}
              <div className="rounded-xl border border-gray-200 bg-white p-4">
                <div className="font-semibold text-pro-gray mb-3">Inclus dans Gratuit</div>
                <ul className="text-sm text-gray-700 space-y-2">
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-2 h-2 rounded-full bg-pro-blue shrink-0" />
                    <span>1 métier affiché</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-2 h-2 rounded-full bg-pro-blue shrink-0" />
                    <span>Profil simplifié</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-2 h-2 rounded-full bg-pro-blue shrink-0" />
                    <span>Contacts limités (pour tester)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="mt-2 w-2 h-2 rounded-full bg-pro-blue shrink-0" />
                    <span>Pas de mise en avant (bientôt)</span>
                  </li>
                </ul>
              </div>

              {/* ✅ CTA ultra stable */}
              <Button
                type="button"
                className="w-full h-12 rounded-xl bg-gray-900 hover:bg-gray-950 text-white flex items-center justify-center gap-2"
                style={{ touchAction: "manipulation" as any }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  go("FREE");
                }}
              >
                Créer mon profil gratuitement <ArrowRight className="w-4 h-4" />
              </Button>

              <p className="text-xs text-gray-500 text-center">
                Aucun paiement requis. Vous pourrez passer à une formule supérieure dès qu’elle sera disponible.
              </p>
            </CardContent>
          </Card>

          {/* ⛔ Mensuel */}
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
                <Button
                  type="button"
                  className="w-full bg-pro-blue hover:bg-blue-700"
                  style={{ touchAction: "manipulation" as any }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    go("MONTHLY");
                  }}
                >
                  Choisir ce plan
                </Button>
              </CardContent>
            </Card>
          )}

          {/* ⛔ Annuel */}
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
                <Button
                  type="button"
                  className="w-full bg-pro-blue hover:bg-blue-700"
                  style={{ touchAction: "manipulation" as any }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    go("YEARLY");
                  }}
                >
                  Choisir ce plan
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {onlyFree && (
          <div className="mt-8 flex justify-center">
            <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white shadow-sm px-4 sm:px-6 py-4 text-center">
              <div className="font-semibold text-pro-gray">Bientôt : formules Pro</div>
              <div className="text-sm text-gray-600 mt-1">
                Mise en avant, plusieurs métiers, contacts illimités, badge vérifié… (en préparation).
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Forfaits;
