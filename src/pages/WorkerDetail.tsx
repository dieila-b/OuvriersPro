import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  MapPin,
  Star,
  Clock,
  Phone,
  Mail,
  MessageCircle,
} from "lucide-react";

type DbWorker = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  profession: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  commune: string | null;
  district: string | null;
  description: string | null;
  hourly_rate: number | null;
  currency: string | null;
  years_experience: number | null;
  average_rating: number | null;
  rating_count: number | null;
  status: string | null;
};

const WorkerDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { language } = useLanguage();

  const [worker, setWorker] = useState<DbWorker | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchWorker = async () => {
      if (!id) {
        setError(
          language === "fr"
            ? "Identifiant ouvrier manquant."
            : "Missing worker id."
        );
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from<DbWorker>("op_ouvriers")
        .select(
          `
          id,
          first_name,
          last_name,
          email,
          phone,
          profession,
          country,
          region,
          city,
          commune,
          district,
          description,
          hourly_rate,
          currency,
          years_experience,
          average_rating,
          rating_count,
          status
        `
        )
        .eq("id", id)
        .eq("status", "approved")
        .single();

      if (error) {
        console.error(error);
        setError(
          language === "fr"
            ? "Impossible de charger la fiche de cet ouvrier."
            : "Unable to load this worker profile."
        );
        setLoading(false);
        return;
      }

      setWorker(data);
      setLoading(false);
    };

    fetchWorker();
  }, [id, language]);

  const fullName =
    (worker?.first_name || "") +
    (worker?.last_name ? ` ${worker.last_name}` : "");

  const formatLocation = () => {
    if (!worker) return "";
    return [worker.region, worker.city, worker.commune, worker.district]
      .filter(Boolean)
      .join(" • ");
  };

  const formatPrice = () => {
    if (!worker || worker.hourly_rate == null) return "";
    if (worker.currency === "GNF") {
      return `${worker.hourly_rate.toLocaleString("fr-FR")} GNF / ${
        language === "fr" ? "heure" : "hour"
      }`;
    }
    return `${worker.hourly_rate} ${worker.currency} / ${
      language === "fr" ? "heure" : "hour"
    }`;
  };

  const text = {
    back:
      language === "fr"
        ? "Retour aux résultats"
        : "Back to results",
    title:
      language === "fr"
        ? "Fiche détaillée"
        : "Detailed profile",
    experience:
      language === "fr"
        ? "ans d'expérience"
        : "years of experience",
    descriptionTitle:
      language === "fr"
        ? "Description des services"
        : "Services description",
    zoneTitle:
      language === "fr"
        ? "Zone d’intervention"
        : "Service area",
    contactTitle:
      language === "fr"
        ? "Prise de contact"
        : "Contact",
    phoneLabel:
      language === "fr"
        ? "Téléphone"
        : "Phone",
    emailLabel:
      language === "fr"
        ? "E-mail"
        : "Email",
    whatsappLabel:
      language === "fr"
        ? "WhatsApp"
        : "WhatsApp",
    noPhone:
      language === "fr"
        ? "Numéro non renseigné"
        : "Phone number not provided",
    noEmail:
      language === "fr"
        ? "E-mail non renseigné"
        : "Email not provided",
    loading:
      language === "fr"
        ? "Chargement de la fiche..."
        : "Loading profile...",
    notFound:
      language === "fr"
        ? "Ouvrier introuvable."
        : "Worker not found.",
  };

  const buildWhatsappLink = () => {
    if (!worker?.phone) return "#";
    // Très simple : supprimer les espaces
    const phoneClean = worker.phone.replace(/\s+/g, "");
    return `https://wa.me/${phoneClean}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-3xl mx-auto px-4">
          <p className="text-gray-600 text-sm">{text.loading}</p>
        </div>
      </div>
    );
  }

  if (error || !worker) {
    return (
      <div className="min-h-screen bg-gray-50 py-10">
        <div className="max-w-3xl mx-auto px-4 space-y-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            {text.back}
          </Button>
          <Card>
            <CardContent className="p-6">
              <p className="text-red-600 text-sm">
                {error || text.notFound}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 md:py-12">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Bouton retour */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          {text.back}
        </Button>

        {/* Fiche ouvrier */}
        <Card className="shadow-md">
          <CardHeader className="border-b border-gray-100 pb-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-pro-blue/10 flex items-center justify-center text-pro-blue font-semibold text-xl">
                  {fullName
                    .split(" ")
                    .filter(Boolean)
                    .map((n) => n[0])
                    .join("") || "OP"}
                </div>
                <div>
                  <CardTitle className="text-xl md:text-2xl text-pro-gray">
                    {fullName || "Ouvrier"}
                  </CardTitle>
                  {worker.profession && (
                    <p className="text-sm text-pro-blue font-medium">
                      {worker.profession}
                    </p>
                  )}
                  {formatLocation() && (
                    <p className="text-xs md:text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {formatLocation()}
                    </p>
                  )}
                </div>
              </div>

              <div className="text-right space-y-1">
                {worker.average_rating != null && (
                  <p className="text-sm flex items-center gap-1 justify-end text-yellow-500">
                    <Star className="w-4 h-4" />
                    <span className="font-semibold">
                      {worker.average_rating.toFixed(1)}
                    </span>
                    <span className="text-gray-500 text-xs">
                      ({worker.rating_count || 0})
                    </span>
                  </p>
                )}

                {worker.years_experience != null && (
                  <p className="text-xs text-gray-600 flex items-center gap-1 justify-end">
                    <Clock className="w-3 h-3" />
                    {worker.years_experience} {text.experience}
                  </p>
                )}

                {worker.hourly_rate != null && (
                  <p className="text-sm font-semibold text-pro-blue">
                    {formatPrice()}
                  </p>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Description */}
            <section>
              <h3 className="text-base font-semibold text-pro-gray mb-2">
                {text.descriptionTitle}
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed">
                {worker.description ||
                  (language === "fr"
                    ? "Aucune description détaillée fournie pour le moment."
                    : "No detailed description provided yet.")}
              </p>
            </section>

            {/* Zone d’intervention */}
            <section>
              <h3 className="text-base font-semibold text-pro-gray mb-2">
                {text.zoneTitle}
              </h3>
              <p className="text-sm text-gray-700">
                {formatLocation() ||
                  (language === "fr"
                    ? "Zone d’intervention non précisée."
                    : "Service area not specified.")}
              </p>
            </section>

            {/* Contact */}
            <section>
              <h3 className="text-base font-semibold text-pro-gray mb-3">
                {text.contactTitle}
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {/* Téléphone */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pro-blue/10 flex items-center justify-center">
                    <Phone className="w-4 h-4 text-pro-blue" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{text.phoneLabel}</p>
                    <p className="text-sm text-gray-800">
                      {worker.phone || text.noPhone}
                    </p>
                  </div>
                </div>

                {/* Email */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-pro-blue/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-pro-blue" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">{text.emailLabel}</p>
                    <p className="text-sm text-gray-800">
                      {worker.email || text.noEmail}
                    </p>
                  </div>
                </div>
              </div>

              {/* Boutons d'action */}
              <div className="mt-4 flex flex-wrap gap-3">
                {worker.phone && (
                  <Button
                    asChild
                    className="bg-pro-blue hover:bg-blue-700 text-sm"
                  >
                    <a href={`tel:${worker.phone}`}>
                      <Phone className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Appeler" : "Call"}
                    </a>
                  </Button>
                )}

                {worker.phone && (
                  <Button
                    variant="outline"
                    asChild
                    className="text-sm"
                  >
                    <a href={buildWhatsappLink()} target="_blank" rel="noreferrer">
                      <MessageCircle className="w-4 h-4 mr-2" />
                      {text.whatsappLabel}
                    </a>
                  </Button>
                )}

                {worker.email && (
                  <Button
                    variant="outline"
                    asChild
                    className="text-sm"
                  >
                    <a href={`mailto:${worker.email}`}>
                      <Mail className="w-4 h-4 mr-2" />
                      {language === "fr" ? "Envoyer un e-mail" : "Send email"}
                    </a>
                  </Button>
                )}
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkerDetail;
