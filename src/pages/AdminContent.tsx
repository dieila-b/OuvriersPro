import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import {
  useSiteContentList,
  useUpsertSiteContent,
  useTogglePublishSiteContent,
  useDeleteSiteContent,
  SiteContentRow,
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
} from "lucide-react";

type Locale = "fr" | "en";
type Category = "Home" | "Footer" | "Legal" | "Contact" | "Other";
type MissingMode = "all" | "en_missing" | "fr_missing";

const LOCALES: Locale[] = ["fr", "en"];
const TYPES = ["text", "markdown", "json"] as const;

function detectCategory(key: string): Category {
  if (key.startsWith("home.")) return "Home";
  if (key.startsWith("footer.")) return "Footer";
  if (key.startsWith("legal.")) return "Legal";
  if (key.startsWith("contact.")) return "Contact";
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
    default:
      return "Tous";
  }
}

/**
 * Auto-translate baseline:
 * - For now: simple heuristic + preserve punctuation
 * - Adds a "To review" note to make it explicit it's a draft.
 *
 * If you later want premium translation:
 * -> replace this with a Supabase Edge Function call.
 */
function autoTranslateFrToEnDraft(fr: string) {
  const trimmed = (fr ?? "").trim();
  if (!trimmed) return "[To review]";

  // Very lightweight heuristic: keep text as-is + marker.
  // This is intentionally conservative to avoid wrong confident translation.
  return `[To review]\n${trimmed}`;
}

