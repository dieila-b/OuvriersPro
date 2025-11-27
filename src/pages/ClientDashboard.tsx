// src/pages/ClientDashboard.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  User,
  ClipboardList,
  MessageCircle,
  Heart,
  ArrowRight,
  Search,
} from "lucide-react";

const ClientDashboard: React.FC = () => {
  const { language } = useLanguage();

  const t = {
    title:
      language === "fr"
        ? "Espace client / particulier"
        : "Client / individual space",
    subtitle:
      language === "fr"
        ? "Retrouvez ici vos demandes, vos échanges avec les ouvriers et vos informations personnelles."
        : "Here you can see your requests, conversations with workers and personal information.",
    quickActions:
      language === "fr" ? "Actions rapides" : "Quick actions",
    myRequests:
      language === "fr" ? "Mes demandes de travaux" : "My work requests",
    myRequestsDesc:
      language === "fr"
        ? "Suivez le statut de vos demandes (en attente, en cours, terminées...) et l’historique des échanges avec les ouvriers."
        : "Track the status of your requests (pending, in progress, completed) and the history of your exchanges with workers.",
    myRequestsCta:
      language === "fr" ? "Voir mes demandes" : "View my requests",
    myMessages:
      language === "fr"
        ? "Mes échanges avec les ouvriers"
        : "My conversations with workers",
    myMessagesDesc:
      language === "fr"
        ? "Consultez l’historique de vos messages et coordonnées échangées."
        : "See the full history of your messages and shared details.",
    myFavorites:
      language === "fr" ? "Mes ouvriers favoris" : "My favourite workers",
    myFavoritesDesc:
      language === "fr"
        ? "Retrouvez rapidement les professionnels que vous souhaitez recontacter."
        : "Quickly find the professionals you want to contact again.",
    profileTitle:
      language === "fr" ? "Mon profil" : "My profile",
    profileDesc:
      language === "fr"
        ? "Mettez à jour vos coordonnées pour être facilement recontacté."
        : "Keep your contact details up to date so workers can reach you easily.",
    goSearch:
      language === "fr"
        ? "Rechercher un ouvrier"
        : "Search for a worker",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        {/* En-tête */}
        <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-slate-500 shadow-sm border border-slate-100 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {language === "fr"
                ? "Connecté en tant que client / particulier"
                : "Logged in as client / individual"}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
              {t.title}
            </h1>
            <p className="text-sm md:text-base text-slate-600">
              {t.subtitle}
            </p>
          </div>

          {/* CTA retour vers la recherche sur la page d'accueil */}
          <Button
            asChild
            className="bg-pro-blue hover:bg-pro-blue/90 rounded-full px-5 shadow-md shadow-pro-blue/20"
          >
            <Link to="/" className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              {t.goSearch}
            </Link>
          </Button>
        </header>

        <div className="grid gap-6 md:grid-cols-[1.7fr,1.3fr] items-start">
          {/* Colonne gauche : actions & sections principales */}
          <div className="space-y-6">
            <Card className="p-6 rounded-2xl bg-white/90 shadow-sm border-slate-200">
              <h2 className="text-sm font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-pro-blue" />
                {t.quickActions}
              </h2>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Mes demandes */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 hover:border-pro-blue/60 hover:bg-white transition">
                  <div className="flex items-center gap-2 mb-2">
                    <ClipboardList className="w-4 h-4 text-pro-blue" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t.myRequests}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    {t.myRequestsDesc}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full flex items-center gap-1"
                  >
                    <Link to="/mes-demandes">
                      {t.myRequestsCta}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>

                {/* Mes échanges */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 hover:border-pro-blue/50 hover:bg-white transition">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 text-emerald-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t.myMessages}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    {t.myMessagesDesc}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full"
                    type="button"
                  >
                    {language === "fr" ? "Bientôt disponible" : "Coming soon"}
                  </Button>
                </div>

                {/* Mes favoris */}
                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-4 hover:border-pro-blue/50 hover:bg-white transition">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="w-4 h-4 text-rose-500" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t.myFavorites}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-3">
                    {t.myFavoritesDesc}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full"
                    type="button"
                  >
                    {language === "fr" ? "Bientôt disponible" : "Coming soon"}
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Colonne droite : profil */}
          <div className="space-y-6">
            <Card className="p-6 rounded-2xl bg-white/90 shadow-sm border-slate-200">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-full bg-pro-blue/10 flex items-center justify-center">
                  <User className="w-4 h-4 text-pro-blue" />
                </div>
                <h2 className="text-sm font-semibold text-slate-900">
                  {t.profileTitle}
                </h2>
              </div>
              <p className="text-sm text-slate-600 mb-4">
                {t.profileDesc}
              </p>

              <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs text-slate-500">
                {language === "fr"
                  ? "La gestion détaillée du profil client arrivera bientôt (adresse, téléphone, préférences de contact, etc.)."
                  : "Detailed client profile management will be available soon (address, phone, contact preferences, etc.)."}
              </div>

              <Button
                variant="outline"
                className="mt-4 w-full rounded-full text-sm"
                type="button"
              >
                {language === "fr"
                  ? "Modifier mon profil (bientôt)"
                  : "Edit my profile (soon)"}
              </Button>
            </Card>

            <Card className="p-4 rounded-2xl bg-slate-900 text-slate-100 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                    {language === "fr"
                      ? "Astuce OuvriersPro"
                      : "OuvriersPro tip"}
                  </p>
                  <p className="text-sm">
                    {language === "fr"
                      ? "Plus vos demandes sont précises, plus vous recevez des réponses rapides et adaptées."
                      : "The more precise your requests are, the faster and more relevant answers you get."}
                  </p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-400" />
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClientDashboard;
