// src/components/workers/ReportWorkerButton.tsx
import React, { useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { AlertTriangle, Loader2 } from "lucide-react";

type Props = {
  workerId: string;
  workerName?: string | null;
  className?: string;
};

const REASONS = [
  "Profil frauduleux / faux",
  "Numéro / email incorrect",
  "Comportement inapproprié",
  "Tarifs trompeurs",
  "Autre",
] as const;

export default function ReportWorkerButton({ workerId, workerName, className }: Props) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [reason, setReason] = useState<(typeof REASONS)[number]>("Profil frauduleux / faux");
  const [details, setDetails] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");

  // ✅ Validation plus stricte (évite les signalements vides)
  const canSubmit = useMemo(() => {
    if (!workerId) return false;
    if (!reason) return false;

    // On accepte si:
    // - détails >= 10 caractères, OU
    // - au moins un contact (email/téléphone) est fourni
    const d = details.trim();
    const hasDetails = d.length >= 10;
    const hasContact = Boolean(email.trim() || phone.trim() || name.trim());
    return hasDetails || hasContact;
  }, [workerId, reason, details, email, phone, name]);

  const resetForm = () => {
    setDetails("");
    setName("");
    setPhone("");
    setEmail("");
    setReason("Profil frauduleux / faux");
  };

  // ✅ Insert robuste : on essaye worker_reports, sinon account_reports (selon ton schéma)
  const insertReport = async (payload: any) => {
    // 1) worker_reports (ton code actuel)
    const r1 = await supabase.from("worker_reports").insert(payload);
    if (!r1.error) return;

    // 2) fallback account_reports (si ta page "Signalements" est basée dessus)
    const fallbackPayload: any = {
      // champs "génériques" souvent utilisés
      reported_id: payload.worker_id,
      reported_role: "worker",
      reporter_name: payload.reporter_name,
      reporter_phone: payload.reporter_phone,
      reporter_email: payload.reporter_email,
      reason: payload.reason,
      details: payload.details,
      status: "new",
      origin: "web",
    };

    const r2 = await supabase.from("account_reports").insert(fallbackPayload);
    if (r2.error) {
      // On renvoie l'erreur la plus utile (la 1ère si table inexistante, sinon la 2ème)
      throw new Error(r2.error.message || r1.error?.message || "Insert failed");
    }
  };

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);

    try {
      const payload = {
        worker_id: workerId,
        reporter_name: name.trim() || null,
        reporter_phone: phone.trim() || null,
        reporter_email: email.trim() || null,
        reason,
        details: details.trim() || null,
      };

      await insertReport(payload);

      toast({
        title: "Signalement envoyé",
        description: "Merci. Notre équipe va analyser ce profil.",
      });

      setOpen(false);
      resetForm();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible d’envoyer le signalement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={className}
        title="Signaler ce profil"
        disabled={!workerId}
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Signaler
      </Button>

      <Dialog
        open={open}
        onOpenChange={(v) => {
          // ✅ si on ferme pendant le chargement, on bloque
          if (loading) return;
          setOpen(v);
          // ✅ si on ferme, on reset (évite de garder des valeurs d'un autre profil)
          if (!v) resetForm();
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Signaler ce profil{workerName ? ` : ${workerName}` : ""}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <div className="text-sm font-medium mb-1">Motif</div>
              <select
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                disabled={loading}
              >
                {REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="text-sm font-medium mb-1">Détails (recommandé)</div>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explique ce qui ne va pas (preuves, contexte, etc.). Minimum 10 caractères si vous ne mettez pas de contact."
                rows={4}
                disabled={loading}
              />
              <div className="text-[11px] text-muted-foreground mt-1">
                {details.trim().length}/10 min
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <div className="text-sm font-medium mb-1">Votre nom (facultatif)</div>
                <Input value={name} onChange={(e) => setName(e.target.value)} disabled={loading} />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Téléphone (facultatif)</div>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={loading} />
              </div>
              <div className="md:col-span-2">
                <div className="text-sm font-medium mb-1">Email (facultatif)</div>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={loading} />
              </div>
            </div>

            {/* ✅ petit hint UX */}
            {!canSubmit ? (
              <div className="text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                Ajoute au moins <b>10 caractères</b> dans “Détails” ou un <b>contact</b> (nom/téléphone/email).
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                Annuler
              </Button>
              <Button type="button" onClick={submit} disabled={!canSubmit || loading}>
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                Envoyer le signalement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
