import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useUpsertSiteContent, useSiteContent } from "@/hooks/useSiteContent";
import { useToast } from "@/components/ui/use-toast";

const keysPreset = [
  { key: "home.hero.title", label: "Accueil > Hero > Titre", type: "text" },
  { key: "home.hero.subtitle", label: "Accueil > Hero > Sous-titre", type: "text" },
  { key: "footer.contact_hint", label: "Footer > Contact > Helper line", type: "text" },
];

export default function AdminContent() {
  const { toast } = useToast();
  const [locale, setLocale] = React.useState<"fr" | "en">("fr");
  const [selectedKey, setSelectedKey] = React.useState(keysPreset[0].key);

  const currentPreset = keysPreset.find((k) => k.key === selectedKey)!;
  const { data, isLoading } = useSiteContent(selectedKey, locale);
  const upsert = useUpsertSiteContent();

  const [value, setValue] = React.useState("");

  React.useEffect(() => {
    setValue(data?.value ?? "");
  }, [data?.value, selectedKey, locale]);

  const onSave = async () => {
    try {
      await upsert.mutateAsync({
        key: selectedKey,
        locale,
        type: currentPreset.type,
        value,
        is_published: true,
      });

      toast({
        title: "Contenu enregistré",
        description: "La mise à jour est prise en compte immédiatement.",
      });
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Impossible d’enregistrer.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-xl font-semibold">Back-Office — Contenu du site</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les textes affichés sur le site (FR/EN).
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={locale === "fr" ? "default" : "outline"}
            onClick={() => setLocale("fr")}
          >
            FR
          </Button>
          <Button
            type="button"
            variant={locale === "en" ? "default" : "outline"}
            onClick={() => setLocale("en")}
          >
            EN
          </Button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Blocs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {keysPreset.map((k) => (
              <button
                key={k.key}
                type="button"
                onClick={() => setSelectedKey(k.key)}
                className={[
                  "w-full text-left rounded-xl border px-3 py-2 text-sm transition-colors",
                  selectedKey === k.key
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted",
                ].join(" ")}
              >
                <div className="font-medium">{k.label}</div>
                <div className="text-xs text-muted-foreground">{k.key}</div>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Éditeur</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <label className="text-xs text-muted-foreground">Clé</label>
                <Input value={selectedKey} readOnly />
              </div>
              <div>
                <label className="text-xs text-muted-foreground">Type</label>
                <Input value={currentPreset.type} readOnly />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground">Contenu</label>
              <Textarea
                value={value}
                onChange={(e) => setValue(e.target.value)}
                rows={8}
                placeholder="Saisissez le texte…"
                disabled={isLoading || upsert.isPending}
              />
              <div className="mt-2 text-xs text-muted-foreground">
                Dernière valeur: {data?.updated_at ? new Date(data.updated_at).toLocaleString() : "—"}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button type="button" onClick={onSave} disabled={upsert.isPending}>
                Enregistrer
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
