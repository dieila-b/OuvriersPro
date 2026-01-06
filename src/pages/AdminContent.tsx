// src/pages/AdminContent.tsx
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";

import {
  useUpsertSiteContent,
  useTogglePublishSiteContent,
  useDeleteSiteContent,
} from "@/hooks/useSiteContent";

import {
  Search,
  RefreshCw,
  Plus,
  Copy,
  CheckCircle2,
  EyeOff,
  Languages,
  AlertTriangle,
  Save,
  Trash2,
  Sparkles,
  RotateCcw,
  ListPlus,
  Bug,
  Database,
  ShieldAlert,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

type Locale = "fr" | "en";
type Category =
  | "Home"
  | "Header"
  | "Footer"
  | "Legal"
  | "Contact"
  | "Company"
  | "Services"
  | "Other";
type MissingMode = "all" | "en_missing" | "fr_missing" | "both_missing";

type SiteContentRow = {
  id: string;
  key: string;
  locale: Locale;
  type: string | null;
  value: string | null;
  is_published: boolean | null;
  updated_at?: string | null;
};

const LOCALES: Locale[] = ["fr", "en"];
const TYPES = ["text", "markdown", "json"] as const;

/**
 * Catalogue de clés attendues (tu peux en ajouter)
 */
const DEFAULT_KEYS: string[] = [
  "header.tagline",

  "home.hero.title",
  "home.hero.subtitle",
  "home.hero.cta_primary",
  "home.hero.cta_secondary",
  "home.search.title",
  "home.search.subtitle",
  "home.search.placeholder",
  "home.search.placeholder_keyword",
  "home.search.placeholder_district",
  "home.search.button",
  "home.search.btn_search",
  "home.features.title",
  "home.features.subtitle",
  "home.features.card1.title",
  "home.features.card1.desc",
  "home.features.card2.title",
  "home.features.card2.desc",
  "home.features.card3.title",
  "home.features.card3.desc",

  "footer.brand.tagline",
  "footer.brand.desc",
  "footer.services.title",
  "footer.services.more",
  "footer.company.title",
  "footer.resources.title",
  "footer.contact.title",
  "footer.contact.cta",
  "footer.contact.button",
  "footer.contact_hint",
  "footer.contact.label_email",
  "footer.contact.label_phone",
  "footer.contact.label_hours",
  "footer.contact.label_zone",
  "footer.location.value",
  "footer.hours.value",
  "footer.bottom.rights",

  "contact.modal.title",
  "contact.modal.desc",
  "contact.form.email",
  "contact.form.subject",
  "contact.form.message",
  "contact.form.btn_send",
  "contact.form.success",
  "contact.form.error",

  "legal.terms.title",
  "legal.privacy.title",
  "legal.cookies.title",
  "legal.terms.body",
  "legal.privacy.body",
  "legal.cookies.body",

  "company.about.title",
  "company.about.body",
  "company.partners.title",
  "company.partners.body",
];

function detectCategory(key: string): Category {
  if (key.startsWith("home.")) return "Home";
  if (key.startsWith("header.")) return "Header";
  if (key.startsWith("footer.")) return "Footer";
  if (key.startsWith("legal.")) return "Legal";
  if (key.startsWith("contact.")) return "Contact";
  if (key.startsWith("company.")) return "Company";
  if (key.startsWith("services.")) return "Services";
  return "Other";
}

function missingLabel(mode: MissingMode) {
  switch (mode) {
    case "en_missing":
      return "EN manquants";
    case "fr_missing":
      return "FR manquants";
    case "both_missing":
      return "FR+EN absents";
    default:
      return "Tous";
  }
}

function badgeStatus(published: boolean) {
  return published
    ? "border-emerald-200 text-emerald-700 bg-emerald-50"
    : "border-amber-200 text-amber-700 bg-amber-50";
}

async function translateViaEdgeFn(args: {
  text: string;
  source: Locale;
  target: Locale;
  type?: string;
  mode?: "draft" | "final";
}) {
  const { data, error } = await supabase.functions.invoke("translate", {
    body: {
      text: args.text,
      source: args.source,
      target: args.target,
      type: args.type ?? "text",
      mode: args.mode ?? "draft",
    },
  });
  if (error) throw error;

  const translated =
    (data as any)?.translatedText ??
    (data as any)?.translated_text ??
    (data as any)?.text ??
    (data as any)?.translation ??
    "";

  return typeof translated === "string" ? translated : "";
}

function ensureToReviewNote(text: string, locale: Locale) {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return locale === "en" ? "[To review]" : "[À valider]";

  const lower = trimmed.toLowerCase();
  const hasEn = lower.startsWith("[to review]");
  const hasFr =
    lower.startsWith("[à valider]") || lower.startsWith("[a valider]");

  if (locale === "en") return hasEn ? trimmed : `[To review]\n${trimmed}`;
  return hasFr ? trimmed : `[À valider]\n${trimmed}`;
}

type Draft = {
  type: string;
  value: string;
  is_published: boolean;
};

type DraftState = Record<string, Record<Locale, Draft>>; // key -> locale -> draft

function draftKey(k: string, loc: Locale) {
  return `${k}__${loc}`;
}

export default function AdminContent() {
  const { toast } = useToast();

  const upsert = useUpsertSiteContent();
  const togglePublish = useTogglePublishSiteContent();
  const del = useDeleteSiteContent();

  // ✅ LISTE DIRECTE
  const list = useQuery({
    queryKey: ["site_content_list_direct_modern"],
    queryFn: async (): Promise<SiteContentRow[]> => {
      const { data, error } = await supabase
        .from("site_content")
        .select("id,key,locale,type,value,is_published,updated_at")
        .order("key", { ascending: true })
        .order("locale", { ascending: true });

      if (error) throw error;
      return (data ?? []) as SiteContentRow[];
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  // ✅ DIAGNOSTIC
  const [diag, setDiag] = React.useState<{
    supabaseUrl: string;
    hasSession: boolean;
    email: string;
    userId: string;
    selectOk: boolean;
    selectErr: string;
  }>({
    supabaseUrl:
      (supabase as any)?.supabaseUrl ??
      (supabase as any)?.url ??
      (supabase as any)?.restUrl ??
      "",
    hasSession: false,
    email: "",
    userId: "",
    selectOk: false,
    selectErr: "",
  });

  const runDiag = React.useCallback(async () => {
    try {
      const { data: sessionData, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;

      const session = sessionData?.session ?? null;
      const user = session?.user ?? null;

      const { error } = await supabase
        .from("site_content")
        .select("id", { count: "exact" })
        .limit(1);

      setDiag((prev) => ({
        ...prev,
        hasSession: Boolean(session),
        email: (user as any)?.email ?? "",
        userId: user?.id ?? "",
        selectOk: !error,
        selectErr: error ? ((error as any)?.message ?? JSON.stringify(error)) : "",
      }));
    } catch (e: any) {
      setDiag((prev) => ({
        ...prev,
        selectOk: false,
        selectErr: e?.message ?? "Diagnostic impossible",
      }));
    }
  }, []);

  React.useEffect(() => {
    runDiag();
  }, [runDiag]);

  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<Category | "All">("All");
  const [missingMode, setMissingMode] = React.useState<MissingMode>("all");

  // Sections ouvertes (UX CMS)
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>({
    Header: true,
    Home: true,
    Footer: true,
    Company: true,
    Services: true,
    Contact: true,
    Legal: true,
    Other: false,
  });

  // Drafts locaux = édition immédiate, sans panneau à droite
  const [drafts, setDrafts] = React.useState<DraftState>({});

  const rows = list.data ?? [];
  const isBusy =
    list.isLoading ||
    upsert.isPending ||
    togglePublish.isPending ||
    del.isPending;

  const byKey = React.useMemo(() => {
    const map = new Map<string, SiteContentRow[]>();
    for (const r of rows) {
      if (!map.has(r.key)) map.set(r.key, []);
      map.get(r.key)!.push(r);
    }
    return map;
  }, [rows]);

  const allKeys = React.useMemo(() => {
    const set = new Set<string>();
    for (const k of DEFAULT_KEYS) set.add(k);
    for (const k of byKey.keys()) set.add(k);
    return Array.from(set).sort();
  }, [byKey]);

  const getRow = React.useCallback(
    (key: string, locale: Locale): SiteContentRow | null => {
      const arr = byKey.get(key) ?? [];
      return arr.find((r) => r.locale === locale) ?? null;
    },
    [byKey]
  );

  const initDraftForKey = React.useCallback(
    (key: string) => {
      setDrafts((prev) => {
        if (prev[key]) return prev;

        const fr = getRow(key, "fr");
        const en = getRow(key, "en");

        const baseType = (fr?.type ?? en?.type ?? "text").toString();

        return {
          ...prev,
          [key]: {
            fr: {
              type: (fr?.type ?? baseType).toString(),
              value: (fr?.value ?? "").toString(),
              is_published: Boolean(fr?.is_published),
            },
            en: {
              type: (en?.type ?? baseType).toString(),
              value: (en?.value ?? "").toString(),
              is_published: Boolean(en?.is_published),
            },
          },
        };
      });
    },
    [getRow]
  );

  // Initialise les drafts à partir des données
  React.useEffect(() => {
    if (!rows.length) return;
    // On ne force pas tout, seulement les clés visibles via interaction,
    // mais on peut précharger les clés filtrées (plus simple).
    // Ici on laisse lazy: initDraftForKey sera appelé au rendu des cartes.
  }, [rows]);

  const missingEn = React.useMemo(
    () => allKeys.filter((k) => getRow(k, "fr") && !getRow(k, "en")).length,
    [allKeys, getRow]
  );
  const missingFr = React.useMemo(
    () => allKeys.filter((k) => getRow(k, "en") && !getRow(k, "fr")).length,
    [allKeys, getRow]
  );
  const missingBoth = React.useMemo(
    () => allKeys.filter((k) => !getRow(k, "fr") && !getRow(k, "en")).length,
    [allKeys, getRow]
  );

  const filteredKeys = React.useMemo(() => {
    let keys = allKeys;

    if (category !== "All") keys = keys.filter((k) => detectCategory(k) === category);

    if (missingMode === "en_missing") keys = keys.filter((k) => getRow(k, "fr") && !getRow(k, "en"));
    else if (missingMode === "fr_missing") keys = keys.filter((k) => getRow(k, "en") && !getRow(k, "fr"));
    else if (missingMode === "both_missing") keys = keys.filter((k) => !getRow(k, "fr") && !getRow(k, "en"));

    const query = q.trim().toLowerCase();
    if (!query) return keys;

    return keys.filter((k) => {
      if (k.toLowerCase().includes(query)) return true;
      const fr = getRow(k, "fr");
      const en = getRow(k, "en");
      return (
        (fr?.value ?? "").toLowerCase().includes(query) ||
        (en?.value ?? "").toLowerCase().includes(query)
      );
    });
  }, [allKeys, q, category, missingMode, getRow]);

  const keysByCategory = React.useMemo(() => {
    const result: Record<Category, string[]> = {
      Header: [],
      Home: [],
      Footer: [],
      Company: [],
      Services: [],
      Contact: [],
      Legal: [],
      Other: [],
    };
    for (const k of filteredKeys) {
      result[detectCategory(k)].push(k);
    }
    return result;
  }, [filteredKeys]);

  const resetFilters = () => {
    setQ("");
    setCategory("All");
    setMissingMode("all");
  };

  const createKey = () => {
    const k = prompt("Nouvelle clé (ex: home.hero.title) :");
    if (!k) return;
    const key = k.trim();
    if (!key) return;

    initDraftForKey(key);
    toast({
      title: "Clé prête",
      description: `La clé "${key}" est prête. Renseigne FR/EN puis enregistre.`,
    });
  };

  const createMissingLocale = async (key: string, locale: Locale) => {
    try {
      initDraftForKey(key);
      const d = drafts[key]?.[locale];
      await upsert.mutateAsync({
        key,
        locale,
        type: d?.type ?? "text",
        value: d?.value ?? "",
        is_published: false,
      });
      toast({
        title: "Créé",
        description: `${key} (${locale.toUpperCase()}) créé en brouillon.`,
      });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Création impossible.",
        variant: "destructive",
      });
    }
  };

  const saveLocale = async (key: string, locale: Locale) => {
    try {
      initDraftForKey(key);
      const d = drafts[key]?.[locale];
      await upsert.mutateAsync({
        key,
        locale,
        type: d?.type ?? "text",
        value: d?.value ?? "",
        is_published: Boolean(d?.is_published),
      });
      toast({
        title: "Enregistré",
        description: `${key} (${locale.toUpperCase()}) mis à jour.`,
      });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Enregistrement impossible.",
        variant: "destructive",
      });
    }
  };

  const copyLocaleToLocale = async (key: string, from: Locale, to: Locale) => {
    try {
      initDraftForKey(key);
      const fromRow = getRow(key, from);
      const srcType =
        drafts[key]?.[from]?.type ?? fromRow?.type ?? "text";
      const srcValue =
        drafts[key]?.[from]?.value ?? fromRow?.value ?? "";
      const srcPub =
        Boolean(drafts[key]?.[from]?.is_published ?? fromRow?.is_published ?? false);

      setDrafts((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [to]: {
            type: srcType.toString(),
            value: srcValue.toString(),
            is_published: srcPub,
          },
        },
      }));

      await upsert.mutateAsync({
        key,
        locale: to,
        type: srcType.toString(),
        value: srcValue.toString(),
        is_published: srcPub,
      });

      toast({
        title: "Copie effectuée",
        description: `${from.toUpperCase()} → ${to.toUpperCase()} enregistré.`,
      });

      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Copie impossible.",
        variant: "destructive",
      });
    }
  };

  const translateEditor = async (key: string, from: Locale, to: Locale) => {
    try {
      initDraftForKey(key);
      const fromRow = getRow(key, from);

      const srcType =
        (drafts[key]?.[from]?.type ?? fromRow?.type ?? "text").toString();
      const srcValue =
        (drafts[key]?.[from]?.value ?? fromRow?.value ?? "").toString();

      if (!srcValue.trim()) {
        toast({
          title: "Impossible",
          description: `Le contenu ${from.toUpperCase()} est vide.`,
          variant: "destructive",
        });
        return;
      }

      const translated = await translateViaEdgeFn({
        text: srcValue,
        source: from,
        target: to,
        type: srcType,
        mode: "draft",
      });

      const finalText = ensureToReviewNote(translated, to);

      setDrafts((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [to]: {
            type: srcType,
            value: finalText,
            is_published: false,
          },
        },
      }));

      toast({
        title: "Traduction prête",
        description: `Traduction ${from.toUpperCase()}→${to.toUpperCase()} générée. Vérifie puis enregistre.`,
      });
    } catch (e: any) {
      toast({
        title: "Erreur traduction",
        description: e?.message ?? "Traduction impossible.",
        variant: "destructive",
      });
    }
  };

  const setPublishLocale = async (key: string, locale: Locale, next: boolean) => {
    const row = getRow(key, locale);

    if (next) {
      const val = (drafts[key]?.[locale]?.value ?? row?.value ?? "").trim();
      if (!val) {
        toast({
          title: "Publication impossible",
          description: `${locale.toUpperCase()} doit être non vide pour publier.`,
          variant: "destructive",
        });
        return;
      }
    }

    try {
      // Si la row existe: toggle, sinon: upsert direct
      if (row) {
        await togglePublish.mutateAsync({ id: row.id, is_published: next });
      } else {
        initDraftForKey(key);
        const d = drafts[key]?.[locale];
        await upsert.mutateAsync({
          key,
          locale,
          type: d?.type ?? "text",
          value: d?.value ?? "",
          is_published: next,
        });
      }

      setDrafts((prev) => ({
        ...prev,
        [key]: {
          ...prev[key],
          [locale]: {
            ...(prev[key]?.[locale] ?? { type: "text", value: "", is_published: false }),
            is_published: next,
          },
        },
      }));

      toast({
        title: next ? "Publié" : "Dépublié",
        description: `${key} (${locale.toUpperCase()}) mis à jour.`,
      });

      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Mise à jour du statut impossible.",
        variant: "destructive",
      });
    }
  };

  const deleteLocale = async (key: string, locale: Locale) => {
    const row = getRow(key, locale);
    if (!row) {
      toast({
        title: "Rien à supprimer",
        description: `${key} (${locale.toUpperCase()}) n'existe pas en base.`,
      });
      return;
    }

    const ok = window.confirm(
      `Supprimer ${key} (${locale.toUpperCase()}) ?\n\nCette action est irréversible.`
    );
    if (!ok) return;

    try {
      await del.mutateAsync({ id: row.id });

      // nettoie draft local
      setDrafts((prev) => {
        const next = { ...prev };
        if (!next[key]) return next;
        next[key] = {
          ...next[key],
          [locale]: {
            ...next[key][locale],
            value: "",
            is_published: false,
          },
        };
        return next;
      });

      toast({
        title: "Supprimé",
        description: `${key} (${locale.toUpperCase()}) supprimé.`,
      });

      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Suppression impossible.",
        variant: "destructive",
      });
    }
  };

  const seedMissingDefaults = async () => {
    if (isBusy) return;

    const ok = window.confirm(
      "Initialiser les clés manquantes (DEFAULT_KEYS) en FR+EN ?\n\n- crée les lignes absentes\n- en brouillon\n- sans écraser ce qui existe"
    );
    if (!ok) return;

    try {
      let created = 0;
      for (const k of DEFAULT_KEYS) {
        for (const loc of LOCALES) {
          const existing = getRow(k, loc);
          if (existing) continue;
          await upsert.mutateAsync({
            key: k,
            locale: loc,
            type: "text",
            value: "",
            is_published: false,
          });
          created += 1;
        }
      }
      toast({
        title: "Initialisation terminée",
        description: created > 0 ? `${created} entrée(s) créée(s).` : "Aucune entrée à créer.",
      });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Initialisation impossible.",
        variant: "destructive",
      });
    }
  };

  const toggleSection = (name: string) => {
    setOpenSections((s) => ({ ...s, [name]: !s[name] }));
  };

  const SectionHeader = ({ name, count }: { name: string; count: number }) => {
    const open = Boolean(openSections[name]);
    return (
      <button
        type="button"
        onClick={() => toggleSection(name)}
        className="w-full flex items-center justify-between rounded-xl border bg-background px-4 py-3 hover:bg-muted/20"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <div className="text-sm font-semibold">{name}</div>
          <span className="text-xs rounded-full border px-2 py-0.5 text-muted-foreground">
            {count} élément(s)
          </span>
        </div>
        <div className="text-xs text-muted-foreground">
          Édition FR/EN en ligne
        </div>
      </button>
    );
  };

  const ContentCard = ({ k }: { k: string }) => {
    const fr = getRow(k, "fr");
    const en = getRow(k, "en");

    // lazy init drafts
    React.useEffect(() => {
      initDraftForKey(k);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [k]);

    const dfr = drafts[k]?.fr;
    const den = drafts[k]?.en;

    const frStatus = fr ? Boolean(fr.is_published) : Boolean(dfr?.is_published);
    const enStatus = en ? Boolean(en.is_published) : Boolean(den?.is_published);

    const frMissing = !fr;
    const enMissing = !en;

    const cat = detectCategory(k);

    return (
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="font-semibold text-sm break-all">{k}</div>
                <span className="inline-flex rounded-full border px-2 py-0.5 text-xs">
                  {cat}
                </span>

                {frMissing && enMissing ? (
                  <span className="inline-flex items-center gap-1 text-xs rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                    <AlertTriangle className="h-3 w-3" />
                    Absent FR+EN
                  </span>
                ) : (
                  <>
                    {frMissing ? (
                      <span className="inline-flex items-center gap-1 text-xs rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        FR manquant
                      </span>
                    ) : null}
                    {enMissing ? (
                      <span className="inline-flex items-center gap-1 text-xs rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-amber-700">
                        <AlertTriangle className="h-3 w-3" />
                        EN manquant
                      </span>
                    ) : null}
                  </>
                )}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Modifie directement FR et EN ci-dessous (style CMS).
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyLocaleToLocale(k, "fr", "en")}
                disabled={isBusy}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copier FR→EN
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyLocaleToLocale(k, "en", "fr")}
                disabled={isBusy}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copier EN→FR
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => translateEditor(k, "fr", "en")}
                disabled={isBusy}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Traduire FR→EN
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => translateEditor(k, "en", "fr")}
                disabled={isBusy}
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Traduire EN→FR
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* FR */}
            <div className="rounded-2xl border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">FR</span>
                  {fr ? (
                    <span
                      className={[
                        "inline-flex text-[11px] px-2 py-0.5 rounded-full border",
                        badgeStatus(frStatus),
                      ].join(" ")}
                    >
                      {frStatus ? "Publié" : "Brouillon"}
                    </span>
                  ) : (
                    <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                      Absent
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!fr && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => createMissingLocale(k, "fr")}
                      disabled={isBusy}
                    >
                      <Languages className="h-4 w-4 mr-2" />
                      Créer FR
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPublishLocale(k, "fr", true)}
                    disabled={isBusy}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Publier
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPublishLocale(k, "fr", false)}
                    disabled={isBusy}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Dépublier
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Type (FR)</label>
                  <select
                    value={(dfr?.type ?? fr?.type ?? "text").toString()}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [k]: {
                          ...prev[k],
                          fr: {
                            ...(prev[k]?.fr ?? { type: "text", value: "", is_published: false }),
                            type: e.target.value,
                          },
                        },
                      }))
                    }
                    disabled={isBusy}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    className="w-full rounded-xl"
                    onClick={() => saveLocale(k, "fr")}
                    disabled={isBusy}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer FR
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground">Contenu (FR)</label>
                <Textarea
                  value={(dfr?.value ?? fr?.value ?? "").toString()}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [k]: {
                        ...prev[k],
                        fr: {
                          ...(prev[k]?.fr ?? { type: "text", value: "", is_published: false }),
                          value: e.target.value,
                        },
                      },
                    }))
                  }
                  rows={10}
                  placeholder="Saisissez le contenu FR…"
                  disabled={isBusy}
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLocale(k, "fr")}
                  disabled={isBusy}
                  className="rounded-xl"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer FR
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDrafts((prev) => ({
                      ...prev,
                      [k]: {
                        ...prev[k],
                        fr: {
                          ...(prev[k]?.fr ?? { type: "text", value: "", is_published: false }),
                          is_published: true,
                        },
                      },
                    }))
                  }
                  disabled={isBusy}
                  className="rounded-xl"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marquer “Publié” (draft)
                </Button>
              </div>
            </div>

            {/* EN */}
            <div className="rounded-2xl border p-3 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold">EN</span>
                  {en ? (
                    <span
                      className={[
                        "inline-flex text-[11px] px-2 py-0.5 rounded-full border",
                        badgeStatus(enStatus),
                      ].join(" ")}
                    >
                      {enStatus ? "Publié" : "Brouillon"}
                    </span>
                  ) : (
                    <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                      Absent
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!en && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => createMissingLocale(k, "en")}
                      disabled={isBusy}
                    >
                      <Languages className="h-4 w-4 mr-2" />
                      Créer EN
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPublishLocale(k, "en", true)}
                    disabled={isBusy}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Publier
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setPublishLocale(k, "en", false)}
                    disabled={isBusy}
                  >
                    <EyeOff className="h-4 w-4 mr-2" />
                    Dépublier
                  </Button>
                </div>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Type (EN)</label>
                  <select
                    value={(den?.type ?? en?.type ?? "text").toString()}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [k]: {
                          ...prev[k],
                          en: {
                            ...(prev[k]?.en ?? { type: "text", value: "", is_published: false }),
                            type: e.target.value,
                          },
                        },
                      }))
                    }
                    disabled={isBusy}
                    className="mt-2 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  >
                    {TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end gap-2">
                  <Button
                    type="button"
                    className="w-full rounded-xl"
                    onClick={() => saveLocale(k, "en")}
                    disabled={isBusy}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer EN
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground">Contenu (EN)</label>
                <Textarea
                  value={(den?.value ?? en?.value ?? "").toString()}
                  onChange={(e) =>
                    setDrafts((prev) => ({
                      ...prev,
                      [k]: {
                        ...prev[k],
                        en: {
                          ...(prev[k]?.en ?? { type: "text", value: "", is_published: false }),
                          value: e.target.value,
                        },
                      },
                    }))
                  }
                  rows={10}
                  placeholder="Enter EN content…"
                  disabled={isBusy}
                />
              </div>

              <div className="flex items-center justify-between">
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteLocale(k, "en")}
                  disabled={isBusy}
                  className="rounded-xl"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer EN
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setDrafts((prev) => ({
                      ...prev,
                      [k]: {
                        ...prev[k],
                        en: {
                          ...(prev[k]?.en ?? { type: "text", value: "", is_published: false }),
                          is_published: true,
                        },
                      },
                    }))
                  }
                  disabled={isBusy}
                  className="rounded-xl"
                >
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Marquer “Publié” (draft)
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const categoryOrder: (Category | "All")[] = [
    "All",
    "Header",
    "Home",
    "Footer",
    "Company",
    "Services",
    "Contact",
    "Legal",
    "Other",
  ];

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* ✅ Bandeau diagnostic */}
      <Card className="border-dashed">
        <CardContent className="p-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            <span className="font-medium">Diagnostic</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground break-all font-mono">
              {diag.supabaseUrl || "Supabase URL inconnue"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm">
            {diag.hasSession ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> Session OK
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-700">
                <ShieldAlert className="h-4 w-4" /> Pas de session
              </span>
            )}

            {diag.selectOk ? (
              <span className="inline-flex items-center gap-1 text-emerald-700">
                <CheckCircle2 className="h-4 w-4" /> SELECT OK
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-rose-700">
                <ShieldAlert className="h-4 w-4" /> SELECT bloqué
              </span>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                runDiag();
                list.refetch();
              }}
              disabled={isBusy}
            >
              <Bug className="h-4 w-4 mr-2" />
              Rafraîchir diag
            </Button>
          </div>

          {!diag.selectOk && diag.selectErr ? (
            <div className="mt-2 w-full rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              {diag.selectErr}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ✅ Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Back-Office — Contenu du site (mode CMS)</h1>
          <p className="text-sm text-muted-foreground">
            Tout le contenu est visible par sections et éditable directement (FR + EN côte à côte).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => list.refetch()}
            disabled={isBusy}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={resetFilters}
            disabled={isBusy}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>

          <Button type="button" onClick={createKey} disabled={isBusy}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle clé
          </Button>

          <Button
            type="button"
            variant="outline"
            onClick={seedMissingDefaults}
            disabled={isBusy}
          >
            <ListPlus className="h-4 w-4 mr-2" />
            Initialiser clés manquantes
          </Button>
        </div>
      </div>

      {/* ✅ Barre de recherche/filtre */}
      <Card>
        <CardContent className="p-4 md:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex-1 min-w-0">
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Rechercher (clé ou contenu FR/EN)…"
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={isBusy}
              >
                {categoryOrder.map((c) => (
                  <option key={c} value={c}>
                    {c === "All" ? "Toutes catégories" : c}
                  </option>
                ))}
              </select>

              <select
                value={missingMode}
                onChange={(e) => setMissingMode(e.target.value as MissingMode)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={isBusy}
              >
                <option value="all">{missingLabel("all")}</option>
                <option value="en_missing">
                  {missingLabel("en_missing")} ({missingEn})
                </option>
                <option value="fr_missing">
                  {missingLabel("fr_missing")} ({missingFr})
                </option>
                <option value="both_missing">
                  {missingLabel("both_missing")} ({missingBoth})
                </option>
              </select>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            {list.isLoading
              ? "Chargement…"
              : `${filteredKeys.length} clé(s) — DB rows: ${rows.length}`}
          </div>

          {list.isError ? (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              {(list.error as any)?.message ?? "Erreur de chargement"}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* ✅ Affichage CMS par sections */}
      <div className="space-y-3">
        {(category === "All"
          ? ([
              "Header",
              "Home",
              "Footer",
              "Company",
              "Services",
              "Contact",
              "Legal",
              "Other",
            ] as Category[])
          : ([category] as Category[])
        ).map((sec) => {
          const items = keysByCategory[sec] ?? [];
          if (!items.length) return null;

          const open = Boolean(openSections[sec]);

          return (
            <div key={sec} className="space-y-3">
              <SectionHeader name={sec} count={items.length} />
              {open ? (
                <div className="space-y-4">
                  {items.map((k) => (
                    <ContentCard key={k} k={k} />
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
