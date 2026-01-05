import * as React from "react";
import { Mail, Phone, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  title?: string;
  subtitle?: string;
  buttonLabel?: string;
  phoneTo?: string;          // ex: "+224620000000"
  defaultSubject?: string;   // ex: "Support"
  cooldownSeconds?: number;  // default 30
};

const LS_KEY = "op:contact:last_sent_at";

function normalizePhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}

function getCooldownRemaining(cooldownSeconds: number) {
  try {
    const last = Number(localStorage.getItem(LS_KEY) || "0");
    if (!last) return 0;
    const elapsedMs = Date.now() - last;
    const remaining = Math.ceil(cooldownSeconds - elapsedMs / 1000);
    return Math.max(0, remaining);
  } catch {
    return 0;
  }
}

function setCooldownNow() {
  try {
    localStorage.setItem(LS_KEY, String(Date.now()));
  } catch {
    // ignore
  }
}

export default function ContactCTA({
  className,
  title = "Contact",
  subtitle = "Une question ? Notre équipe vous répond rapidement.",
  buttonLabel = "Contact",
  phoneTo,
  defaultSubject = "Demande de contact",
  cooldownSeconds = 30,
}: Props) {
  const [open, setOpen] = React.useState(false);

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [subject, setSubject] = React.useState(defaultSubject);
  const [message, setMessage] = React.useState("");

  const [sending, setSending] = React.useState(false);
  const [ok, setOk] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  const [cooldownRemaining, setCooldownRemainingState] = React.useState(0);

  const telHref = React.useMemo(() => {
    if (!phoneTo) return null;
    return `tel:${normalizePhone(phoneTo)}`;
  }, [phoneTo]);

  const resetStatus = React.useCallback(() => {
    setOk(null);
    setErr(null);
  }, []);

  const canSend =
    email.trim().length > 0 &&
    message.trim().length > 0 &&
    cooldownRemaining === 0 &&
    !sending;

  // 1) Cooldown ticker
  React.useEffect(() => {
    if (!open) return;

    const tick = () => setCooldownRemainingState(getCooldownRemaining(cooldownSeconds));
    tick();

    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [open, cooldownSeconds]);

  // 2) Auto-fill si connecté (profiles + auth user)
  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;

        // Fallback email depuis auth
        const authEmail = user?.email ?? "";

        if (!user) {
          if (!cancelled) {
            // si pas connecté, ne force rien (garde ce que l’utilisateur tape)
            setEmail((v) => v || "");
          }
          return;
        }

        // Charge profiles
        // Hypothèse: public.profiles.id = auth.users.id
        // et colonnes possibles: full_name, email
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name,email")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          // On ne bloque pas : fallback sur authEmail
          if (!cancelled) {
            setEmail((v) => v || authEmail);
          }
          return;
        }

        if (!cancelled) {
          const pName = (profile as any)?.full_name ?? "";
          const pEmail = (profile as any)?.email ?? "";

          // On ne remplace que si champs vides (évite d’écraser la saisie)
          if (pName) setFullName((v) => v || pName);
          setEmail((v) => v || pEmail || authEmail);
        }
      } catch {
        // ignore
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [open]);

  // 3) Reset subject si defaultSubject change
  React.useEffect(() => {
    setSubject(defaultSubject);
  }, [defaultSubject]);

  const handleOpen = () => {
    resetStatus();
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
  };

  const handleSend = async () => {
    resetStatus();

    const e = email.trim();
    const m = message.trim();
    const s = subject.trim();

    if (!e || !m) {
      setErr("Veuillez renseigner l’email et le message.");
      return;
    }

    // cooldown check
    const remaining = getCooldownRemaining(cooldownSeconds);
    if (remaining > 0) {
      setCooldownRemainingState(remaining);
      setErr(`Veuillez patienter ${remaining}s avant de renvoyer un message.`);
      return;
    }

    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const payload = {
        status: "new" as const,
        user_id: user?.id ?? null,
        full_name: fullName.trim() || null,
        email: e,
        subject: s || null,
        message: m,
        page_url: typeof window !== "undefined" ? window.location.href : null,
        user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
        ip_hint: null, // optionnel si tu veux le remplir côté edge function
      };

      const { error } = await supabase.from("op_contact_messages").insert(payload);
      if (error) throw error;

      setCooldownNow();
      setCooldownRemainingState(cooldownSeconds);

      setOk("Merci. Votre message a bien été envoyé.");
      setMessage("");
      // on garde nom/email pour éviter de retaper
    } catch (ex) {
      console.error("Contact submit error:", ex);
      setErr("Impossible d’envoyer votre message pour le moment.");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <div className={cn("mt-2", className)}>
        <Button
          type="button"
          onClick={handleOpen}
          className="w-full rounded-xl bg-pro-blue hover:bg-pro-blue/90 justify-start gap-2"
        >
          <Mail className="h-4 w-4" />
          <span className="truncate">{buttonLabel}</span>
        </Button>

        <p className="mt-2 text-xs text-sidebar-foreground/70 leading-snug">
          {subtitle}
        </p>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              Envoyez-nous votre message. Réponse par email.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-pro-gray">
                  Nom <span className="text-gray-400">(optionnel)</span>
                </label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Mamadou Diallo"
                  onFocus={resetStatus}
                />
              </div>

              <div className="grid gap-1.5">
                <label className="text-sm font-medium text-pro-gray">
                  Email <span className="text-red-500">*</span>
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ex: nom@email.com"
                  required
                  onFocus={resetStatus}
                />
              </div>
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-pro-gray">
                Objet <span className="text-gray-400">(optionnel)</span>
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Ex: Paiement / Sécurité"
                onFocus={resetStatus}
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-pro-gray">
                Message <span className="text-red-500">*</span>
              </label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Décrivez votre demande..."
                rows={5}
                required
                onFocus={resetStatus}
              />
            </div>

            {/* Anti-spam / cooldown */}
            {cooldownRemaining > 0 && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
                Anti-spam actif : vous pourrez renvoyer un message dans{" "}
                <span className="font-semibold">{cooldownRemaining}s</span>.
              </div>
            )}

            {/* Feedback */}
            {ok && (
              <div className="flex items-start gap-2 rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-emerald-800">
                <CheckCircle2 className="w-5 h-5 mt-0.5" />
                <div className="text-sm">{ok}</div>
              </div>
            )}
            {err && (
              <div className="flex items-start gap-2 rounded-2xl bg-amber-50 border border-amber-200 px-4 py-3 text-amber-900">
                <AlertTriangle className="w-5 h-5 mt-0.5" />
                <div className="text-sm">{err}</div>
              </div>
            )}

            {telHref && (
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <div className="flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  <span className="font-medium">Appel :</span>
                  <a className="underline" href={telHref}>
                    {phoneTo}
                  </a>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button type="button" variant="outline" onClick={handleClose} className="rounded-xl">
              Fermer
            </Button>

            <Button
              type="button"
              className="rounded-xl bg-pro-blue hover:bg-pro-blue/90 flex items-center gap-2"
              onClick={handleSend}
              disabled={!canSend}
            >
              <Send className="h-4 w-4" />
              {sending ? "Envoi..." : "Envoyer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