export default function AdminContent() {
  const { toast } = useToast();

  const list = useSiteContentList();
  const upsert = useUpsertSiteContent();
  const togglePublish = useTogglePublishSiteContent();
  const del = useDeleteSiteContent();

  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<Category | "All">("All");
  const [missingMode, setMissingMode] = React.useState<MissingMode>("all");

  // Drawer editor
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [activeLocale, setActiveLocale] = React.useState<Locale>("fr");

  // Editor fields per locale
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

  const rows = list.data ?? [];
  const isBusy = list.isLoading || upsert.isPending || togglePublish.isPending || del.isPending;

  // Group by key
  const byKey = React.useMemo(() => {
    const map = new Map<string, SiteContentRow[]>();
    for (const r of rows) {
      if (!map.has(r.key)) map.set(r.key, []);
      map.get(r.key)!.push(r);
    }
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.locale.localeCompare(b.locale));
      map.set(k, arr);
    }
    return map;
  }, [rows]);

  const allKeys = React.useMemo(() => Array.from(byKey.keys()).sort(), [byKey]);

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

  const missingEn = React.useMemo(() => allKeys.filter((k) => getRow(k, "fr") && !getRow(k, "en")).length, [
    allKeys,
    getRow,
  ]);
  const missingFr = React.useMemo(() => allKeys.filter((k) => getRow(k, "en") && !getRow(k, "fr")).length, [
    allKeys,
    getRow,
  ]);

  // Filter keys (search + category + missing)
  const filteredKeys = React.useMemo(() => {
    let keys = allKeys;

    if (category !== "All") {
      keys = keys.filter((k) => detectCategory(k) === category);
    }

    if (missingMode === "en_missing") {
      keys = keys.filter((k) => getRow(k, "fr") && !getRow(k, "en"));
    } else if (missingMode === "fr_missing") {
      keys = keys.filter((k) => getRow(k, "en") && !getRow(k, "fr"));
    }

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

  // Hydrate editor when key changes
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
      fr: fr?.is_published ?? true,
      en: en?.is_published ?? true,
    });

    // Auto focus missing language
    if (fr && !en) setActiveLocale("en");
    else if (en && !fr) setActiveLocale("fr");
  }, [selectedKey, getRow]);

  const createKey = () => {
    const k = prompt("Nouvelle clé (ex: home.hero.title) :");
    if (!k) return;
    const key = k.trim();
    if (!key) return;

    setSelectedKey(key);
    setActiveLocale("fr");
    setTypeByLocale({ fr: "text", en: "text" });
    setValueByLocale({ fr: "", en: "" });
    setPublishedByLocale({ fr: true, en: false }); // EN draft by default
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
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Enregistrement impossible.",
        variant: "destructive",
      });
    }
  };

  const copyLocaleToLocale = async (key: string, from: Locale, to: Locale) => {
    if (!key) return;

    const fromRow = getRow(key, from);
    const fromType = typeByLocale[from] ?? fromRow?.type ?? "text";
    const fromValue = valueByLocale[from] ?? fromRow?.value ?? "";
    const fromPub = Boolean(publishedByLocale[from] ?? fromRow?.is_published ?? true);

    setTypeByLocale((s) => ({ ...s, [to]: fromType }));
    setValueByLocale((s) => ({ ...s, [to]: fromValue }));
    setPublishedByLocale((s) => ({ ...s, [to]: fromPub }));
    setActiveLocale(to);

    try {
      await upsert.mutateAsync({
        key,
        locale: to,
        type: fromType,
        value: fromValue,
        is_published: fromPub,
      });

      toast({ title: "Copie effectuée", description: `${from.toUpperCase()} → ${to.toUpperCase()} enregistré.` });
      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Copie impossible.",
        variant: "destructive",
      });
    }
  };

  // ✅ Create missing EN by draft auto-translation + note “To review” and NOT published
  const createEnMissingDraft = async (key: string) => {
    const fr = getRow(key, "fr");
    if (!fr) {
      toast({ title: "Impossible", description: "FR manquant : crée d’abord la version FR.", variant: "destructive" });
      return;
    }
    const en = getRow(key, "en");
    if (en) {
      toast({ title: "Déjà présent", description: "La version EN existe déjà." });
      return;
    }

    const draft = autoTranslateFrToEnDraft(fr.value ?? "");

    setTypeByLocale((s) => ({ ...s, en: fr.type ?? "text" }));
    setValueByLocale((s) => ({ ...s, en: draft }));
    setPublishedByLocale((s) => ({ ...s, en: false }));
    setSelectedKey(key);
    setActiveLocale("en");

    try {
      await upsert.mutateAsync({
        key,
        locale: "en",
        type: fr.type ?? "text",
        value: draft,
        is_published: false,
      });

      toast({
        title: "EN créé (brouillon)",
        description: "Une version EN a été générée en brouillon avec une note “To review”.",
      });
      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Création EN impossible.",
        variant: "destructive",
      });
    }
  };

  // ✅ Publish/unpublish BOTH (creates missing locale rows if needed with current editor values)
  const setPublishBoth = async (key: string, next: boolean) => {
    const fr = getRow(key, "fr");
    const en = getRow(key, "en");

    try {
      // update existing rows
      if (fr) await togglePublish.mutateAsync({ id: fr.id, is_published: next });
      if (en) await togglePublish.mutateAsync({ id: en.id, is_published: next });

      // create missing rows if needed
      if (!fr) {
        await upsert.mutateAsync({
          key,
          locale: "fr",
          type: typeByLocale.fr ?? "text",
          value: valueByLocale.fr ?? "",
          is_published: next,
        });
      }
      if (!en) {
        await upsert.mutateAsync({
          key,
          locale: "en",
          type: typeByLocale.en ?? "text",
          value: valueByLocale.en ?? "",
          is_published: next,
        });
      }

      toast({
        title: next ? "Publié (FR + EN)" : "Dépublié (FR + EN)",
        description: `Statut appliqué pour ${key}.`,
      });
      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Mise à jour du statut impossible.",
        variant: "destructive",
      });
    }
  };

  // ✅ Batch publish all keys complete FR+EN
  const batchPublishComplete = async () => {
    const keys = filteredKeys.filter((k) => isComplete(k));
    if (keys.length === 0) {
      toast({ title: "Rien à publier", description: "Aucune clé complète FR+EN dans le filtre actuel." });
      return;
    }

    const ok = window.confirm(
      `Publier ${keys.length} clé(s) complètes FR+EN ?\n\nCela mettra FR et EN en “Publié”.`
    );
    if (!ok) return;

    try {
      for (const k of keys) {
        const fr = getRow(k, "fr");
        const en = getRow(k, "en");
        if (fr) await togglePublish.mutateAsync({ id: fr.id, is_published: true });
        if (en) await togglePublish.mutateAsync({ id: en.id, is_published: true });
      }
      toast({ title: "Batch publish OK", description: `${keys.length} clé(s) publiées.` });
      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Batch publish impossible.",
        variant: "destructive",
      });
    }
  };

  const deleteLocale = async (key: string, locale: Locale) => {
    const row = getRow(key, locale);
    if (!row) return;

    const ok = window.confirm(
      `Supprimer ${key} (${locale.toUpperCase()}) ?\n\nCette action est irréversible.`
    );
    if (!ok) return;

    try {
      await del.mutateAsync({ id: row.id });
      toast({ title: "Supprimé", description: `${key} (${locale.toUpperCase()}) supprimé.` });
      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Suppression impossible.",
        variant: "destructive",
      });
    }
  };

  // Editor helpers
  const selectedFr = selectedKey ? getRow(selectedKey, "fr") : null;
  const selectedEn = selectedKey ? getRow(selectedKey, "en") : null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Back-Office — Contenu du site</h1>
          <p className="text-sm text-muted-foreground">
            Mode CMS (table). Multilingue FR/EN, manquants, copie, batch publish, catégories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => list.refetch()} disabled={isBusy}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button type="button" onClick={createKey} disabled={isBusy}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle clé
          </Button>
          <Button type="button" variant="outline" onClick={batchPublishComplete} disabled={isBusy}>
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Batch publish (complets)
          </Button>
        </div>
      </div>

      {/* Filters */}
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
              <div className="text-xs text-muted-foreground inline-flex items-center gap-2 mr-1">
                <Languages className="h-4 w-4" />
                FR/EN
              </div>

              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as any)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                disabled={isBusy}
              >
                <option value="All">Toutes catégories</option>
                <option value="Home">Home</option>
                <option value="Footer">Footer</option>
                <option value="Legal">Legal</option>
                <option value="Contact">Contact</option>
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
              </select>
            </div>
          </div>

          <div className="mt-3 text-xs text-muted-foreground">
            {list.isLoading ? "Chargement…" : `${filteredKeys.length} clé(s) dans le filtre`}
          </div>
        </CardContent>
      </Card>

      {/* Table + Editor */}
      <div className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
        {/* Table */}
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
                    const complete = Boolean(fr) && Boolean(en);

                    return (
                      <tr
                        key={k}
                        className={[
                          "border-b align-top",
                          selectedKey === k ? "bg-muted/40" : "hover:bg-muted/20",
                        ].join(" ")}
                      >
                        <td className="py-3 pr-3">
                          <button
                            type="button"
                            onClick={() => setSelectedKey(k)}
                            className="text-left font-medium text-pro-gray hover:underline"
                          >
                            {k}
                          </button>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {complete ? "Complet FR+EN" : "Incomplet"}
                            {!en && fr && (
                              <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
                                <AlertTriangle className="h-3 w-3" /> EN manquant
                              </span>
                            )}
                            {!fr && en && (
                              <span className="ml-2 inline-flex items-center gap-1 text-amber-700">
                                <AlertTriangle className="h-3 w-3" /> FR manquant
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3 pr-3">
                          <span className="inline-flex rounded-full border px-2 py-0.5 text-xs">
                            {cat}
                          </span>
                        </td>

                        <td className="py-3 pr-3">
                          {fr ? (
                            <span className={["inline-flex text-[11px] px-2 py-0.5 rounded-full border", badgeStatus(fr.is_published)].join(" ")}>
                              {fr.is_published ? "Publié" : "Brouillon"}
                            </span>
                          ) : (
                            <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                              Absent
                            </span>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                            {(fr?.value ?? "").trim() || "—"}
                          </div>
                        </td>

                        <td className="py-3 pr-3">
                          {en ? (
                            <span className={["inline-flex text-[11px] px-2 py-0.5 rounded-full border", badgeStatus(en.is_published)].join(" ")}>
                              {en.is_published ? "Publié" : "Brouillon"}
                            </span>
                          ) : (
                            <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full border border-slate-200 bg-slate-50 text-slate-600">
                              Absent
                            </span>
                          )}
                          <div className="mt-2 text-xs text-muted-foreground line-clamp-2">
                            {(en?.value ?? "").trim() || "—"}
                          </div>
                        </td>

                        <td className="py-3 pr-3">
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyLocaleToLocale(k, "fr", "en")}
                              disabled={isBusy || !fr}
                              title="Copier FR → EN"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              FR→EN
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => copyLocaleToLocale(k, "en", "fr")}
                              disabled={isBusy || !en}
                              title="Copier EN → FR"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              EN→FR
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => createEnMissingDraft(k)}
                              disabled={isBusy || !!en || !fr}
                              title="Créer EN manquant (brouillon + note To review)"
                            >
                              <Languages className="h-4 w-4 mr-2" />
                              Créer EN
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPublishBoth(k, true)}
                              disabled={isBusy || !isComplete(k)}
                              title="Publier FR + EN (uniquement si complet)"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Publier
                            </Button>

                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => setPublishBoth(k, false)}
                              disabled={isBusy}
                              title="Dépublier FR + EN"
                            >
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
                        Aucun résultat dans le filtre.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Editor */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Éditeur</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {!selectedKey ? (
              <div className="rounded-xl border p-4 text-sm text-muted-foreground">
                Sélectionne une clé dans le tableau pour modifier son contenu FR/EN.
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
                    <label className="text-xs text-muted-foreground">
                      Type ({activeLocale.toUpperCase()})
                    </label>
                    <select
                      value={typeByLocale[activeLocale]}
                      onChange={(e) =>
                        setTypeByLocale((s) => ({ ...s, [activeLocale]: e.target.value }))
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
                      variant="outline"
                      onClick={() =>
                        setPublishedByLocale((p) => ({ ...p, [activeLocale]: true }))
                      }
                      disabled={isBusy}
                      className="rounded-xl w-full"
                      title="Marquer comme publié (appliqué au save)"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Publié
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        setPublishedByLocale((p) => ({ ...p, [activeLocale]: false }))
                      }
                      disabled={isBusy}
                      className="rounded-xl w-full"
                      title="Marquer comme brouillon (appliqué au save)"
                    >
                      <EyeOff className="h-4 w-4 mr-2" />
                      Brouillon
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-xs text-muted-foreground">
                    Contenu ({activeLocale.toUpperCase()})
                  </label>
                  <Textarea
                    value={valueByLocale[activeLocale]}
                    onChange={(e) =>
                      setValueByLocale((s) => ({ ...s, [activeLocale]: e.target.value }))
                    }
                    rows={14}
                    placeholder="Saisissez le contenu…"
                    disabled={isBusy}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{(valueByLocale[activeLocale]?.length ?? 0)} caractère(s)</span>
                    <span>
                      Statut:{" "}
                      <span className="font-medium">
                        {publishedByLocale[activeLocale] ? "Publié" : "Brouillon"}
                      </span>
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    onClick={() => saveLocale(selectedKey, activeLocale)}
                    disabled={isBusy}
                    className="rounded-xl"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer {activeLocale.toUpperCase()}
                  </Button>

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

                <div className="rounded-xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                  <div className="font-medium text-foreground mb-1">Bonnes pratiques</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Garde des clés structurées (ex: <code>home.hero.title</code>, <code>footer.contact_hint</code>).</li>
                    <li>Publie en masse uniquement quand FR+EN sont complets (bouton Batch publish).</li>
                    <li>“Créer EN” génère un brouillon marqué <code>[To review]</code>.</li>
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
