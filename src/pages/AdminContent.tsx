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
import { Search, Plus, Save, Trash2, Eye, EyeOff, RefreshCw } from "lucide-react";

const LOCALE = "fr"; // ✅ on reste compatible avec ton schéma actuel (key unique)
const TYPES = ["text", "markdown", "json"] as const;

export default function AdminContent() {
  const { toast } = useToast();

  const list = useSiteContentList(); // charge tout
  const upsert = useUpsertSiteContent();
  const togglePublish = useTogglePublishSiteContent();
  const del = useDeleteSiteContent();

  const [query, setQuery] = React.useState("");
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  // Editor state
  const [keyInput, setKeyInput] = React.useState("");
  const [typeInput, setTypeInput] = React.useState<string>("text");
  const [valueInput, setValueInput] = React.useState("");
  const [published, setPublished] = React.useState(true);

  const rows = list.data ?? [];

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.key.toLowerCase().includes(q) || (r.value ?? "").toLowerCase().includes(q));
  }, [rows, query]);

  const selectedRow: SiteContentRow | null = React.useMemo(() => {
    if (!selectedId) return null;
    return rows.find((r) => r.id === selectedId) ?? null;
  }, [rows, selectedId]);

  // hydrate editor when selection changes
  React.useEffect(() => {
    if (!selectedRow) return;
    setKeyInput(selectedRow.key);
    setTypeInput(selectedRow.type ?? "text");
    setValueInput(selectedRow.value ?? "");
    setPublished(Boolean(selectedRow.is_published));
  }, [selectedRow?.id]); // only when selection changes

  const dirty = React.useMemo(() => {
    if (!selectedRow) return keyInput.trim() || valueInput.trim();
    return (
      keyInput !== selectedRow.key ||
      typeInput !== selectedRow.type ||
      valueInput !== (selectedRow.value ?? "") ||
      published !== Boolean(selectedRow.is_published)
    );
  }, [selectedRow, keyInput, typeInput, valueInput, published]);

  const createNew = () => {
    setSelectedId(null);
    setKeyInput("");
    setTypeInput("text");
    setValueInput("");
    setPublished(true);
  };

  const save = async () => {
    const k = keyInput.trim();
    if (!k) {
      toast({ title: "Clé obligatoire", description: "Ex: home.hero.title", variant: "destructive" });
      return;
    }

    try {
      await upsert.mutateAsync({
        key: k,
        locale: LOCALE,
        type: typeInput,
        value: valueInput ?? "",
        is_published: published,
      });

      // Si on créait une nouvelle clé, la sélectionner après refresh
      toast({ title: "Enregistré", description: "Le contenu a été mis à jour." });
      // refresh list and reselect by key
      await list.refetch();
      const match = (list.data ?? []).find((r) => r.key === k);
      if (match) setSelectedId(match.id);
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible d’enregistrer.",
        variant: "destructive",
      });
    }
  };

  const toggle = async (next: boolean) => {
    setPublished(next);
    if (!selectedRow) return; // nouveau: juste state local
    try {
      await togglePublish.mutateAsync({ id: selectedRow.id, is_published: next });
      toast({ title: next ? "Publié" : "Dépublié", description: "Statut mis à jour." });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible de modifier le statut.",
        variant: "destructive",
      });
    }
  };

  const remove = async () => {
    if (!selectedRow) return;
    const ok = window.confirm(`Supprimer définitivement la clé:\n\n${selectedRow.key}\n\nCette action est irréversible.`);
    if (!ok) return;

    try {
      await del.mutateAsync({ id: selectedRow.id });
      toast({ title: "Supprimé", description: "Le contenu a été supprimé." });
      createNew();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Suppression impossible.",
        variant: "destructive",
      });
    }
  };

  const isBusy = list.isLoading || upsert.isPending || togglePublish.isPending || del.isPending;

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Back-Office — Contenu du site</h1>
          <p className="text-sm text-muted-foreground">
            Modifiez tous les textes du site. Recherche, édition, publication.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => list.refetch()} disabled={isBusy}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualiser
          </Button>
          <Button type="button" onClick={createNew} disabled={isBusy}>
            <Plus className="h-4 w-4 mr-2" />
            Nouvelle clé
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[420px_1fr]">
        {/* Left: List */}
        <Card className="overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tous les contenus</CardTitle>

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
          </CardHeader>

          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground mb-2">
              {list.isLoading ? "Chargement..." : `${filtered.length} élément(s)`}
            </div>

            <div className="max-h-[520px] overflow-auto pr-1">
              <div className="space-y-2">
                {filtered.map((r) => {
                  const active = r.id === selectedId;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={[
                        "w-full text-left rounded-xl border px-3 py-2 transition-colors",
                        active ? "border-primary bg-primary/10" : "border-border hover:bg-muted",
                      ].join(" ")}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{r.key}</div>
                          <div className="mt-1 text-xs text-muted-foreground line-clamp-1">
                            {(r.value ?? "").trim() ? r.value : "— vide —"}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={[
                              "text-[11px] px-2 py-0.5 rounded-full border",
                              r.is_published
                                ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                                : "border-amber-200 text-amber-700 bg-amber-50",
                            ].join(" ")}
                          >
                            {r.is_published ? "Publié" : "Brouillon"}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}

                {!list.isLoading && filtered.length === 0 && (
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
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-base">Éditeur</CardTitle>
                <div className="text-xs text-muted-foreground mt-1">
                  {selectedRow?.updated_at
                    ? `Dernière mise à jour: ${new Date(selectedRow.updated_at).toLocaleString()}`
                    : "Sélectionne un contenu ou crée une nouvelle clé."}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => toggle(!published)}
                  disabled={isBusy}
                >
                  {published ? (
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

                <Button type="button" onClick={save} disabled={isBusy || !dirty}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer
                </Button>

                <Button
                  type="button"
                  variant="destructive"
                  onClick={remove}
                  disabled={isBusy || !selectedRow}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Clé</label>
                <Input
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  placeholder="ex: home.hero.title"
                  disabled={isBusy}
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <select
                  value={typeInput}
                  onChange={(e) => setTypeInput(e.target.value)}
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
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Contenu</label>
              <Textarea
                value={valueInput}
                onChange={(e) => setValueInput(e.target.value)}
                rows={14}
                placeholder="Saisissez le contenu…"
                disabled={isBusy}
              />
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>{valueInput?.length ?? 0} caractère(s)</span>
                <span className="opacity-80">Locale: {LOCALE.toUpperCase()}</span>
              </div>
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="font-medium mb-1">Conseil</div>
              <div className="text-muted-foreground">
                Utilise des clés structurées (ex: <code>home.hero.title</code>,{" "}
                <code>footer.contact_hint</code>) pour garder ton contenu organisé.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
