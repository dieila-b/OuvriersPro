// src/pages/ClientRequestsList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, ArrowRight } from "lucide-react";

type ClientRequest = {
  id: string;
  worker_id: string | null;
  worker_name: string | null;
  status: string | null;
  message: string | null;
  created_at: string;
};

const ClientRequestsList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();
  const [items, setItems] = useState<ClientRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("op_ouvrier_contacts")
        .select("id, worker_id, worker_name, status, message, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        setItems([]);
      } else {
        setItems((data || []) as ClientRequest[]);
      }

      setLoading(false);
    };

    load();
  }, []);

  const t = {
    title: language === "fr" ? "Mes demandes" : "My requests",
    subtitle:
      language === "fr"
        ? "Retrouvez toutes vos demandes envoyées aux ouvriers."
        : "See all requests you have sent to workers.",
    statusNew: language === "fr" ? "Nouvelle" : "New",
    statusInProgress: language === "fr" ? "En cours" : "In progress",
    statusDone: language === "fr" ? "Clôturée" : "Closed",
    seeWorker:
      language === "fr" ? "Voir la fiche de l'ouvrier" : "View worker profile",
    empty:
      language === "fr"
        ? "Vous n'avez pas encore envoyé de demande."
        : "You have not sent any request yet.",
    back: language === "fr" ? "Retour à mon espace" : "Back to my space",
  };

  const renderStatus = (status: string | null) => {
    const s = (status || "new").toLowerCase();
    if (s === "done" || s === "closed") {
      return <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">{t.statusDone}</Badge>;
    }
    if (s === "in_progress") {
      return <Badge className="bg-amber-50 text-amber-700 border border-amber-200">{t.statusInProgress}</Badge>;
    }
    return <Badge className="bg-blue-50 text-blue-700 border border-blue-200">{t.statusNew}</Badge>;
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => navigate("/espace-client")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t.back}
          </Button>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-1">
          {t.title}
        </h1>
        <p className="text-sm text-slate-600 mb-6">{t.subtitle}</p>

        {loading ? (
          <p className="text-sm text-slate-500">Chargement...</p>
        ) : items.length === 0 ? (
          <Card className="p-6 text-sm text-slate-500">
            {t.empty}
          </Card>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-slate-900">
                      {item.worker_name || "Ouvrier inconnu"}
                    </span>
                    {renderStatus(item.status)}
                  </div>
                  <p className="text-xs text-slate-500">
                    {new Date(item.created_at).toLocaleString("fr-FR")}
                  </p>
                  {item.message && (
                    <p className="mt-2 text-sm text-slate-700 line-clamp-2">
                      {item.message}
                    </p>
                  )}
                </div>

                {item.worker_id && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="self-start sm:self-center"
                    onClick={() => navigate(`/ouvriers/${item.worker_id}`)}
                  >
                    {t.seeWorker}
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ClientRequestsList;
