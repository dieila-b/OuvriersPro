import * as React from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Send, CheckCircle2, AlertTriangle } from "lucide-react";

const LS_KEY = "op:contact:last_sent_at";

function isBrowser() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function safeGetLocalStorageItem(key: string) {
  try {
    if (!isBrowser() || !("localStorage" in window)) return null;
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetLocalStorageItem(key: string, value: string) {
  try {
    if (!isBrowser() || !("localStorage" in window)) return;
    window.localStorage.setItem(key, value);
  } catch {
    // ignore
  }
}

function getCooldownRemaining(cooldownSeconds: number) {
  try {
    const lastStr = safeGetLocalStorageItem(LS_KEY);
    const last = Number(lastStr || "0");
    if (!last) return 0;

    const elapsedMs = Date.now() - last;
    const remaining = Math.ceil(cooldownSeconds - elapsedMs / 1000);
    return Math.max(0, remaining);
  } catch {
    return 0;
  }
}

function setCooldownNow() {
  safeSetLocalStorageItem(LS_KEY, String(Date.now()));
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cooldownSeconds?: number; // default 30
  defaultSubject?: string; // default "Demande de contact"
};

export default function ContactModal({
  open,
  onOpenChange,
  cooldownSeconds = 30,
  defaultSubject = "Demande de contact",
}: Props) {
  const { t, language } = useLanguage();

  const cms = (key: string, fallbackFr: string, fallbackEn: string) => {
    const v = t(key);
    if (!v || v === key) return language === "fr" ? fallbackFr : fallbackEn;
    return v;
  };

  const [fullName, setFullName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [subject, setSubject] = React.useState(defaultSubject);
  const [message, setMessage] = React.useState("");

  const [sending, setSending] = React.useState(false);
  const [ok, setOk] = React.useState<string | null>(null);
  const [err, setErr] = React.useState<string | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = React.useState(0);

  const resetStatus = React.useCallback(() => {
    setOk(null);
    setErr(null);
  }, []);

  React.useEffect(() => {
    setSubject(defaultSubject);
  }, [defaultSubject]);

  React.useEffect(() => {
    if (!open) return;

    const tick = () => setCooldownRemaining(getCooldownRemaining(cooldownSeconds));
    tick();

    const id = window.setInterval(tick, 500);
    return () => window.clearInterval(id);
  }, [open, cooldownSeconds]);

  React.useEffect(() => {
    if (!open) return;

    let cancelled = false;

    const run = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user ?? null;
        const authEmail = user?.email ?? "";

        if (!user) {
          if (!cancelled) setEmail((v) => v || "");
          return;
        }

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("full_name,email")
          .eq("id", user.id)
          .maybeSingle();

        if (error) {
          if (!cancelled) setEmail((v) => v || authEmail);
          return;
        }

        if (!cancelled) {
          const pName = (profile as any)?.full_name ?? "";
          const pEmail = (profile as any)?.email ?? "";

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

  const canSend =
    email.trim().length > 0 && message.trim().length > 0 && cooldownRemaining === 0 && !sending;

  const handleSend = async () => {
    resetStatus();

    const e = email.trim();
    const m = message.trim();
    const s = subject.trim();

    if (!e || !m) {
      setErr(cms("contact.form.validation.required", "Veuillez renseigner l’email et le message.", "Please provide an email and a message."));
      return;
    }

    const remaining = getCooldownRemaining(cooldownSeconds);
    if (remaining > 0) {
      setCooldownRemaining(remaining);
      setErr(
        cms(
          "contact.form.cooldown.error",
          `Veuillez patienter ${remaining}s avant de renvoyer un message.`,
          `Please wait ${remaining}s before sending another message.`
        )
      );
      return;
    }

    setSending(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const pageUrl = isBrowser() ? window.location.href : null;
      const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : null;

      const payload = {
        status: "new",
        user_id: user?.id ?? null,
        full_name: fullName.trim() || null,
        email: e,
        subject: s || null,
        message: m,
        page_url: pageUrl,
        user_agent: userAgent,
      };

      const { error } = await supabase.from("op_contact_messages").insert(payload);
      if (error) throw error;

      setCooldownNow();
      setCooldownRemaining(cooldownSeconds);

      setOk(
        cms(
          "contact.form.success",
          "Merci. Votre message a bien été envoyé.",
          "Thank you. Your message has been sent successfully."
        )
      );
      setMessage("");
    } catch (ex) {
      console.error("Contact submit error:", ex);
      setErr(
        cms(
          "contact.form.error",
          "Impossible d’envoyer votre message pour le moment.",
          "We couldn’t send your message right now."
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) resetStatus();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {cms("contact.modal.title", "Contacter le support", "Contact Support")}
          </DialogTitle>
          <DialogDescription>
            {cms(
              "contact.modal.desc",
              "Décrivez votre demande, nous revenons vers vous rapidement.",
              "Share the details of your request and our team will get back to you shortly."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-pro-gray">
                {cms("contact.form.full_name", "Nom", "Full name")}{" "}
                <span className="text-gray-400">
                  ({cms("common.optional", "optionnel", "optional")})
                </span>
              </label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder={cms("contact.form.full_name_placeholder", "Ex: Mamadou Diallo", "e.g., Alex Johnson")}
                onFocus={resetStatus}
              />
            </div>

            <div className="grid gap-1.5">
              <label className="text-sm font-medium text-pro-gray">
                {cms("contact.form.email", "Email", "Email")} <span className="text-red-500">*</span>
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={cms("contact.form.email_placeholder", "ex: nom@email.com", "e.g., name@email.com")}
                required
                onFocus={resetStatus}
              />
            </div>
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-pro-gray">
              {cms("contact.form.subject", "Objet", "Subject")}{" "}
              <span className="text-gray-400">
                ({cms("common.optional", "optionnel", "optional")})
              </span>
            </label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder={cms("contact.form.subject_placeholder", "Ex: Paiement / Sécurité", "e.g., Billing / Security")}
              onFocus={resetStatus}
            />
          </div>

          <div className="grid gap-1.5">
            <label className="text-sm font-medium text-pro-gray">
              {cms("contact.form.message", "Message", "Message")} <span className="text-red-500">*</span>
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={cms("contact.form.message_placeholder", "Décrivez votre demande...", "Describe your request...")}
              rows={5}
              required
              onFocus={resetStatus}
            />
          </div>

          {cooldownRemaining > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900 text-sm">
              {cms(
                "contact.form.cooldown.notice_prefix",
                "Veuillez patienter",
                "Please wait"
              )}{" "}
              <span className="font-semibold">{cooldownRemaining}s</span>{" "}
              {cms(
                "contact.form.cooldown.notice_suffix",
                "avant d’envoyer un nouveau message.",
                "before sending another message."
              )}
            </div>
          )}

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
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {cms("common.close", "Fermer", "Close")}
          </Button>

          <Button
            type="button"
            className="rounded-xl bg-pro-blue hover:bg-pro-blue/90 flex items-center gap-2"
            onClick={handleSend}
            disabled={!canSend}
          >
            <Send className="h-4 w-4" />
            {sending ? cms("common.sending", "Envoi...", "Sending...") : cms("contact.form.btn_send", "Envoyer", "Send")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
