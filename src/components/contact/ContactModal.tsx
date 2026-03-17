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
import {
  Send,
  CheckCircle2,
  AlertTriangle,
  Mail,
  Phone,
  Clock,
  Headset,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  FileText,
} from "lucide-react";

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
  cooldownSeconds?: number;
  defaultSubject?: string;
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
  const [mobileFormOpen, setMobileFormOpen] = React.useState(false);

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
    setMobileFormOpen(false);

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
    email.trim().length > 0 &&
    message.trim().length > 0 &&
    cooldownRemaining === 0 &&
    !sending;

  const handleSend = async () => {
    resetStatus();

    const e = email.trim();
    const m = message.trim();
    const s = subject.trim();

    if (!e || !m) {
      setErr(
        cms(
          "contact.form.validation.required",
          "Veuillez renseigner l’email et le message.",
          "Please provide an email and a message."
        )
      );
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

  const supportEmail = cms(
    "footer.contact.email_value",
    "contact@proxiservices.com",
    "contact@proxiservices.com"
  );
  const supportPhoneTel = cms(
    "footer.contact.phone_tel",
    "+33123456789",
    "+33123456789"
  );
  const supportPhoneValue = cms(
    "footer.contact.phone_value",
    "+33 1 23 45 67 89",
    "+33 1 23 45 67 89"
  );
  const supportHoursValue = cms(
    "footer.contact.hours_value",
    "Lun–Ven • 09:00–18:00",
    "Mon–Fri • 09:00–18:00"
  );
  const supportWhatsappTel = cms(
    "footer.contact.whatsapp_tel",
    supportPhoneTel,
    supportPhoneTel
  );
  const supportWhatsappValue = cms(
    "footer.contact.whatsapp_value",
    "+33 1 23 45 67 89",
    "+33 1 23 45 67 89"
  );

  const formFields = (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-slate-700">
            {cms("contact.form.subject", "Objet", "Subject")}{" "}
            <span className="text-slate-400">
              ({cms("common.optional", "optionnel", "optional")})
            </span>
          </label>
          <Input
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={cms(
              "contact.form.subject_placeholder",
              "Ex: Paiement / Sécurité",
              "e.g., Billing / Security"
            )}
            onFocus={resetStatus}
            className="h-11 rounded-xl border-slate-200 bg-white"
          />
        </div>

        <div className="grid gap-1.5">
          <label className="text-sm font-medium text-slate-700">
            {cms("contact.form.full_name", "Nom", "Full name")}{" "}
            <span className="text-slate-400">
              ({cms("common.optional", "optionnel", "optional")})
            </span>
          </label>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={cms(
              "contact.form.full_name_placeholder",
              "Ex: Mamadou Diallo",
              "e.g., Alex Johnson"
            )}
            onFocus={resetStatus}
            className="h-11 rounded-xl border-slate-200 bg-white"
          />
        </div>
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-slate-700">
          {cms("contact.form.email", "Email", "Email")}{" "}
          <span className="text-red-500">*</span>
        </label>
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder={cms(
            "contact.form.email_placeholder",
            "ex: nom@email.com",
            "e.g., name@email.com"
          )}
          required
          onFocus={resetStatus}
          className="h-11 rounded-xl border-slate-200 bg-white"
        />
      </div>

      <div className="grid gap-1.5">
        <label className="text-sm font-medium text-slate-700">
          {cms("contact.form.message", "Message", "Message")}{" "}
          <span className="text-red-500">*</span>
        </label>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={cms(
            "contact.form.message_placeholder",
            "Décrivez votre demande...",
            "Describe your request..."
          )}
          rows={5}
          required
          onFocus={resetStatus}
          className="min-h-[140px] rounded-2xl border-slate-200 bg-white resize-none"
        />
      </div>
    </>
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (v) resetStatus();
        onOpenChange(v);
      }}
    >
      <DialogContent className="w-[calc(100vw-16px)] max-w-lg overflow-hidden rounded-[26px] border border-slate-200/80 bg-white p-0 shadow-[0_24px_80px_rgba(15,23,42,0.18)] sm:max-w-lg">
        <div className="max-h-[88vh] overflow-y-auto">
          <div className="px-4 pb-4 pt-5 sm:px-6 sm:pb-6 sm:pt-6">
            <DialogHeader className="space-y-1 text-left">
              <DialogTitle className="text-lg font-semibold text-slate-900">
                {cms("contact.modal.title", "Contacter le support", "Contact Support")}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-slate-500">
                {cms(
                  "contact.modal.desc",
                  "Décrivez votre demande, nous revenons vers vous rapidement.",
                  "Share the details of your request and our team will get back to you shortly."
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 grid gap-4">
              {/* Mobile / Émulateur : carte contact premium */}
              <div className="md:hidden">
                <div className="mx-auto w-full max-w-[420px]">
                  <div className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-50 via-white to-slate-100/80 p-4 shadow-[0_14px_44px_rgba(15,23,42,0.10)]">
                    <div className="pointer-events-none absolute inset-0">
                      <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-blue-100/60 blur-2xl" />
                      <div className="absolute -left-6 bottom-0 h-20 w-20 rounded-full bg-slate-100 blur-2xl" />
                      <div className="absolute inset-x-8 top-0 h-10 rounded-full bg-pro-blue/5 blur-2xl" />
                    </div>

                    <div className="relative">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pro-blue text-white shadow-[0_10px_24px_rgba(59,130,246,0.28)]">
                          <Headset className="h-5 w-5" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-slate-900">
                            {cms(
                              "contact.modal.mobile_support_title",
                              "Support ProxiServices",
                              "ProxiServices Support"
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {cms(
                              "contact.modal.mobile_support_subtitle",
                              "Informations utiles avant l’envoi de votre message",
                              "Helpful details before sending your message"
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2.5">
                        <a
                          href={`mailto:${supportEmail}`}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-3.5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-all hover:bg-white"
                        >
                          <span className="inline-flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
                            <Mail className="h-4 w-4 shrink-0 text-slate-500" />
                            <span>{cms("footer.contact.label_email", "Email", "Email")}</span>
                          </span>
                          <span className="truncate text-right text-sm font-semibold text-slate-900">
                            {supportEmail}
                          </span>
                        </a>

                        <a
                          href={`tel:${supportPhoneTel}`}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-3.5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)] transition-all hover:bg-white"
                        >
                          <span className="inline-flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
                            <Phone className="h-4 w-4 shrink-0 text-slate-500" />
                            <span>{cms("footer.contact.label_phone", "Téléphone", "Phone")}</span>
                          </span>
                          <span className="truncate text-right text-sm font-semibold text-slate-900">
                            {supportPhoneValue}
                          </span>
                        </a>

                        <a
                          href={`https://wa.me/${supportWhatsappTel.replace(/[^\d]/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50 via-white to-emerald-50/60 px-3.5 py-3 shadow-[0_6px_18px_rgba(16,185,129,0.10)] transition-all hover:from-emerald-50 hover:to-emerald-50"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="inline-flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
                              <MessageCircle className="h-4 w-4 shrink-0 text-emerald-600" />
                              <span>{cms("footer.contact.label_whatsapp", "WhatsApp", "WhatsApp")}</span>
                            </span>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-emerald-700 shadow-sm">
                              {cms("footer.contact.available_badge", "Disponible", "Available")}
                            </span>
                            <span className="truncate text-right text-sm font-semibold text-slate-900">
                              {supportWhatsappValue}
                            </span>
                          </div>
                        </a>

                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white/90 px-3.5 py-3 shadow-[0_4px_16px_rgba(15,23,42,0.04)]">
                          <span className="inline-flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
                            <Clock className="h-4 w-4 shrink-0 text-slate-500" />
                            <span>{cms("footer.contact.label_hours", "Horaires", "Hours")}</span>
                          </span>
                          <span className="truncate text-right text-sm font-semibold text-slate-900">
                            {supportHoursValue}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Mobile : bouton d’ouverture du formulaire */}
                  <button
                    type="button"
                    onClick={() => setMobileFormOpen((v) => !v)}
                    className="mt-3 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-all hover:border-slate-300 hover:bg-slate-50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                        <FileText className="h-4 w-4" />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {cms("contact.form.mobile_toggle_title", "Formulaire", "Form")}
                        </div>
                        <div className="text-xs text-slate-500">
                          {cms(
                            "contact.form.mobile_toggle_desc",
                            "Appuyez pour afficher ou masquer le formulaire",
                            "Tap to show or hide the form"
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-slate-700">
                      {mobileFormOpen ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </button>

                  {mobileFormOpen && (
                    <div className="mt-3 rounded-3xl border border-slate-200 bg-slate-50/70 p-4 shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
                      <div className="grid gap-3">{formFields}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Desktop : formulaire affiché normalement */}
              <div className="hidden md:block">
                <div className="grid gap-3">{formFields}</div>
              </div>

              {cooldownRemaining > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
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
                <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-800">
                  <CheckCircle2 className="mt-0.5 h-5 w-5" />
                  <div className="text-sm">{ok}</div>
                </div>
              )}

              {err && (
                <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  <AlertTriangle className="mt-0.5 h-5 w-5" />
                  <div className="text-sm">{err}</div>
                </div>
              )}
            </div>
          </div>

          <div className="border-t border-slate-200/80 px-4 py-3 sm:px-6">
            <DialogFooter className="flex-col gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-xl sm:w-auto"
                onClick={() => onOpenChange(false)}
              >
                {cms("common.close", "Fermer", "Close")}
              </Button>

              <Button
                type="button"
                className="flex w-full items-center gap-2 rounded-xl bg-pro-blue hover:bg-pro-blue/90 sm:w-auto"
                onClick={handleSend}
                disabled={!canSend}
              >
                <Send className="h-4 w-4" />
                {sending
                  ? cms("common.sending", "Envoi...", "Sending...")
                  : cms("contact.form.btn_send", "Envoyer", "Send")}
              </Button>
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
