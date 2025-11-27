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
        ? "Retrouvez vos demandes, vos échanges avec les ouvriers et vos informations personnelles."
        : "Access your requests, conversations with workers and personal information.",
    quickActions:
      language === "fr" ? "Actions rapides" : "Quick actions",
    myRequests:
      language === "fr" ? "Mes demandes de travaux" : "My work requests",
    myRequestsDesc:
      language === "fr"
        ? "Suivez le statut de vos demandes et l’historique des échanges avec les ouvriers."
        : "Track the status of your requests and history of conversations with workers.",
    myMessages:
      language === "fr"
        ? "Mes échanges avec les ouvriers"
        : "My conversations with workers",
    myMessagesDesc:
      language === "fr"
        ? "Consultez l’historique de vos messages et coordonnées échangées."
        : "Review the history of your messages and shared details.",
    myFavorites:
      language === "fr" ? "Mes ouvriers favoris" : "My favourite workers",
    myFavoritesDesc:
      language === "fr"
        ? "Retrouvez rapidement les professionnels que vous souhaitez recontacter."
        : "Quickly find the professionals you want to contact again.",
    profileTitle: language === "fr" ? "Mon profil" : "My profile",
    profileDesc:
      language === "fr"
        ? "Mettez à jour vos coordonnées pour être facilement recontacté par les ouvriers."
        : "Keep your contact details up to date so workers can reach you easily.",
    goSearch:
      language === "fr" ? "Rechercher un ouvrier" : "Search for a worker",
    seeMyRequests:
      language === "fr" ? "Voir mes demandes" : "View my requests",
    seeMyMessages:
      language === "fr" ? "Voir mes échanges" : "View my conversations",
    seeMyFavorites:
      language === "fr" ? "Voir mes favoris" : "View my favourites",
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-slate-50 to-slate-100">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10">
        {/* En-tête / Hero */}
        <header className="mb-8 rounded-3xl bg-white/90 border border-slate-100 shadow-sm px-5 py-5 md:px-8 md:py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-100 mb-3">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              {language === "fr"
                ? "Connecté en tant que client / particulier"
                : "Logged in as client / individual"}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 mb-1">
              {t.title}
            </h1>
            <p className="text-sm md:text-base text-slate-600 max-w-xl">
              {t.subtitle}
            </p>
          </div>

          <div className="flex flex-col items-stretch gap-3 md:items-end">
            <Button
              asChild
              className="bg-pro-blue hover:bg-pro-blue/90 rounded-full px-5 shadow-md shadow-pro-blue/25"
            >
              <Link to="/search" className="flex items-center gap-2">
                <Search className="w-4 h-4" />
                {t.goSearch}
              </Link>
            </Button>

            <div className="hidden md:flex items-center text-[11px] text-slate-500 gap-1">
              <span className="h-1 w-1 rounded-full bg-slate-400" />
              {language === "fr"
                ? "Accédez rapidement à vos demandes et à votre profil."
                : "Quickly access your requests and profile."}
            </div>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-[1.75fr,1.25fr] items-start">
          {/* Colonne gauche : actions principales */}
          <div className="space-y-6">
            <Card className="p-6 md:p-7 rounded-3xl bg-white/90 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-pro-blue/10 flex items-center justify-center">
                    <ClipboardList className="w-4 h-4 text-pro-blue" />
                  </div>
                  <h2 className="text-sm font-semibold text-slate-800">
                    {t.quickActions}
                  </h2>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* Mes demandes */}
                <div className="relative rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:border-pro-blue/60 hover:bg-white transition-shadow transition-colors shadow-xs hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-pro-blue/10 flex items-center justify-center">
                      <ClipboardList className="w-4 h-4 text-pro-blue" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t.myRequests}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    {t.myRequestsDesc}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full border-slate-200"
                  >
                    <Link to="/mes-demandes" className="flex items-center gap-1">
                      {t.seeMyRequests}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>

                {/* Mes échanges */}
                <div className="relative rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:border-emerald-500/70 hover:bg-white transition-shadow transition-colors shadow-xs hover:shadow-md">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-emerald-50 flex items-center justify-center">
                      <MessageCircle className="w-4 h-4 text-emerald-600" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t.myMessages}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    {t.myMessagesDesc}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full border-slate-200"
                  >
                    <Link to="/mes-echanges" className="flex items-center gap-1">
                      {t.seeMyMessages}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>

                {/* Mes favoris */}
                <div className="relative rounded-2xl border border-slate-100 bg-slate-50/70 p-4 hover:border-rose-500/70 hover:bg-white transition-shadow transition-colors shadow-xs hover:shadow-md md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center">
                      <Heart className="w-4 h-4 text-rose-500" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">
                      {t.myFavorites}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                    {t.myFavoritesDesc}
                  </p>
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-full border-slate-200"
                  >
                    <Link to="/mes-favoris" className="flex items-center gap-1">
                      {t.seeMyFavorites}
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Colonne droite : profil + astuce */}
          <div className="space-y-6">
            {/* Profil */}
            <Card className="p-6 rounded-3xl bg-white/90 shadow-sm border border-slate-100">
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

              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-4 text-[11px] text-slate-500 mb-4">
                {language === "fr"
                  ? "Email, téléphone, ville, préférences de contact… Ces informations sont partagées avec les ouvriers lorsque vous envoyez une demande."
                  : "Email, phone, city, contact preferences… These details are shared with workers when you send a request."}
              </div>

              <Button
                asChild
                variant="outline"
                className="w-full rounded-full text-sm border-slate-200 hover:border-pro-blue/70"
              >
                <Link to="/mon-profil">
                  {language === "fr"
                    ? "Modifier mon profil"
                    : "Edit my profile"}
                </Link>
              </Button>
            </Card>

            {/* Astuce */}
            <Card className="p-4 rounded-3xl bg-slate-900 text-slate-100 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide text-slate-400 mb-1">
                    {language === "fr"
                      ? "Astuce OuvriersPro"
                      : "OuvriersPro tip"}
                  </p>
                  <p className="text-sm leading-relaxed">
                    {language === "fr"
                      ? "Plus vos demandes sont précises (photos, délais, budget estimé), plus vous recevez des réponses rapides et adaptées."
                      : "The more precise your requests are (photos, timeline, estimated budget), the faster and more accurate responses you get."}
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
