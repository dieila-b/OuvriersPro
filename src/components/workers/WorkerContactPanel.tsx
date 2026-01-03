// src/components/workers/WorkerContactPanel.tsx
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Phone,
  Mail,
  MessageCircle,
  FileText,
  Send,
  Info,
} from "lucide-react";

type WorkerContactPanelProps = {
  worker: {
    id: string;
    fullName: string;
    profession?: string | null;
    phone?: string | null;
    email?: string | null;
    whatsapp?: string | null; // tu peux utiliser le même numéro que phone si tu veux
    locationLabel?: string | null; // ex: "Conakry • Matoto • Gbessia"
  };
};

const WorkerContactPanel: React.FC<WorkerContactPanelProps> = ({ worker }) => {
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [requestType, setRequestType] = useState<"devis" | "info" | "urgence">(
    "devis"
  );
  const [budget, setBudget] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");

const baseMessage = `Bonjour ${worker.fullName},

Je vous contacte via ProxiServices pour un besoin de ${worker.profession || "services"}.

Détails de ma demande :
`;

  const whatsNumber = (worker.whatsapp || worker.phone || "").replace(/\s+/g, "");
  const whatsappUrl =
    whatsNumber && whatsNumber.length >= 8
      ? `https://wa.me/${whatsNumber.startsWith("+") ? whatsNumber.slice(1) : whatsNumber
        }?text=${encodeURIComponent(baseMessage)}`
      : "";

const mailtoUrl = worker.email
  ? `mailto:${worker.email}?subject=${encodeURIComponent(
      `Demande de ${worker.profession || "services"} via ProxiServices`
    )}&body=${encodeURIComponent(baseMessage)}`
  : "";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Ici tu enverras la demande vers Supabase (table op_ouvrier_contacts ou autre)
    // via une edge function ou un RPC. Pour l’instant, on ne fait qu’un console.log.
    console.log("Contact worker", {
      workerId: worker.id,
      clientName,
      clientEmail,
      clientPhone,
      requestType,
      budget,
      preferredDate,
      message,
    });
    alert(
      "Votre demande a été enregistrée. Le prestataire vous répondra directement."
    );

  };

  return (
    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Colonne gauche : fiche contact rapide */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
        <h2 className="text-lg font-semibold text-pro-gray">
          Contacter {worker.fullName}
        </h2>
        {worker.profession && (
          <p className="text-sm text-pro-blue font-medium">{worker.profession}</p>
        )}
        {worker.locationLabel && (
          <p className="text-xs text-gray-500">{worker.locationLabel}</p>
        )}

        <div className="mt-3 space-y-2 text-sm">
          {worker.phone && (
            <p className="flex items-center gap-2 text-gray-700">
              <Phone className="w-4 h-4 text-pro-blue" />
              <a href={`tel:${worker.phone}`} className="hover:underline">
                {worker.phone}
              </a>
            </p>
          )}
          {worker.email && (
            <p className="flex items-center gap-2 text-gray-700">
              <Mail className="w-4 h-4 text-pro-blue" />
              <a href={`mailto:${worker.email}`} className="hover:underline">
                {worker.email}
              </a>
            </p>
          )}
          {whatsNumber && (
            <p className="flex items-center gap-2 text-gray-700">
              <MessageCircle className="w-4 h-4 text-green-600" />
              <span>WhatsApp : {whatsNumber}</span>
            </p>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {worker.phone && (
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              asChild
            >
              <a href={`tel:${worker.phone}`}>
                <Phone className="w-4 h-4" />
                Appeler
              </a>
            </Button>
          )}

          {whatsappUrl && (
            <Button
              className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600"
              asChild
            >
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            </Button>
          )}

          {mailtoUrl && (
            <Button
              variant="outline"
              className="w-full flex items-center justify-center gap-2"
              asChild
            >
              <a href={mailtoUrl}>
                <Mail className="w-4 h-4" />
                Envoyer un e-mail
              </a>
            </Button>
          )}

          <Button
            variant="secondary"
            className="w-full flex items-center justify-center gap-2"
            onClick={() => setRequestType("devis")}
          >
            <FileText className="w-4 h-4" />
            Demande de devis
          </Button>
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-gray-500">
          <Info className="w-4 h-4 mt-0.5" />
          <p>
            Vos coordonnées sont transmises uniquement à cet ouvrier pour la
            gestion de votre demande.
          </p>
        </div>
      </div>

      {/* Colonne droite : formulaire détaillé */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="text-base font-semibold text-pro-gray mb-3">
          Envoyer une demande détaillée
        </h3>
        <form onSubmit={handleSubmit} className="space-y-3 text-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Votre nom
              </label>
              <Input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Ex : Mamadou Diallo"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Votre téléphone
              </label>
              <Input
                required
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder="Numéro pour vous joindre"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Votre email (facultatif)
              </label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder="email@exemple.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Type de demande
              </label>
              <select
                value={requestType}
                onChange={(e) =>
                  setRequestType(e.target.value as "devis" | "info" | "urgence")
                }
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pro-blue"
              >
                <option value="devis">Demande de devis</option>
                <option value="info">Demande d’informations</option>
                <option value="urgence">Intervention urgente</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Budget approximatif (facultatif)
              </label>
              <Input
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ex : 1 000 000 GNF"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Date souhaitée (facultatif)
              </label>
              <Input
                type="date"
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Décrivez votre besoin
            </label>
            <Textarea
              required
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Expliquez brièvement les travaux à réaliser, l’adresse, les contraintes éventuelles…"
            />
          </div>

          <div className="flex items-center gap-2 text-[11px] text-gray-500">
            <input type="checkbox" required className="rounded border-gray-300" />
            <span>
              J’accepte que mes coordonnées soient transmises à cet ouvrier pour
              être recontacté.
            </span>
          </div>

          <Button
            type="submit"
            className="mt-2 w-full flex items-center justify-center gap-2 bg-pro-blue hover:bg-blue-700"
          >
            <Send className="w-4 h-4" />
            Envoyer la demande
          </Button>
        </form>
      </div>
    </div>
  );
};

export default WorkerContactPanel;
