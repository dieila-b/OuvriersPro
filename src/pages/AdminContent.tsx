// src/pages/AdminContent.tsx
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

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

function badgeDot(ok: boolean) {
  return ok ? "bg-emerald-500" : "bg-amber-500";
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

function prettyJson(value: string) {
  try {
    const obj = JSON.parse(value);
    return JSON.stringify(obj, null, 2);
  } catch {
    return value;
  }
}

export default function AdminContent() {
  const { toast } = useToast();

  const upsert = useUpsertSiteContent();
  const togglePublish = useTogglePublishSiteContent();
  const del = useDeleteSiteContent();

  const list = useQuery({
    queryKey: ["site_content_list_modern_nav"],
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

  const [diag, setDiag] = React.useState<{
    supabaseUrl: string;
    hasSession: boolean;
    selectOk: boolean;
    selectErr: string;
  }>({
    supabaseUrl:
      (supabase as any)?.supabaseUrl ??
      (supabase as any)?.url ??
      (supabase as any)?.restUrl ??
      "",
    hasSession: false,
    selectOk: false,
    selectErr: "",
  });

  const runDiag = React.useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const session = sessionData?.session ?? null;

      const { error } = await supabase.from("site_content").select("id").limit(1);

      setDiag((prev) => ({
        ...prev,
        hasSession: Boolean(session),
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

  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<Category | "All">("All");
  const [missingMode, setMissingMode] = React.useState<MissingMode>("all");

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

  const categories: Category[] = [
    "Header",
    "Home",
    "Company",
    "Services",
    "Contact",
    "Legal",
    "Footer",
    "Other",
  ];

  const keysByCategory = React.useMemo(() => {
    const res: Record<Category, string[]> = {
      Header: [],
      Home: [],
      Company: [],
      Services: [],
      Contact: [],
      Legal: [],
      Footer: [],
      Other: [],
    };
    for (const k of filteredKeys) res[detectCategory(k)].push(k);
    return res;
  }, [filteredKeys]);

  // Selection (navigation)
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!selectedKey && filteredKeys.length) setSelectedKey(filteredKeys[0]);
  }, [filteredKeys, selectedKey]);

  // Draft editor
  const [activeLocale, setActiveLocale] = React.useState<Locale>("fr");
  const [draftType, setDraftType] = React.useState<string>("text");
  const [draftValue, setDraftValue] = React.useState<string>("");
  const [draftPublished, setDraftPublished] = React.useState<boolean>(false);

  // Load selection into editor
  React.useEffect(() => {
    if (!selectedKey) return;
    const row = getRow(selectedKey, activeLocale);
    const fallback = getRow(selectedKey, activeLocale === "fr" ? "en" : "fr");

    const type = (row?.type ?? fallback?.type ?? "text").toString();
    const value = (row?.value ?? "").toString();
    const pub = Boolean(row?.is_published);

    setDraftType(type);
    setDraftValue(value);
    setDraftPublished(pub);

    // si locale manquante, bascule automatiquement sur l'autre si elle existe
    if (!row && fallback) {
      const other: Locale = activeLocale === "fr" ? "en" : "fr";
      setActiveLocale(other);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedKey]);

  // Reload when locale changes
  React.useEffect(() => {
    if (!selectedKey) return;
    const row = getRow(selectedKey, activeLocale);
    const fallback = getRow(selectedKey, activeLocale === "fr" ? "en" : "fr");
    setDraftType((row?.type ?? fallback?.type ?? "text").toString());
    setDraftValue((row?.value ?? "").toString());
    setDraftPublished(Boolean(row?.is_published));
  }, [activeLocale, selectedKey, getRow]);

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
    setSelectedKey(key);
    setActiveLocale("fr");
    setDraftType("text");
    setDraftValue("");
    setDraftPublished(false);
    toast({
      title: "Clé prête",
      description: `Renseigne le contenu puis enregistre.`,
    });
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
          await upsert.mutateAsync({ key: k, locale: loc, type: "text", value: "", is_published: false });
          created += 1;
        }
      }
      toast({
        title: "Initialisation terminée",
        description: created ? `${created} entrée(s) créée(s).` : "Rien à créer.",
      });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Initialisation impossible.", variant: "destructive" });
    }
  };

  const saveActive = async () => {
    if (!selectedKey) return;
    try {
      await upsert.mutateAsync({
        key: selectedKey,
        locale: activeLocale,
        type: draftType,
        value: draftValue,
        is_published: Boolean(draftPublished),
      });
      toast({ title: "Enregistré", description: `${selectedKey} (${activeLocale.toUpperCase()}) mis à jour.` });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Enregistrement impossible.", variant: "destructive" });
    }
  };

  const createMissingLocale = async (loc: Locale) => {
    if (!selectedKey) return;
    try {
      await upsert.mutateAsync({
        key: selectedKey,
        locale: loc,
        type: draftType || "text",
        value: "",
        is_published: false,
      });
      toast({ title: "Créé", description: `${selectedKey} (${loc.toUpperCase()}) créé.` });
      await list.refetch();
      await runDiag();
      setActiveLocale(loc);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Création impossible.", variant: "destructive" });
    }
  };

  const togglePublishActive = async (next: boolean) => {
    if (!selectedKey) return;
    const row = getRow(selectedKey, activeLocale);

    if (next && !draftValue.trim()) {
      toast({
        title: "Publication impossible",
        description: `${activeLocale.toUpperCase()} doit être non vide.`,
        variant: "destructive",
      });
      return;
    }

    try {
      if (row) {
        await togglePublish.mutateAsync({ id: row.id, is_published: next });
      } else {
        await upsert.mutateAsync({
          key: selectedKey,
          locale: activeLocale,
          type: draftType,
          value: draftValue,
          is_published: next,
        });
      }
      setDraftPublished(next);
      toast({ title: next ? "Publié" : "Dépublié", description: `${selectedKey} (${activeLocale.toUpperCase()})` });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Action impossible.", variant: "destructive" });
    }
  };

  const deleteActive = async () => {
    if (!selectedKey) return;
    const row = getRow(selectedKey, activeLocale);
    if (!row) {
      toast({ title: "Rien à supprimer", description: `Locale inexistante en base.` });
      return;
    }
    const ok = window.confirm(`Supprimer ${selectedKey} (${activeLocale.toUpperCase()}) ?\n\nIrréversible.`);
    if (!ok) return;

    try {
      await del.mutateAsync({ id: row.id });
      toast({ title: "Supprimé", description: `${selectedKey} (${activeLocale.toUpperCase()}) supprimé.` });
      await list.refetch();
      await runDiag();
      setDraftValue("");
      setDraftPublished(false);
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Suppression impossible.", variant: "destructive" });
    }
  };

  const copyFromOtherLocale = async () => {
    if (!selectedKey) return;
    const from: Locale = activeLocale === "fr" ? "en" : "fr";
    const fromRow = getRow(selectedKey, from);
    const srcType = (fromRow?.type ?? "text").toString();
    const srcValue = (fromRow?.value ?? "").toString();
    const srcPub = Boolean(fromRow?.is_published);

    if (!fromRow) {
      toast({ title: "Copie impossible", description: `${from.toUpperCase()} est absent.`, variant: "destructive" });
      return;
    }

    setDraftType(srcType);
    setDraftValue(srcValue);
    setDraftPublished(srcPub);

    try {
      await upsert.mutateAsync({
        key: selectedKey,
        locale: activeLocale,
        type: srcType,
        value: srcValue,
        is_published: srcPub,
      });
      toast({ title: "Copié", description: `${from.toUpperCase()} → ${activeLocale.toUpperCase()} enregistré.` });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Copie impossible.", variant: "destructive" });
    }
  };

  const translateFromOtherLocale = async () => {
    if (!selectedKey) return;
    const from: Locale = activeLocale === "fr" ? "en" : "fr";
    const fromRow = getRow(selectedKey, from);
    const srcType = (fromRow?.type ?? "text").toString();
    const srcValue = (fromRow?.value ?? "").toString();

    if (!srcValue.trim()) {
      toast({ title: "Traduction impossible", description: `${from.toUpperCase()} est vide/absent.`, variant: "destructive" });
      return;
    }

    try {
      const translated = await translateViaEdgeFn({
        text: srcValue,
        source: from,
        target: activeLocale,
        type: srcType,
        mode: "draft",
      });
      setDraftType(srcType);
      setDraftValue(ensureToReviewNote(translated, activeLocale));
      setDraftPublished(false);

      toast({ title: "Traduction prête", description: `Vérifie puis enregistre.` });
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Traduction impossible.", variant: "destructive" });
    }
  };

  const selectedFr = selectedKey ? getRow(selectedKey, "fr") : null;
  const selectedEn = selectedKey ? getRow(selectedKey, "en") : null;

  const previewValue = React.useMemo(() => {
    if (draftType === "json") return prettyJson(draftValue);
    return draftValue;
  }, [draftType, draftValue]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Top diagnostic (compact) */}
      <Card className="border-dashed">
        <CardContent className="p-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Database className="h-4 w-4" />
            <span className="font-medium">Diagnostic</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-xs text-muted-foreground break-all font-mono">
              {diag.supabaseUrl || "Supabase URL inconnue"}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${badgeDot(diag.hasSession)}`} />
              Session
            </span>
            <span className="inline-flex items-center gap-2">
              <span className={`h-2 w-2 rounded-full ${badgeDot(diag.selectOk)}`} />
              SELECT
            </span>

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
              Rafraîchir
            </Button>
          </div>

          {!diag.selectOk && diag.selectErr ? (
            <div className="w-full mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              {diag.selectErr}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Title + actions */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contenu du site</h1>
          <p className="text-sm text-muted-foreground">
            Navigation à gauche, édition au centre, aperçu à droite (style CMS moderne).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => list.refetch()} disabled={isBusy}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button type="button" variant="outline" onClick={resetFilters} disabled={isBusy}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Réinitialiser
          </Button>
          <Button type="button" onClick={createKey} disabled={isBusy}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle clé
          </Button>
          <Button type="button" variant="outline" onClick={seedMissingDefaults} disabled={isBusy}>
            <ListPlus className="h-4 w-4 mr-2" />
            Initialiser clés
          </Button>
        </div>
      </div>

      {/* Main layout: sidebar / editor / preview */}
      <div className="grid gap-4 lg:grid-cols-[340px_1fr_420px]">
        {/* Sidebar */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher…"
                className="pl-9"
              />
            </div>

            <div className="grid gap-2 grid-cols-2">
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={isBusy}
              >
                <option value="All">Toutes</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
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
                <option value="en_missing">{missingLabel("en_missing")} ({missingEn})</option>
                <option value="fr_missing">{missingLabel("fr_missing")} ({missingFr})</option>
                <option value="both_missing">{missingLabel("both_missing")} ({missingBoth})</option>
              </select>
            </div>

            <div className="text-xs text-muted-foreground">
              {list.isLoading ? "Chargement…" : `${filteredKeys.length} clé(s)`}
            </div>

            <div className="h-[62vh] overflow-auto rounded-xl border">
              {((category === "All" ? categories : [category]) as Category[]).map((cat) => {
                const items = keysByCategory[cat] ?? [];
                if (!items.length) return null;

                return (
                  <div key={cat} className="border-b last:border-b-0">
                    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground bg-muted/20">
                      {cat} <span className="font-normal">({items.length})</span>
                    </div>

                    <div className="p-1">
                      {items.map((k) => {
                        const fr = getRow(k, "fr");
                        const en = getRow(k, "en");
                        const ok = Boolean(fr?.value?.trim()) && Boolean(en?.value?.trim());

                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setSelectedKey(k)}
                            className={[
                              "w-full text-left px-3 py-2 rounded-lg flex items-start gap-2",
                              selectedKey === k ? "bg-muted" : "hover:bg-muted/30",
                            ].join(" ")}
                          >
                            <span className={`mt-1 h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-amber-500"}`} />
                            <span className="min-w-0">
                              <div className="text-sm font-medium truncate">{k}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {fr ? "FR" : "FR absent"} • {en ? "EN" : "EN absent"}
                              </div>
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-4">
            {!selectedKey ? (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                Sélectionne une clé dans la colonne de gauche.
              </div>
            ) : (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold break-all">{selectedKey}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Catégorie : {detectCategory(selectedKey)}
                      <span className="mx-2">•</span>
                      {selectedFr ? "FR ok" : "FR absent"} / {selectedEn ? "EN ok" : "EN absent"}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={copyFromOtherLocale} disabled={isBusy}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copier
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={translateFromOtherLocale} disabled={isBusy}>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Traduire
                    </Button>
                  </div>
                </div>

                <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as Locale)}>
                  <TabsList className="w-full grid grid-cols-2">
                    <TabsTrigger value="fr">FR</TabsTrigger>
                    <TabsTrigger value="en">EN</TabsTrigger>
                  </TabsList>

                  {LOCALES.map((loc) => {
                    const row = selectedKey ? getRow(selectedKey, loc) : null;

                    return (
                      <TabsContent key={loc} value={loc} className="space-y-3 mt-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {row ? (
                              <span className="inline-flex items-center gap-2 text-xs">
                                <span className={`h-2 w-2 rounded-full ${badgeDot(Boolean(row.is_published))}`} />
                                {row.is_published ? "Publié" : "Brouillon"}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                                <AlertTriangle className="h-3 w-3" />
                                Absent
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-2">
                            {!row && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => createMissingLocale(loc)}
                                disabled={isBusy}
                              >
                                <Languages className="h-4 w-4 mr-2" />
                                Créer {loc.toUpperCase()}
                              </Button>
                            )}

                            <Button type="button" variant="outline" size="sm" onClick={() => togglePublishActive(true)} disabled={isBusy}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Publier
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => togglePublishActive(false)} disabled={isBusy}>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Dépublier
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-2 md:grid-cols-[220px_1fr]">
                          <div>
                            <label className="text-xs text-muted-foreground">
                              Type ({loc.toUpperCase()})
                            </label>
                            <select
                              value={draftType}
                              onChange={(e) => setDraftType(e.target.value)}
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
                            <Button type="button" className="w-full rounded-xl" onClick={saveActive} disabled={isBusy}>
                              <Save className="h-4 w-4 mr-2" />
                              Enregistrer
                            </Button>

                            <Button type="button" variant="destructive" className="rounded-xl" onClick={deleteActive} disabled={isBusy}>
                              <Trash2 className="h-4 w-4 mr-2" />
                              Supprimer
                            </Button>
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-muted-foreground">
                            Contenu ({loc.toUpperCase()})
                          </label>
                          <Textarea
                            value={draftValue}
                            onChange={(e) => setDraftValue(e.target.value)}
                            rows={16}
                            placeholder="Saisissez le contenu…"
                            disabled={isBusy}
                          />
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Astuce : “Copier” copie depuis l’autre langue. “Traduire” génère dans l’éditeur (brouillon).
                        </div>
                      </TabsContent>
                    );
                  })}
                </Tabs>
              </>
            )}
          </CardContent>
        </Card>

        {/* Preview */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">Aperçu</div>
                <div className="text-xs text-muted-foreground">
                  {draftType === "markdown" ? "Markdown brut (option preview HTML possible ensuite)" : "Affichage brut"}
                </div>
              </div>

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
                <RefreshCw className="h-4 w-4 mr-2" />
                Sync
              </Button>
            </div>

            <div className="h-[68vh] overflow-auto rounded-xl border bg-muted/10 p-3">
              <pre className="text-xs whitespace-pre-wrap break-words">
                {previewValue || "—"}
              </pre>
            </div>

            {!diag.selectOk ? (
              <div className="text-xs text-rose-700 rounded-md border border-rose-200 bg-rose-50 p-2">
                SELECT bloqué : {diag.selectErr || "Erreur inconnue"}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
