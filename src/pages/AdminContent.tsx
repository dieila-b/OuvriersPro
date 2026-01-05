import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
  Plus,
  Save,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Languages,
} from "lucide-react";

const LOCALES = ["fr", "en"] as const;
const TYPES = ["text", "markdown", "json"] as const;

type Locale = (typeof LOCALES)[number];

function badgeClass(published: boolean) {
  return published
    ? "border-emerald-200 text-emerald-700 bg-emerald-50"
    : "border-amber-200 text-amber-700 bg-amber-50";
}

export default function AdminContent() {
  const { toast } = useToast();

  const list = useSiteContentList();
  const upsert = useUpsertSiteContent();
  const togglePublish = useTogglePublishSiteContent();
  const del = useDeleteSiteContent();

  const [query, setQuery] = React.useState("");
  const [selectedKey, setSelectedKey] = React.useState<string | null>(null);
  const [activeLocale, setActiveLocale] = React.useState<Locale>("fr");

  // Editor state (par locale)
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

  // Group rows by key
  const byKey = React.useMemo(() => {
    const map = new Map<string, SiteContentRow[]>();
    for (const r of rows) {
      if (!map.has(r.key)) map.set(r.key, []);
      map.get(r.key)!.push(r);
    }
    // sort locales inside each key
    for (const [k, arr] of map.entries()) {
      arr.sort((a, b) => a.locale.localeCompare(b.locale));
      map.set(k, arr);
    }
    return map;
  }, [rows]);

  const allKeys = React.useMemo(() => Array.from(byKey.keys()).sort(), [byKey]);

  const filteredKeys = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allKeys;

    return allKeys.filter((k) => {
      if (k.toLowerCase().includes(q)) return true;
      const arr = byKey.get(k) ?? [];
      return arr.some((r) => (r.value ?? "").toLowerCase().includes(q));
    });
  }, [allKeys, byKey, query]);

  const selectedRows = React.useMemo(() => {
    if (!selectedKey) return [];
    return byKey.get(selectedKey) ?? [];
  }, [byKey, selectedKey]);

  const rowForLocale = React.useMemo(() => {
    const m: Partial<Record<Locale, SiteContentRow>> = {};
    for (const r of selectedRows) {
      if (r.locale === "fr") m.fr = r;
      if (r.locale === "en") m.en = r;
    }
    return m;
  }, [selectedRows]);

  const hydrateEditorFromSelection = React.useCallback(() => {
    if (!selectedKey) {
      setTypeByLocale({ fr: "text", en: "text" });
      setValueByLocale({ fr: "", en: "" });
      setPublishedByLocale({ fr: true, en: true });
      setActiveLocale("fr");
      return;
    }

    const fr = rowForLocale.fr;
    const en = rowForLocale.en;

    setTypeByLocale({
      fr: fr?.type ?? "text",
      en: en?.type ?? "text",
    });

    setValueByLocale({
      fr: fr?.value ?? "",
      en: en?.value ?? "",
    });

    setPublishedByLocale({
      fr: fr?.is_published ?? true,
      en: en?.is_published ?? true,
    });
  }, [selectedKey, rowForLocale.fr, rowForLocale.en]);

  React.useEffect(() => {
    hydrateEditorFromSelection();
  }, [hydrateEditorFromSelection]);

  const createNewKey = () => {
    const k = prompt("Nouvelle clé (ex: home.hero.title) :");
    if (!k) return;
    const key = k.trim();
    if (!key) return;

    setSelectedKey(key);
    // keep editor empty for both locales
    setTypeByLocale({ fr: "text", en: "text" });
    setValueByLocale({ fr: "", en: "" });
    setPublishedByLocale({ fr: true, en: true });
    setActiveLocale("fr");
  };

  const isBusy = list.isLoading || upsert.isPending || togglePublish.isPending || del.isPending;

  const saveLocale = async (locale: Locale) => {
    if (!selectedKey) {
      toast({ title: "Sélection obligatoire", description: "Choisis une clé ou crée-en une.", variant: "destructive" });
      return;
    }

    try {
      await upsert.mutateAsync({
        key: selectedKey,
        locale,
        type: typeByLocale[locale],
        value: valueByLocale[locale] ?? "",
        is_published: publishedByLocale[locale],
      });

      toast({ title: "Enregistré", description: `Contenu ${locale.toUpperCase()} mis à jour.` });
      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible d’enregistrer.",
        variant: "destructive",
      });
    }
  };

  const toggleLocalePublish = async (locale: Locale, next: boolean) => {
    setPublishedByLocale((p) => ({ ...p, [locale]: next }));

    const row = rowForLocale[locale];
    // si la ligne n'existe pas encore, on enregistre d'abord à la prochaine sauvegarde
    if (!row) return;

    try {
      await togglePublish.mutateAsync({ id: row.id, is_published: next });
      toast({ title: next ? "Publié" : "Dépublié", description: `${locale.toUpperCase()} : statut mis à jour.` });
      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible de modifier le statut.",
        variant: "destructive",
      });
    }
  };

  const deleteLocale = async (locale: Locale) => {
    const row = rowForLocale[locale];
    if (!row) {
      toast({ title: "Rien à supprimer", description: `Aucune version ${locale.toUpperCase()} n’existe.` });
      return;
    }

    const ok = window.confirm(
      `Supprimer la version ${locale.toUpperCase()} de la clé:\n\n${row.key}\n\nCette action est irréversible.`
    );
    if (!ok) return;

    try {
      await del.mutateAsync({ id: row.id });
      toast({ title: "Supprimé", description: `${locale.toUpperCase()} supprimé.` });
      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Suppression impossible.",
        variant: "destructive",
      });
    }
  };

  const activeRow = selectedKey ? rowForLocale[activeLocale] : null;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Back-Office — Contenu du site</h1>
          <p className="text-sm text-muted-foreground">
            Éditez toutes les clés du site en FR/EN. Recherche, publication, gestion complète.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => list.refetch()} disabled={isBusy}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button type="button" onClick={createNewKey} disabled={isBusy}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle clé
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[460px_1fr]">
        {/* Left: List */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contenu (toutes les clés)</CardTitle>

            <div className="mt-3 flex items-center gap-2">
              <div className="relative w-full">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher par clé ou contenu..."
                  className="pl-9"
                />
              </div>
            </div>

            <div className="mt-2 text-xs text-muted-foreground flex items-center gap-2">
              <Languages className="h-4 w-4" />
              FR/EN par clé (UNIQUE(key, locale))
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground mb-2">
              {list.isLoading ? "Chargement..." : `${filteredKeys.length} clé(s)`}
            </div>

            <div className="max-h-[560px] overflow-auto pr-1">
              <div className="space-y-2">
                {filteredKeys.map((k) => {
                  const active = k === selectedKey;
                  const arr = byKey.get(k) ?? [];
                  const fr = arr.find((r) => r.locale === "fr");
                  const en = arr.find((r) => r.locale === "en");

                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setSelectedKey(k)}
                      className={[
                        "w-full text-left rounded-xl border px-3 py-2 transition-colors",
                        active ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{k}</div>
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {(fr?.value ?? en?.value ?? "").trim() || "— vide —"}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <span
                            className={[
                              "text-[11px] px-2 py-0.5 rounded-full border",
                              badgeClass(Boolean(fr?.is_published ?? false)),
                              !fr ? "opacity-50" : "",
                            ].join(" ")}
                            title={!fr ? "FR absent" : fr.is_published ? "FR publié" : "FR brouillon"}
                          >
                            FR
                          </span>
                          <span
                            className={[
                              "text-[11px] px-2 py-0.5 rounded-full border",
                              badgeClass(Boolean(en?.is_published ?? false)),
                              !en ? "opacity-50" : "",
                            ].join(" ")}
                            title={!en ? "EN absent" : en.is_published ? "EN publié" : "EN brouillon"}
                          >
                            EN
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!list.isLoading && filteredKeys.length === 0 && (
                  <div className="text-sm text-muted-foreground border rounded-xl p-4">
                    Aucun résultat. Essaie une autre recherche ou crée une nouvelle clé.
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Editor */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-base">Éditeur</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedKey ? (
                    <>
                      Clé: <span className="font-medium text-foreground">{selectedKey}</span>
                      <span className="mx-2 text-muted-foreground">•</span>
                      {activeRow?.updated_at
                        ? `Maj ${activeLocale.toUpperCase()}: ${new Date(activeRow.updated_at).toLocaleString()}`
                        : `${activeLocale.toUpperCase()}: aucune version existante (elle sera créée à l’enregistrement)`}
                    </>
                  ) : (
                    "Sélectionne une clé à gauche ou crée-en une."
                  )}
                </div>
              </div>

              {/* Locale tabs */}
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
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Actions row */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => toggleLocalePublish(activeLocale, !publishedByLocale[activeLocale])}
                disabled={isBusy}
              >
                {publishedByLocale[activeLocale] ? (
                  <>
                    <Eye className="h-4 w-4 mr-2" />
                    Publié
                  </>
                ) : (
                  <>
                    <EyeOff className="h-4 w-4 mr-2" />
                    Brouillon
                  </>
                )}
              </Button>

              <Button type="button" onClick={() => saveLocale(activeLocale)} disabled={isBusy || !selectedKey}>
                <Save className="h-4 w-4 mr-2" />
                Enregistrer {activeLocale.toUpperCase()}
              </Button>

              <Button
                type="button"
                variant="destructive"
                onClick={() => deleteLocale(activeLocale)}
                disabled={isBusy || !selectedKey}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer {activeLocale.toUpperCase()}
              </Button>
            </div>

            {/* Type + Content */}
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

              <div className="rounded-xl border bg-muted/30 p-3 text-xs text-muted-foreground">
                <div className="font-medium text-foreground mb-1">Organisation</div>
                Utilise des clés structurées : <code>home.hero.title</code>, <code>footer.contact_hint</code>,{" "}
                <code>legal.terms</code>…
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Contenu ({activeLocale.toUpperCase()})</label>
              <Textarea
                value={valueByLocale[activeLocale]}
                onChange={(e) => setValueByLocale((s) => ({ ...s, [activeLocale]: e.target.value }))}
                rows={14}
                placeholder="Saisissez le contenu…"
                disabled={isBusy}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{(valueByLocale[activeLocale]?.length ?? 0).toString()} caractère(s)</span>
                <span className="opacity-80">{publishedByLocale[activeLocale] ? "Publié" : "Brouillon"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
