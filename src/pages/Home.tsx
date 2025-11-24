// src/pages/Home.tsx
import React from "react";
import NavBar from "@/components/NavBar"; // si tu as un composant de navbar

const Home: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <NavBar />

      {/* Hero */}
      <main className="flex-1">
        <section className="relative overflow-hidden bg-[#1765ff] text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-24 text-center">
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight">
              Trouvez le bon ouvrier pour vos travaux
            </h1>
            <p className="mt-4 text-base sm:text-lg text-blue-100 max-w-2xl mx-auto">
              Connectez-vous avec des professionnels qualifiés près de chez vous.
            </p>

            {/* Barre de recherche responsive */}
            <div className="mt-8 bg-white rounded-2xl shadow-xl p-3 sm:p-4 flex flex-col sm:flex-row gap-3 items-stretch">
              <div className="flex-1 relative">
                <input
                  placeholder="Rechercher un métier ou service"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1 relative">
                <input
                  placeholder="Votre ville ou code postal"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button className="w-full sm:w-auto rounded-xl bg-[#ff7a1a] text-white font-semibold px-5 py-2.5 text-sm shadow hover:bg-[#ff6a00] transition">
                Rechercher
              </button>
            </div>
          </div>
        </section>

        {/* Section “Pourquoi choisir OuvriersPro ?” etc. */}
        {/* … tes autres sections ici … */}
      </main>
    </div>
  );
};

export default Home;
