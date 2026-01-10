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

  const canSubmit = useMemo(() => {
    if (!workerId) return false;
    if (!reason) return false;
    return true;
  }, [workerId, reason]);

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

      const { error } = await supabase.from("worker_reports").insert(payload);
      if (error) throw error;

      toast({
        title: "Signalement envoyé",
        description: "Merci. Notre équipe va analyser ce profil.",
      });

      setOpen(false);
      setDetails("");
      setName("");
      setPhone("");
      setEmail("");
      setReason("Profil frauduleux / faux");
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
      >
        <AlertTriangle className="h-4 w-4 mr-2" />
        Signaler
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
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
              <div className="text-sm font-medium mb-1">Détails (facultatif)</div>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Explique ce qui ne va pas (preuves, contexte, etc.)"
                rows={4}
                disabled={loading}
              />
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

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
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
