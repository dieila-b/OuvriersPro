// src/pages/ClientMessagesList.tsx
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/contexts/LanguageContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle, ArrowLeft, Loader2 } from "lucide-react";

type ClientMessage = {
  id: string;
  worker_id: string;
  worker_name: string | null;
  message: string;
  created_at: string;
};

const ClientMessagesList: React.FC = () => {
  const { language } = useLanguage();
  const navigate = useNavigate();

  const [items, setItems] = useState<ClientMessage[]>([]);
  const [loading, setLoading] = useState(true);

  const t = {
    title:
      language === "fr"
        ? "Mes échanges avec les ouvriers"
        : "My conversations with workers",
    subtitle:
      language === "fr"
        ? "Retrouvez ici l’historique de vos messages envoyés aux ouvriers."
        : "Here is the history of messages you sent to workers.",
    empty:
      language === "fr"
        ? "Vous n’avez pas encore d’échange enregistré."
        : "You don’t have any recorded conversation yet.",
    workerLabel: language === "fr" ? "Ouvrier" : "Worker",
    dateLabel: language === "fr" ? "Envoyé le" : "Sent on",
    back:
      language === "fr"
        ? "Retour à mon espace client"
        : "Back to my client space",
  };

  useEffect(() => {
    const fetchMessages = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("op_client_worker_messages")
        .select("id, worker_id, worker_name, message, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading messages:", error);
        setItems([]);
      } else {
        setItems((data || []) as ClientMessage[]);
      }
      setLoading(false);
    };

    fetchMessages();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Bouton retour */}
        <Button
          variant="ghost"
          className="mb-4 flex items-center gap-2"
          onClick={() => navigate("/espace-client")}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">{t.back}</span>
        </Button>

        {/* En-tête */}
        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-500 shadow-sm border border-slate-100 mb-3">
            <MessageCircle className="w-3 h-3" />
            <span>
              {language === "fr"
                ? "Historique de vos échanges"
                : "History of your exchanges"}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            {t.title}
          </h1>
          <p className="text-sm text-slate-600">{t.subtitle}</p>
        </header>

        <Card className="p-4 md:p-6 bg-white shadow-sm border-slate-200 rounded-2xl">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-slate-500">
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              <span className="text-sm">
                {language === "fr" ? "Chargement..." : "Loading..."}
              </span>
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-sm text-slate-500">
              {t.empty}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {items.map((item) => (
                <li key={item.id} className="py-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-slate-400 mb-1">
                        {t.workerLabel}
                      </p>
                      <p className="text-sm font-semibold text-slate-900">
                        {item.worker_name || "Ouvrier"}
                      </p>
                    </div>
                    <div className="text-xs text-slate-400">
                      {t.dateLabel}{" "}
                      {new Date(item.created_at).toLocaleString(
                        language === "fr" ? "fr-FR" : "en-US",
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        }
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-700 whitespace-pre-line">
                    {item.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
};

export default ClientMessagesList;
