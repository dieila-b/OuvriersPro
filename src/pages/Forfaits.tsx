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
  Search,
  Star,
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

      <main className="container mx-auto max-w-6xl px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <Badge className="mb-4 border border-blue-100 bg-blue-50 text-pro-blue">
            <Sparkles className="mr-1.5 h-3.5 w-3.5" />
            Rejoignez ProxiServices
          </Badge>

          <h1 className="text-3xl font-bold tracking-tight text-pro-gray sm:text-5xl">
            Développez votre activité avec plus de visibilité
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-gray-600 sm:text-lg">
            Créez votre profil professionnel, inspirez confiance et recevez des
            demandes de clients grâce à une présence claire, moderne et visible
            sur ProxiServices.
          </p>
        </div>

        <Card className="mx-auto mt-10 max-w-3xl overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-blue-50 text-pro-blue">
                <BriefcaseBusiness className="h-8 w-8" />
              </div>

              <h2 className="text-2xl font-bold text-pro-gray sm:text-3xl">
                Faites rayonner votre métier
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600 sm:text-base">
                ProxiServices vous aide à présenter votre activité de manière
                professionnelle, à gagner en crédibilité et à être trouvé plus
                facilement par les clients qui recherchent vos services.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <ShieldCheck className="mb-3 h-5 w-5 text-green-600" />
                <div className="font-semibold text-pro-gray">Profil professionnel</div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Présentez clairement votre métier, vos services et votre expérience.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Search className="mb-3 h-5 w-5 text-pro-blue" />
                <div className="font-semibold text-pro-gray">Plus de visibilité</div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Aidez les clients à vous trouver plus facilement selon leur besoin.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Users className="mb-3 h-5 w-5 text-indigo-600" />
                <div className="font-semibold text-pro-gray">Plus d’opportunités</div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Recevez des demandes et développez votre portefeuille client.
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
                <Clock3 className="mb-3 h-5 w-5 text-amber-600" />
                <div className="font-semibold text-pro-gray">Mise en ligne rapide</div>
                <p className="mt-1 text-sm leading-relaxed text-gray-600">
                  Rejoignez la plateforme en quelques étapes simples et efficaces.
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50/70 p-5">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white text-pro-blue shadow-sm">
                  <Star className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold text-pro-gray">
                    Une présence qui inspire confiance
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-gray-600">
                    Votre profil devient une vitrine professionnelle pour mettre
                    en avant votre savoir-faire, rassurer vos futurs clients et
                    valoriser votre activité.
                  </p>
                </div>
              </div>
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
                Créer mon profil prestataire
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <p className="text-center text-sm text-gray-500">
                Commencez dès maintenant et donnez plus de visibilité à votre activité.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="font-semibold text-pro-gray">Soyez visible</div>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Positionnez votre activité là où les clients recherchent des prestataires.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="font-semibold text-pro-gray">Gagnez en crédibilité</div>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Présentez une image claire, structurée et rassurante de votre métier.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="font-semibold text-pro-gray">Développez votre activité</div>
            <p className="mt-2 text-sm leading-relaxed text-gray-600">
              Multipliez vos opportunités et créez une vraie présence professionnelle.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Forfaits;
