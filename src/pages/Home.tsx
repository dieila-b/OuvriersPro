// src/pages/Home.tsx
import { useState } from "react";
import { Link } from "react-router-dom";
import { Search, MapPin, Menu, X } from "lucide-react";

const Home: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // ⚠️ Remplace par ta vraie logique de recherche
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: appeler ta fonction de recherche actuelle
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#1155ff] via-[#0d47d5] to-[#0b3bb0] text-white">
      {/* ======================================
         NAVBAR
      ======================================= */}
      <header className="sticky top-0 z-40 bg-[#0f4be0]/90 backdrop-blur border-b border-white/10">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-2xl bg-white text-[#1155ff] flex items-center justify-center text-sm font-bold shadow-md">
              OP
            </div>
            <span className="font-semibold text-base sm:text-lg tracking-tight">
              OuvriersPro
            </span>
          </Link>

          {/* Menu desktop */}
          <nav className="hidden md:flex items-center gap-6 text-sm">
            <Link
              to="/rechercher"
              className="hover:text-blue-100 transition-colors"
            >
              Rechercher
            </Link>
            <Link to="/faq" className="hover:text-blue-100 transition-colors">
              FAQ
            </Link>
            <Link
              to="/contact"
              className="hover:text-blue-100 transition-colors"
            >
              Contact
            </Link>

            <Link
              to="/devenir-ouvrier"
              className="inline-flex items-center rounded-full bg-white text-[#1155ff] px-4 py-1.5 text-xs sm:text-sm font-semibold shadow-[0_14px_30px_rgba(15,23,42,0.35)] hover:bg-blue-50 transition-colors"
            >
              Devenir Ouvrier Pro
            </Link>

            {/* Sélecteur langue (simple) */}
            <button className="ml-1 inline-flex items-center rounded-full border border-white/30 px-3 py-1 text-xs hover:bg-white/10">
              FR
            </button>
          </nav>

          {/* Bouton mobile */}
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center rounded-lg border border-white/25 p-1.5"
            onClick={() => setMobileOpen((o) => !o)}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>

        {/* Menu mobile */}
        {mobileOpen && (
          <div className="md:hidden border-t border-white/10 bg-[#0f4be0]/95 backdrop-blur">
            <div className="mx-auto max-w-6xl px-4 py-3 space-y-2 text-sm">
              <Link
                to="/rechercher"
                className="block py-1.5 hover:text-blue-100"
                onClick={() => setMobileOpen(false)}
              >
                Rechercher
              </Link>
              <Link
                to="/faq"
                className="block py-1.5 hover:text-blue-100"
                onClick={() => setMobileOpen(false)}
              >
                FAQ
              </Link>
              <Link
                to="/contact"
                className="block py-1.5 hover:text-blue-100"
                onClick={() => setMobileOpen(false)}
              >
                Contact
              </Link>
              <Link
                to="/devenir-ouvrier"
                className="mt-2 inline-flex items-center rounded-full bg-white text-[#1155ff] px-4 py-1.5 text-xs font-semibold shadow-md"
                onClick={() => setMobileOpen(false)}
              >
                Devenir Ouvrier Pro
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* ======================================
         HERO
      ======================================= */}
      <main className="flex-1">
        <section className="relative overflow-hidden">
          {/* halo / décor */}
          <div className="pointer-events-none absolute -top-40 -right-40 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-40 h-80 w-80 rounded-full bg-sky-300/10 blur-3xl" />

          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 pt-10 pb-16 sm:pt-16 sm:pb-24 lg:pt-20 lg:pb-28">
            {/* Tagline */}
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-3 py-1 text-[11px] sm:text-xs font-medium backdrop-blur shadow-sm">
              <span className="inline-flex h-1.5 w-1.5 rounded-full bg-emerald-300" />
              <span>+100 ouvriers qualifiés déjà inscrits</span>
            </div>

            {/* Titre + description */}
            <div className="mt-4 sm:mt-6 max-w-2xl">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight">
                Trouvez le bon ouvrier pour{" "}
                <span className="relative inline-block">
                  vos travaux
                  <span className="absolute inset-x-0 -bottom-1 h-2 bg-amber-300/80 rounded-full blur-sm" />
                </span>
              </h1>
              <p className="mt-3 sm:mt-4 text-sm sm:text-base text-blue-100/90 max-w-xl">
                Connectez-vous avec des professionnels qualifiés près de chez
                vous, comparez leurs profils, leurs notes et leurs tarifs en
                quelques clics.
              </p>
            </div>

            {/* Barre de recherche */}
            <form
              onSubmit={handleSubmit}
              className="mt-6 sm:mt-8 rounded-2xl bg-white text-slate-900 shadow-[0_20px_50px_rgba(15,23,42,0.35)] border border-slate-200/80 overflow-hidden"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Métier */}
                <div className="flex-1 flex items-center gap-2 px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher un métier ou service"
                    className="w-full bg-transparent text-sm sm:text-base outline-none placeholder:text-slate-400"
                    // value={...}
                    // onChange={...}
                  />
                </div>

                {/* Ville */}
                <div className="flex-1 flex items-center gap-2 px-4 py-3 border-b sm:border-b-0 sm:border-r border-slate-200">
                  <MapPin className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Ville, quartier ou code postal"
                    className="w-full bg-transparent text-sm sm:text-base outline-none placeholder:text-slate-400"
                    // value={...}
                    // onChange={...}
                  />
                </div>

                {/* Bouton */}
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-[#1155ff] text-white text-sm sm:text-base font-semibold hover:bg-[#0d47d5] active:bg-[#0b3bb0] transition-colors"
                >
                  Rechercher
                </button>
              </div>
            </form>

            {/* Petites stats sous la barre */}
            <div className="mt-5 sm:mt-6 flex flex-wrap gap-3 text-[11px] sm:text-xs text-blue-100/90">
              <div className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-3 py-1 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                <span>Profil vérifié par l’équipe OuvriersPro</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-3 py-1 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                <span>Notes & avis clients visibles</span>
              </div>
              <div className="inline-flex items-center gap-1 rounded-full bg-white/10 border border-white/15 px-3 py-1 backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-sky-300" />
                <span>Gratuit pour les particuliers</span>
              </div>
            </div>
          </div>
        </section>

        {/* Tu peux ensuite garder / moderniser le reste de ta page
           (Pourquoi choisir OuvriersPro, sections cartes, etc.)
           en appliquant les mêmes principes de layout. */}
      </main>
    </div>
  );
};

export default Home;
