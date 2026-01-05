// src/pages/AdminContent.tsx
import * as React from "react";
import { supabase } from "@/lib/supabase";
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
  Wand2,
  Sparkles,
  RotateCcw,
  ListPlus,
  Bug,
  Database,
  ShieldAlert,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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

function badgeStatus(published: boolean) {
  return published
    ? "border-emerald-200 text-emerald-700 bg-emerald-50"
    : "border-amber-200 text-amber-700 bg-amber-50";
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

export default function AdminContent() {
  const { toast } = useToast();

  // Mutations : on garde tes hooks existants
  const upsert = useUpsertSiteContent();
  const togglePublish = useTogglePublishSiteContent();
  const del = useDeleteSiteContent();

  // ✅ LISTE DIRECTE (remplace useSiteContentList)
  const list = useQuery({
    queryKey: ["site_content_list_direct"],
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

  // ✅ DIAGNOSTIC toujours visible
  const [diag, setDiag] = React.useState<{
    supabaseUrl: string;
    hasSession: boolean;
    email: string;
    userId: string;
    selectOk: boolean;
    selectErr: string;
    rowCount: number;
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
    rowCount: 0,
  });

  const runDiag = React.useCallback(async () => {
    try {
      const { data: sessionData, error: sErr } = await supabase.auth.getSession();
      if (sErr) throw sErr;

      const session = sessionData?.session ?? null;
      const user = session?.user ?? null;

      const { data, error } = await supabase
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
        rowCount: Array.isArray(data) ? data.length : 0,
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

  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [activeLocale, setActiveLocale] = React.useState<Locale>("fr");

  const [typeByLocale, setTypeByLocale] = React.useState<Record<Locale, string>>({
    fr: "text",
    en: "text",
  });
  const [valueByLocale, setValueByLocale] = React.useState<Record<Locale, string>>({
    fr: "",
    en: "",
  });
  const [publishedByLocale, setPublishedByLocale] = React.useState<Record<Locale, boolean>>({
    fr: true,
    en: true,
  });

  const [translatingKey, setTranslatingKey] = React.useState<string | null>(null);
  const [translatingDir, setTranslatingDir] = React.useState<string | null>(null);

  const rows = list.data ?? [];
  const isBusy =
    list.isLoading ||
    upsert.isPending ||
    togglePublish.isPending ||
    del.isPending ||
    Boolean(translatingKey);

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

  const isComplete = React.useCallback(
    (key: string) => Boolean(getRow(key, "fr")) && Boolean(getRow(key, "en")),
    [getRow]
  );

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

  // Charge dans l'éditeur à la sélection
  React.useEffect(() => {
    if (!selectedKey) return;

    const fr = getRow(selectedKey, "fr");
    const en = getRow(selectedKey, "en");

    setTypeByLocale({
      fr: fr?.type ?? "text",
      en: en?.type ?? (fr?.type ?? "text"),
    });
    setValueByLocale({
      fr: fr?.value ?? "",
      en: en?.value ?? "",
    });
    setPublishedByLocale({
      fr: Boolean(fr?.is_published),
      en: Boolean(en?.is_published),
    });

    if (fr && !en) setActiveLocale("en");
    else if (en && !fr) setActiveLocale("fr");
  }, [selectedKey, getRow]);

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
    setTypeByLocale({ fr: "text", en: "text" });
    setValueByLocale({ fr: "", en: "" });
    setPublishedByLocale({ fr: false, en: false });
  };

  const saveLocale = async (key: string, locale: Locale) => {
    if (!key) return;
    try {
      await upsert.mutateAsync({
        key,
        locale,
        type: typeByLocale[locale] ?? "text",
        value: valueByLocale[locale] ?? "",
        is_published: Boolean(publishedByLocale[locale]),
      });
      toast({ title: "Enregistré", description: `${key} (${locale.toUpperCase()}) mis à jour.` });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Enregistrement impossible.", variant: "destructive" });
    }
  };

  const copyLocaleToLocale = async (key: string, from: Locale, to: Locale) => {
    if (!key) return;

    const fromRow = getRow(key, from);
    const fromType = typeByLocale[from] ?? fromRow?.type ?? "text";
    const fromValue = valueByLocale[from] ?? fromRow?.value ?? "";
    const fromPub = Boolean(publishedByLocale[from] ?? fromRow?.is_published ?? false);

    setTypeByLocale((s) => ({ ...s, [to]: fromType }));
    setValueByLocale((s) => ({ ...s, [to]: fromValue }));
    setPublishedByLocale((s) => ({ ...s, [to]: fromPub }));
    setActiveLocale(to);

    try {
      await upsert.mutateAsync({ key, locale: to, type: fromType, value: fromValue, is_published: fromPub });
      toast({ title: "Copie effectuée", description: `${from.toUpperCase()} → ${to.toUpperCase()} enregistré.` });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Copie impossible.", variant: "destructive" });
    }
  };

  const translateEditor = async (key: string, from: Locale, to: Locale, options?: { addReviewNote?: boolean }) => {
    const fromRow = getRow(key, from);
    const srcType = (typeByLocale[from] ?? fromRow?.type ?? "text").toString();
    const srcValue = (valueByLocale[from] ?? fromRow?.value ?? "").toString();

    if (!srcValue.trim()) {
      toast({ title: "Impossible", description: `Le contenu ${from.toUpperCase()} est vide.`, variant: "destructive" });
      return;
    }

    const dir = `${from.toUpperCase()}→${to.toUpperCase()}`;
    setTranslatingKey(key);
    setTranslatingDir(dir);

    try {
      const translated = await translateViaEdgeFn({ text: srcValue, source: from, target: to, type: srcType, mode: "draft" });
      const finalText = options?.addReviewNote ? ensureToReviewNote(translated, to) : translated;

      setTypeByLocale((s) => ({ ...s, [to]: srcType }));
      setValueByLocale((s) => ({ ...s, [to]: finalText }));
      setPublishedByLocale((s) => ({ ...s, [to]: false }));
      setActiveLocale(to);

      toast({ title: "Traduction prête", description: `Traduction ${dir} générée. Vérifie puis enregistre.` });
    } catch (e: any) {
      toast({ title: "Erreur traduction", description: e?.message ?? "Traduction impossible.", variant: "destructive" });
    } finally {
      setTranslatingKey(null);
      setTranslatingDir(null);
    }
  };

  const createMissingLocale = async (key: string, locale: Locale) => {
    try {
      await upsert.mutateAsync({
        key,
        locale,
        type: typeByLocale[locale] ?? "text",
        value: valueByLocale[locale] ?? "",
        is_published: false,
      });
      toast({ title: "Créé", description: `${key} (${locale.toUpperCase()}) créé en brouillon.` });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Création impossible.", variant: "destructive" });
    }
  };

  const setPublishBoth = async (key: string, next: boolean) => {
    const fr = getRow(key, "fr");
    const en = getRow(key, "en");

    if (next) {
      const frVal = (fr?.value ?? "").trim();
      const enVal = (en?.value ?? "").trim();
      if (!fr || !en || !frVal || !enVal) {
        toast({ title: "Publication impossible", description: "FR et EN doivent exister et être non vides pour publier.", variant: "destructive" });
        return;
      }
    }

    try {
      if (fr) await togglePublish.mutateAsync({ id: fr.id, is_published: next });
      if (en) await togglePublish.mutateAsync({ id: en.id, is_published: next });
      toast({ title: next ? "Publié (FR + EN)" : "Dépublié (FR + EN)", description: `Statut appliqué pour ${key}.` });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Mise à jour du statut impossible.", variant: "destructive" });
    }
  };

  const deleteLocale = async (key: string, locale: Locale) => {
    const row = getRow(key, locale);
    if (!row) return;

    const ok = window.confirm(`Supprimer ${key} (${locale.toUpperCase()}) ?\n\nCette action est irréversible.`);
    if (!ok) return;

    try {
      await del.mutateAsync({ id: row.id });
      toast({ title: "Supprimé", description: `${key} (${locale.toUpperCase()}) supprimé.` });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Suppression impossible.", variant: "destructive" });
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
          await upsert.mutateAsync({ key: k, locale: loc, type: "text", value: "", is_published: false });
          created += 1;
        }
      }
      toast({ title: "Initialisation terminée", description: created > 0 ? `${created} entrée(s) créée(s).` : "Aucune entrée à créer." });
      await list.refetch();
      await runDiag();
    } catch (e: any) {
      toast({ title: "Erreur", description: e?.message ?? "Initialisation impossible.", variant: "destructive" });
    }
  };

  const selectedFr = selectedKey ? getRow(selectedKey, "fr") : null;
  const selectedEn = selectedKey ? getRow(selectedKey, "en") : null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* ✅ Bandeau diagnostic toujours visible */}
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

            <Button type="button" variant="outline" size="sm" onClick={() => { runDiag(); list.refetch(); }} disabled={isBusy}>
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

      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Back-Office — Contenu du site</h1>
          <p className="text-sm text-muted-foreground">
            CMS FR/EN : clés (catalogue + DB), recherche, filtres, manquants, copie, traduction, publication.
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
            Initialiser clés manquantes
          </Button>
        </div>
      </div>

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
                <option value="All">Toutes catégories</option>
                <option value="Header">Header</option>
                <option value="Home">Home</option>
                <option value="Footer">Footer</option>
                <option value="Company">Company</option>
                <option value="Legal">Legal</option>
                <option value="Contact">Contact</option>
                <option value="Services">Services</option>
                <option value="Other">Other</option>
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
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            {list.isLoading ? "Chargement…" : `${filteredKeys.length} clé(s) (catalogue + DB) — DB rows: ${rows.length}`}
          </div>
          {list.isError ? (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              {(list.error as any)?.message ?? "Erreur de chargement"}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Contenus</CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3 font-semibold">Clé</th>
                    <th className="py-2 pr-3 font-semibold">Catégorie</th>
                    <th className="py-2 pr-3 font-semibold">FR</th>
                    <th className="py-2 pr-3 font-semibold">EN</th>
                    <th className="py-2 pr-3 font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredKeys.map((k) => {
                    const fr = getRow(k, "fr");
                    const en = getRow(k, "en");
                    const cat = detectCategory(k);

                    const frText = (fr?.value ?? "").trim();
                    const enText = (en?.value ?? "").trim();

                    return (
                      <tr
                        key={k}
                        onClick={() => setSelectedKey(k)}
                        className={[
                          "border-b align-top cursor-pointer",
                          selectedKey === k ? "bg-muted/40" : "hover:bg-muted/20",
                        ].join(" ")}
                      >
                        <td className="py-3 pr-3">
                          <div className="font-medium">{k}</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {fr || en ? (
                              <>
                                {fr && en ? "Complet FR+EN" : "Incomplet"}
                                {!en && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
                                    <AlertTriangle className="h-3 w-3" /> EN manquant
                                  </span>
                                )}
                                {!fr && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
                                    <AlertTriangle className="h-3 w-3" /> FR manquant
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-700">
                                <AlertTriangle className="h-3 w-3" /> Absent (FR+EN)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 pr-3">
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-xs">{cat}</span>
                        </td>

                        <td className="py-3 pr-3">
                          {fr ? (
                            <span className={["inline-flex text-[11px] px-2 py-0.5 rounded-full border", badgeStatus(Boolean(fr.is_published))].join(" ")}>
                              {fr.is_published ? "Publié" : "Brouillon"}
                            </span>
                          ) : (
                            <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                              Absent
                            </span>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap break-words line-clamp-3">
                            {frText || "—"}
                          </div>
                        </td>

                        <td className="py-3 pr-3">
                          {en ? (
                            <span className={["inline-flex text-[11px] px-2 py-0.5 rounded-full border", badgeStatus(Boolean(en.is_published))].join(" ")}>
                              {en.is_published ? "Publié" : "Brouillon"}
                            </span>
                          ) : (
                            <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                              Absent
                            </span>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap break-words line-clamp-3">
                            {enText || "—"}
                          </div>
                        </td>

                        <td className="py-3 pr-3" onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-wrap gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => copyLocaleToLocale(k, "fr", "en")} disabled={isBusy || !fr}>
                              <Copy className="h-4 w-4 mr-2" />
                              FR→EN
                            </Button>

                            <Button type="button" variant="outline" size="sm" onClick={() => copyLocaleToLocale(k, "en", "fr")} disabled={isBusy || !en}>
                              <Copy className="h-4 w-4 mr-2" />
                              EN→FR
                            </Button>

                            <Button type="button" variant="outline" size="sm" onClick={() => createMissingLocale(k, "en")} disabled={isBusy || !!en}>
                              <Languages className="h-4 w-4 mr-2" />
                              Créer EN
                            </Button>

                            <Button type="button" variant="outline" size="sm" onClick={() => createMissingLocale(k, "fr")} disabled={isBusy || !!fr}>
                              <Languages className="h-4 w-4 mr-2" />
                              Créer FR
                            </Button>

                            <Button type="button" variant="outline" size="sm" onClick={() => setPublishBoth(k, true)} disabled={isBusy || !isComplete(k)}>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Publier
                            </Button>

                            <Button type="button" variant="outline" size="sm" onClick={() => setPublishBoth(k, false)} disabled={isBusy}>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Dépublier
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!list.isLoading && filteredKeys.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                        Aucun résultat.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Éditeur</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {!selectedKey ? (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                Sélectionne une clé à gauche pour voir et modifier son contenu.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{selectedKey}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Catégorie : {detectCategory(selectedKey)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {LOCALES.map((loc) => (
                      <Button
                        key={loc}
                        type="button"
                        variant={activeLocale === loc ? "default" : "outline"}
                        onClick={() => setActiveLocale(loc)}
                        className="rounded-xl"
                        disabled={isBusy}
                      >
                        {loc.toUpperCase()}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <label className="text-xs text-muted-foreground">Type ({activeLocale.toUpperCase()})</label>
                    <select
                      value={typeByLocale[activeLocale]}
                      onChange={(e) => setTypeByLocale((s) => ({ ...s, [activeLocale]: e.target.value }))}
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
                      variant="outline"
                      onClick={() => setPublishedByLocale((p) => ({ ...p, [activeLocale]: true }))}
                      disabled={isBusy}
                      className="rounded-xl w-full"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Publié
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setPublishedByLocale((p) => ({ ...p, [activeLocale]: false }))}
                      disabled={isBusy}
                      className="rounded-xl w-full"
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Brouillon
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/10 p-3">
                  <div className="text-xs text-muted-foreground mr-2 inline-flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    Traduction (Edge Function)
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => translateEditor(selectedKey, "fr", "en", { addReviewNote: true })}
                    disabled={isBusy}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Traduire FR→EN
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => translateEditor(selectedKey, "en", "fr", { addReviewNote: true })}
                    disabled={isBusy}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Traduire EN→FR
                  </Button>

                  <div className="text-xs text-muted-foreground">Génère dans l’éditeur, puis enregistre.</div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">Contenu ({activeLocale.toUpperCase()})</label>
                  <Textarea
                    value={valueByLocale[activeLocale]}
                    onChange={(e) => setValueByLocale((s) => ({ ...s, [activeLocale]: e.target.value }))}
                    rows={16}
                    placeholder="Saisissez le contenu…"
                    disabled={isBusy}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={() => saveLocale(selectedKey, activeLocale)} disabled={isBusy} className="rounded-xl">
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer {activeLocale.toUpperCase()}
                  </Button>

                  {!getRow(selectedKey, activeLocale) && (
                    <Button type="button" variant="outline" onClick={() => createMissingLocale(selectedKey, activeLocale)} disabled={isBusy} className="rounded-xl">
                      <Plus className="h-4 w-4 mr-2" />
                      Créer {activeLocale.toUpperCase()}
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => deleteLocale(selectedKey, activeLocale)}
                    disabled={isBusy || (!selectedFr && activeLocale === "fr") || (!selectedEn && activeLocale === "en")}
                    className="rounded-xl"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer {activeLocale.toUpperCase()}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
