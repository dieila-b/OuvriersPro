import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ReportReason =
  | "spam"
  | "fraud"
  | "impersonation"
  | "inappropriate_content"
  | "harassment"
  | "pricing_scam"
  | "other";

type Props = {
  reportedUserId: string;          // auth.users.id du compte signalé
  reportedRole?: string | null;    // "worker" | "client" etc (optionnel)
  triggerLabel?: string;           // ex: "Signaler"
  className?: string;
};

export default function ReportAccountDialog({
  reportedUserId,
  reportedRole = null,
  triggerLabel = "Signaler ce compte",
  className,
}: Props) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("other");
  const [details, setDetails] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const reasons = useMemo(
    () => [
      { value: "spam", fr: "Spam / publicité", en: "Spam / ads" },
      { value: "fraud", fr: "Arnaque / fraude", en: "Fraud / scam" },
      { value: "impersonation", fr: "Usurpation d’identité", en: "Impersonation" },
      { value: "inappropriate_content", fr: "Contenu inapproprié", en: "Inappropriate content" },
      { value: "harassment", fr: "Harcèlement", en: "Harassment" },
      { value: "pricing_scam", fr: "Arnaque sur le prix / paiement", en: "Pricing/payment scam" },
      { value: "other", fr: "Autre", en: "Other" },
    ],
    []
  );

  const submit = async () => {
    setMsg(null);
    setLoading(true);

    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;

      if (!user) {
        setMsg("Vous devez être connecté pour signaler un compte.");
        setLoading(false);
        return;
      }

      if (user.id === reportedUserId) {
        setMsg("Vous ne pouvez pas signaler votre propre compte.");
        setLoading(false);
        return;
      }

      // Anti-spam simple: empêche plusieurs signalements identiques le même jour (optionnel)
      // (si tu veux plus strict, on le fait côté SQL avec un unique index)
      const { data: existing } = await supabase
        .from("account_reports")
        .select("id, created_at")
        .eq("reporter_user_id", user.id)
        .eq("reported_user_id", reportedUserId)
        .order("created_at", { ascending: false })
        .limit(1);

      if (existing && existing.length > 0) {
        const last = new Date(existing[0].created_at);
        const now = new Date();
        const sameDay =
          last.getFullYear() === now.getFullYear() &&
          last.getMonth() === now.getMonth() &&
          last.getDate() === now.getDate();

        if (sameDay) {
          setMsg("Vous avez déjà signalé ce compte aujourd’hui. Merci.");
          setLoading(false);
          return;
        }
      }

      const { error } = await supabase.from("account_reports").insert({
        reporter_user_id: user.id,
        reported_user_id: reportedUserId,
        reported_role: reportedRole,
        reason,
        details: details.trim() || null,
      });

      if (error) throw error;

      setMsg("Signalement envoyé. Merci, notre équipe va examiner ce compte.");
      setDetails("");
      setReason("other");
      // Tu peux fermer automatiquement après 1s si tu veux
      // setTimeout(() => setOpen(false), 1000);
    } catch (e: any) {
      console.error(e);
      setMsg("Erreur lors de l’envoi du signalement. Merci de réessayer.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        className={className}
        onClick={() => {
          setMsg(null);
          setOpen(true);
        }}
      >
        {triggerLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Signaler ce compte</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm text-gray-600">
              Merci de choisir une raison et d’ajouter des détails si nécessaire.
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-700">Raison</div>
              <Select value={reason} onValueChange={(v) => setReason(v as ReportReason)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choisir une raison" />
                </SelectTrigger>
                <SelectContent>
                  {reasons.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.fr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <div className="text-xs font-semibold text-gray-700">Détails (optionnel)</div>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Expliquez brièvement le problème (ex: arnaque, faux profil, insultes...)"
                className="min-h-[110px]"
              />
            </div>

            {msg && (
              <div className="text-sm bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                {msg}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Annuler
              </Button>
              <Button type="button" onClick={submit} disabled={loading}>
                {loading ? "Envoi..." : "Envoyer le signalement"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
