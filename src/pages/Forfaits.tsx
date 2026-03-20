// src/pages/Forfaits.tsx
import React, { useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  BriefcaseBusiness,
  Sparkles,
  ShieldCheck,
  Users,
  Clock3,
} from "lucide-react";

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

  try {
    const wCap = (window as any)?.Capacitor;
    const { protocol, hostname } = window.location;
    if (wCap && protocol === "http:" && hostname === "localhost") return true;
  } catch {}

  return false;
}

function toHashPath(pathnameWithQuery: string) {
  const p = pathnameWithQuery.startsWith("/") ? pathnameWithQuery : `/${pathnameWithQuery}`;
  return `#${p}`;
}

const Forfaits: React.FC = () => {
  const navigate = useNavigate();
  const isNative = useMemo(() => isNativeRuntime(), []);

  const go = useCallback(
    (plan: PlanCode) => {
      const targetPath = `/inscription-ouvrier?plan=${encodeURIComponent(plan)}`;

      const scrollTop = () => {
        try {
          window.scrollTo({ top: 0, behavior: "auto" });
        } catch {}
      };

      if (isNative) {
        try {
          const desiredHash = toHashPath(targetPath);
          window.location.hash = desiredHash;

          requestAnimationFrame(() => {
            try {
              navigate(targetPath);
            } catch {}
          });

          window.setTimeout(() => {
            try {
              const nowHash = window.location.hash || "";
              if (!nowHash.includes("/inscription-ouvrier")) {
                window.location.hash = desiredHash;
              }
              scrollTop();
            } catch {}
          }, 450);

          scrollTop();
          return;
        } catch {}
      }

      navigate(targetPath);
      requestAnimationFrame(scrollTop);
    },
    [navigate, isNative]
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <main className="container mx-auto max-w-5xl px-4 py-10">
        <div className="mx-auto max-w-3xl text-center">
          <Badge className="mb-4 border border-blue-100 bg-blue-50 text-pro-blue">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Rejoignez ProxiServices
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight text-pro-gray sm:text-4xl">
            Développez votre activité avec plus de visibilité
          </h1>

          <p className="mt-3 text-base leading-relaxed text-gray-600 sm:text-lg">
            Créez votre profil professionnel, présentez votre métier et recevez
            vos premiers contacts avec ProxiServices.
          </p>
        </div>

        <Card className="mx-auto mt-10 max-w-2xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-pro-blue">
                <BriefcaseBusiness className="h-7 w-7" />
              </div>

              <h2 className="text-2xl font-bold text-pro-gray">
                Les forfaits détaillés arrivent bientôt
              </h2>

              <p className="mt-3 max-w-xl text-sm leading-relaxed text-gray-600 sm:text-base">
                Nous préparons une expérience plus complète avec différentes options
                de visibilité et d’accompagnement pour les prestataires. En attendant,
                vous pouvez déjà créer votre profil et rejoindre la plateforme.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-green-600" />
                <div className="font-semibold text-pro-gray">Profil professionnel</div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Présentez votre activité et inspirez confiance dès maintenant.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Users className="mb-3 h-5 w-5 text-pro-blue" />
                <div className="font-semibold text-pro-gray">Premiers contacts</div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Commencez à être visible et à recevoir vos premières demandes.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Clock3 className="mb-3 h-5 w-5 text-amber-600" />
                <div className="font-semibold text-pro-gray">Évolution continue</div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  De nouvelles options seront ajoutées progressivement.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-center">
              <div className="text-sm font-semibold text-pro-gray">
                Vous pouvez déjà commencer dès aujourd’hui
              </div>
              <p className="mt-1 text-sm text-gray-600">
                Créez votre profil prestataire en quelques minutes et rejoignez
                ProxiServices sans attendre l’ouverture des futures formules.
              </p>
            </div>

            <div className="mt-8 flex flex-col items-center gap-3">
              <Button
                type="button"
                className="h-12 w-full max-w-md rounded-xl bg-pro-blue text-white hover:bg-blue-700"
                style={{ touchAction: "manipulation" as any }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  go("FREE");
                }}
              >
                Créer mon profil gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-center text-xs text-gray-500">
                Les offres avancées seront activées prochainement.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mx-auto mt-8 max-w-2xl rounded-2xl border border-gray-200 bg-white px-5 py-4 text-center shadow-sm">
          <div className="font-semibold text-pro-gray">À venir sur ProxiServices</div>
          <div className="mt-1 text-sm text-gray-600">
            Plus de visibilité, davantage d’options de mise en avant et un
            accompagnement renforcé pour développer votre activité.
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Forfaits;
