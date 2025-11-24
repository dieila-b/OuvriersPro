// src/pages/Home.tsx
import React from "react";
import NavBar from "@/components/NavBar";
import { ShieldCheck, MapPin, MessageCircle, Users, Star, Clock, BadgeCheck } from "lucide-react";

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <NavBar />

      <main className="flex-1">
        {/* HERO full width */}
        <section className="relative w-full bg-[#1765ff] text-white">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-24 text-center">
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
              Trouvez le bon ouvrier pour vos
              <br className="hidden sm:block" />
              travaux
            </h1>

            <p className="mt-3 sm:mt-5 text-sm sm:text-lg text-blue-100 max-w-2xl mx-auto">
              Connectez-vous avec des professionnels qualifiés près de chez vous
            </p>

            {/* BARRE DE RECHERCHE RESPONSIVE */}
            <div className="mt-8 sm:mt-10 max-w-3xl mx-auto">
              <div className="bg-white rounded-2xl shadow-lg p-2 sm:p-3">
                <form
                  className="
                    flex flex-col gap-2
                    sm:flex-row sm:items-center sm:gap-3
                  "
                >
                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 flex-1">
                    <svg
                      className="h-4 w-4 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                      className="w-full text-slate-900 placeholder-slate-400 outline-none text-sm sm:text-base"
                      placeholder="Rechercher un métier ou service"
                    />
                  </div>

                  <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 flex-1">
                    <svg
                      className="h-4 w-4 text-slate-400"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                    >
                      <path d="M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 1 1 18 0Z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                    <input
                      className="w-full text-slate-900 placeholder-slate-400 outline-none text-sm sm:text-base"
                      placeholder="Votre ville ou code postal"
                    />
                  </div>

                  <button
                    type="submit"
                    className="
                      rounded-xl bg-[#1765ff] text-white font-semibold
                      px-5 py-2.5 text-sm sm:text-base
                      hover:bg-blue-700 transition
                      w-full sm:w-auto
                    "
                  >
                    Rechercher
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>

        {/* POURQUOI */}
        <section className="w-full">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-10 sm:py-14 lg:py-16">
            <h2 className="text-center text-xl sm:text-2xl lg:text-3xl font-bold text-slate-900">
              Pourquoi choisir OuvriersPro ?
            </h2>

            {/* Cartes responsive */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              <FeatureCard
                icon={<ShieldCheck className="h-6 w-6 text-green-600" />}
                title="Professionnels vérifiés"
                desc="Tous nos ouvriers sont contrôlés et certifiés"
              />
              <FeatureCard
                icon={<MapPin className="h-6 w-6 text-blue-600" />}
                title="Proximité garantie"
                desc="Trouvez des professionnels dans votre région"
              />
              <FeatureCard
                icon={<MessageCircle className="h-6 w-6 text-purple-600" />}
                title="Contact direct"
                desc="Échangez directement avec les artisans"
              />
            </div>

            {/* Stats responsive */}
            <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <Stat icon={<Users className="h-6 w-6 mx-auto text-blue-600" />} value="2,500+" label="Professionnels" />
              <Stat icon={<Star className="h-6 w-6 mx-auto text-amber-500" />} value="4.8/5" label="Note moyenne" />
              <Stat icon={<Clock className="h-6 w-6 mx-auto text-indigo-600" />} value="24h" label="Réponse rapide" />
              <Stat icon={<BadgeCheck className="h-6 w-6 mx-auto text-emerald-600" />} value="100%" label="Vérifiés" />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center">
      <div className="mx-auto w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center">
        {icon}
      </div>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-2 text-sm text-slate-600">{desc}</p>
    </div>
  );
}

function Stat({
  icon,
  value,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 sm:p-5">
      {icon}
      <div className="mt-2 text-lg sm:text-xl font-bold text-slate-900">{value}</div>
      <div className="text-xs sm:text-sm text-slate-600">{label}</div>
    </div>
  );
}

export default Home;
