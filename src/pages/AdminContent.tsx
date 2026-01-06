// src/pages/AdminContent.tsx
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import {
  useUpsertSiteContent,
  useTogglePublishSiteContent,
} from "@/hooks/useSiteContent";

import {
  RefreshCw,
  Save,
  ListPlus,
  Eye,
  EyeOff,
  Search,
} from "lucide-react";

type Locale = "fr" | "en";
type SiteContentRow = {
  id: string;
  key: string;
  locale: Locale;
  type: string | null;
  value: string | null;
  is_published: boolean | null;
  updated_at?: string | null;
};

type FieldType = "text" | "textarea" | "url" | "number";
type FieldDef = {
  key: string;
  label: string;
  placeholder?: string;
  type: FieldType;
  help?: string;
};

type SectionDef = {
  id: string;
  title: string;
  description?: string;
  fields: FieldDef[];
};

const LOCALES: Locale[] = ["fr", "en"];

/**
 * ✅ SECTIONS = “CMS style capture”
 * Ajoute/ajuste ici les clés pour couvrir 100% du contenu de ton site.
 *
 * IMPORTANT:
 * - Certaines clés existent déjà chez toi (home.hero.title, footer.*, legal.*, contact.*, company.*...)
 * - D’autres clés ci-dessous sont “nouvelles” (ex: search.page.title, pricing.plan.monthly.price, etc.)
 *   => “Initialiser les sections” les crée en DB pour que tu puisses les éditer.
 *   => Ensuite, il faudra que ton FRONT utilise ces clés (si ce n’est pas déjà le cas).
 */
const SECTIONS: SectionDef[] = [
  {
    id: "header",
    title: "Header (Barre du haut)",
    description: "Texte sous le logo, labels d’actions et navigation.",
    fields: [
      { key: "header.tagline", label: "Tagline (sous le logo)", type: "text", placeholder: "Prestataires vérifiés, proches de vous" },
      { key: "header.btn_login", label: "Bouton Connexion", type: "text", placeholder: "Se connecter" },
      { key: "header.nav.dashboard", label: "Menu: Tableau de bord", type: "text", placeholder: "Tableau de bord" },
      { key: "header.nav.contact", label: "Menu: Demandes de contact", type: "text", placeholder: "Demandes de contact" },
      { key: "header.nav.providers", label: "Menu: Inscriptions prestataires", type: "text", placeholder: "Inscriptions prestataires" },
      { key: "header.nav.ads", label: "Menu: Publicités", type: "text", placeholder: "Publicités" },
      { key: "header.nav.faq", label: "Menu: Questions FAQ", type: "text", placeholder: "Questions FAQ" },
      { key: "header.nav.content", label: "Menu: Contenu du site", type: "text", placeholder: "Contenu du site" },
    ],
  },

  {
    id: "home_hero",
    title: "Accueil — Hero (Bannière bleue)",
    description: "Titre, sous-titre et zone de recherche.",
    fields: [
      { key: "home.hero.title", label: "Titre (H1)", type: "text", placeholder: "Trouvez des prestataires fiables près de chez vous" },
      { key: "home.hero.subtitle", label: "Sous-titre", type: "text", placeholder: "Comparez, contactez et réservez en toute confiance." },
      { key: "home.search.placeholder_keyword", label: "Placeholder métier", type: "text", placeholder: "Ex : plombier, électricien..." },
      { key: "home.search.placeholder_district", label: "Placeholder quartier/commune", type: "text", placeholder: "Quartier / commune" },
      { key: "home.search.btn_search", label: "Bouton Rechercher", type: "text", placeholder: "Rechercher" },
    ],
  },

  {
    id: "home_why",
    title: "Accueil — Section “Pourquoi ProxiServices ?”",
    description: "Titre + sous-titre au-dessus des cartes.",
    fields: [
      { key: "home.features.title", label: "Titre", type: "text", placeholder: "Pourquoi ProxiServices ?" },
      { key: "home.features.subtitle", label: "Sous-titre", type: "text", placeholder: "Des pros vérifiés, un contact simple, des avis utiles." },
    ],
  },

  {
    id: "home_cards",
    title: "Accueil — 3 cartes (avantages)",
    description: "Les trois blocs principaux (titre + description).",
    fields: [
      { key: "home.features.card1.title", label: "Carte 1 — Titre", type: "text", placeholder: "Prestataires vérifiés" },
      { key: "home.features.card1.desc", label: "Carte 1 — Description", type: "textarea", placeholder: "Profils contrôlés et informations utiles." },

      { key: "home.features.card2.title", label: "Carte 2 — Titre", type: "text", placeholder: "Contact rapide" },
      { key: "home.features.card2.desc", label: "Carte 2 — Description", type: "textarea", placeholder: "Discutez et obtenez un devis simplement." },

      { key: "home.features.card3.title", label: "Carte 3 — Titre", type: "text", placeholder: "Avis & confiance" },
      { key: "home.features.card3.desc", label: "Carte 3 — Description", type: "textarea", placeholder: "Évaluations pour choisir en toute sérénité." },
    ],
  },

  {
    id: "home_stats",
    title: "Accueil — Statistiques (4 valeurs)",
    description: "La ligne 2 500+, 4.8/5, 24h, 100%.",
    fields: [
      { key: "home.stats.item1.value", label: "Stat 1 — Valeur", type: "text", placeholder: "2 500+" },
      { key: "home.stats.item1.label", label: "Stat 1 — Libellé", type: "text", placeholder: "Professionnels" },

      { key: "home.stats.item2.value", label: "Stat 2 — Valeur", type: "text", placeholder: "4.8/5" },
      { key: "home.stats.item2.label", label: "Stat 2 — Libellé", type: "text", placeholder: "Note moyenne" },

      { key: "home.stats.item3.value", label: "Stat 3 — Valeur", type: "text", placeholder: "24h" },
      { key: "home.stats.item3.label", label: "Stat 3 — Libellé", type: "text", placeholder: "Temps de réponse" },

      { key: "home.stats.item4.value", label: "Stat 4 — Valeur", type: "text", placeholder: "100%" },
      { key: "home.stats.item4.label", label: "Stat 4 — Libellé", type: "text", placeholder: "Profils vérifiés" },
    ],
  },

  {
    id: "search_page",
    title: "Page Recherche — En-tête & filtres",
    description: "Titre et micro-textes de la page “Trouvez votre professionnel”.",
    fields: [
      { key: "search.page.title", label: "Titre", type: "text", placeholder: "Trouvez votre professionnel" },
      { key: "search.page.subtitle", label: "Sous-titre", type: "text", placeholder: "Modifiez vos filtres pour lancer la recherche automatiquement." },
      { key: "search.filters.title", label: "Bloc filtres — Titre", type: "text", placeholder: "Filtres" },
      { key: "search.filters.btn_reset", label: "Bouton Réinitialiser", type: "text", placeholder: "Réinitialiser" },
      { key: "search.filters.btn_geolocate", label: "Bouton Utiliser ma position", type: "text", placeholder: "Utiliser ma position" },
      { key: "search.view.list", label: "Affichage — Liste", type: "text", placeholder: "Liste" },
      { key: "search.view.grid", label: "Affichage — Mosaïque", type: "text", placeholder: "Mosaïque" },
      { key: "search.card.btn_contact", label: "Bouton Contacter (carte)", type: "text", placeholder: "Contacter" },
      { key: "search.card.price_suffix", label: "Suffixe tarif", type: "text", placeholder: "GNF /h" },
    ],
  },

  {
    id: "pricing",
    title: "Abonnements — Cartes (Gratuit / Mensuel / Annuel)",
    description: "Titres, prix, boutons, avantages.",
    fields: [
      { key: "pricing.section.title", label: "Titre section", type: "text", placeholder: "Rejoignez ProxiServices" },
      { key: "pricing.section.subtitle", label: "Sous-titre", type: "text", placeholder: "Développez votre activité avec plus de visibilité" },

      { key: "pricing.plan.free.name", label: "Plan 1 — Nom", type: "text", placeholder: "Gratuit" },
      { key: "pricing.plan.free.price", label: "Plan 1 — Prix", type: "text", placeholder: "0" },
      { key: "pricing.plan.free.period", label: "Plan 1 — Période", type: "text", placeholder: "FG/mois" },
      { key: "pricing.plan.free.btn", label: "Plan 1 — Bouton", type: "text", placeholder: "Choisir ce plan" },
      { key: "pricing.plan.free.f1", label: "Plan 1 — Avantage 1", type: "text", placeholder: "1 métier affiché" },
      { key: "pricing.plan.free.f2", label: "Plan 1 — Avantage 2", type: "text", placeholder: "Profil simplifié" },
      { key: "pricing.plan.free.f3", label: "Plan 1 — Avantage 3", type: "text", placeholder: "Nombre de contacts limité" },
      { key: "pricing.plan.free.f4", label: "Plan 1 — Avantage 4", type: "text", placeholder: "Pas de mise en avant" },

      { key: "pricing.plan.monthly.badge", label: "Plan 2 — Badge", type: "text", placeholder: "Populaire" },
      { key: "pricing.plan.monthly.name", label: "Plan 2 — Nom", type: "text", placeholder: "Mensuel" },
      { key: "pricing.plan.monthly.price", label: "Plan 2 — Prix", type: "text", placeholder: "5 000" },
      { key: "pricing.plan.monthly.period", label: "Plan 2 — Période", type: "text", placeholder: "FG/mois" },
      { key: "pricing.plan.monthly.ribbon", label: "Plan 2 — Bandeau", type: "text", placeholder: "Sans engagement" },
      { key: "pricing.plan.monthly.btn", label: "Plan 2 — Bouton", type: "text", placeholder: "Choisir ce plan" },
      { key: "pricing.plan.monthly.f1", label: "Plan 2 — Avantage 1", type: "text", placeholder: "Profil professionnel complet" },
      { key: "pricing.plan.monthly.f2", label: "Plan 2 — Avantage 2", type: "text", placeholder: "Contacts clients illimités" },
      { key: "pricing.plan.monthly.f3", label: "Plan 2 — Avantage 3", type: "text", placeholder: "Statistiques détaillées" },
      { key: "pricing.plan.monthly.f4", label: "Plan 2 — Avantage 4", type: "text", placeholder: "Support prioritaire" },

      { key: "pricing.plan.yearly.name", label: "Plan 3 — Nom", type: "text", placeholder: "Annuel" },
      { key: "pricing.plan.yearly.price", label: "Plan 3 — Prix", type: "text", placeholder: "50 000" },
      { key: "pricing.plan.yearly.period", label: "Plan 3 — Période", type: "text", placeholder: "FG/an" },
      { key: "pricing.plan.yearly.ribbon", label: "Plan 3 — Bandeau", type: "text", placeholder: "2 mois offerts" },
      { key: "pricing.plan.yearly.btn", label: "Plan 3 — Bouton", type: "text", placeholder: "Choisir ce plan" },
      { key: "pricing.plan.yearly.f1", label: "Plan 3 — Avantage 1", type: "text", placeholder: "Profil professionnel complet" },
      { key: "pricing.plan.yearly.f2", label: "Plan 3 — Avantage 2", type: "text", placeholder: "Contacts clients illimités" },
      { key: "pricing.plan.yearly.f3", label: "Plan 3 — Avantage 3", type: "text", placeholder: "Statistiques détaillées" },
      { key: "pricing.plan.yearly.f4", label: "Plan 3 — Avantage 4", type: "text", placeholder: "Support prioritaire" },
    ],
  },

  {
    id: "footer",
    title: "Footer — Colonnes + Contact",
    description: "Brand, colonnes Services/Entreprise/Ressources/Contact + valeurs.",
    fields: [
      { key: "footer.brand.tagline", label: "Brand — Tagline", type: "text", placeholder: "Marketplace de services" },
      { key: "footer.brand.desc", label: "Brand — Description", type: "textarea", placeholder: "Trouvez des prestataires fiables près de chez vous, en quelques minutes." },

      { key: "footer.services.title", label: "Colonne Services — Titre", type: "text", placeholder: "Services" },
      { key: "footer.services.more", label: "Services — Lien “Découvrir”", type: "text", placeholder: "Découvrir →" },

      { key: "footer.company.title", label: "Colonne Entreprise — Titre", type: "text", placeholder: "Entreprise" },
      { key: "footer.resources.title", label: "Colonne Ressources — Titre", type: "text", placeholder: "Ressources" },
      { key: "footer.contact.title", label: "Colonne Contact — Titre", type: "text", placeholder: "Contact" },
      { key: "footer.contact.cta", label: "Contact — Phrase support", type: "text", placeholder: "Support sous 24–48h (jours ouvrés)." },

      { key: "footer.contact.label_email", label: "Label Email", type: "text", placeholder: "Email" },
      { key: "footer.contact.label_phone", label: "Label Téléphone", type: "text", placeholder: "Téléphone" },
      { key: "footer.contact.label_hours", label: "Label Horaires", type: "text", placeholder: "Horaires" },
      { key: "footer.contact.label_zone", label: "Label Zone", type: "text", placeholder: "Zone" },

      { key: "footer.location.value", label: "Zone (valeur)", type: "text", placeholder: "Conakry (et environs)" },
      { key: "footer.hours.value", label: "Horaires (valeur)", type: "text", placeholder: "Lun–Ven : 09:00–18:00" },

      { key: "footer.contact.button", label: "Bouton Contact support", type: "text", placeholder: "Contacter le support" },

      { key: "footer.bottom.rights", label: "Bas de page — Droits", type: "text", placeholder: "© 2026 ProxiServices. Tous droits réservés." },
      { key: "legal.terms.title", label: "Lien bas — Conditions d’utilisation", type: "text", placeholder: "Conditions d’utilisation" },
      { key: "legal.privacy.title", label: "Lien bas — Politique de confidentialité", type: "text", placeholder: "Politique de confidentialité" },
      { key: "legal.cookies.title", label: "Lien bas — Cookies", type: "text", placeholder: "Cookies" },
    ],
  },

  {
    id: "company",
    title: "Entreprise — À propos / Partenaires",
    description: "Contenus de la page Entreprise.",
    fields: [
      { key: "company.about.title", label: "À propos — Titre", type: "text", placeholder: "À propos" },
      { key: "company.about.body", label: "À propos — Texte", type: "textarea", placeholder: "ProxiServices connecte clients et prestataires vérifiés..." },
      { key: "company.partners.title", label: "Partenaires — Titre", type: "text", placeholder: "Partenaires" },
      { key: "company.partners.body", label: "Partenaires — Texte", type: "textarea", placeholder: "Texte partenaires..." },
    ],
  },

  {
    id: "contact",
    title: "Contact — Modal / Formulaire",
    description: "Labels et messages du formulaire de contact.",
    fields: [
      { key: "contact.modal.title", label: "Titre modal", type: "text", placeholder: "Contact" },
      { key: "contact.modal.desc", label: "Description modal", type: "text", placeholder: "Expliquez votre besoin..." },
      { key: "contact.form.email", label: "Label Email", type: "text", placeholder: "Email" },
      { key: "contact.form.subject", label: "Label Sujet", type: "text", placeholder: "Sujet" },
      { key: "contact.form.message", label: "Label Message", type: "text", placeholder: "Message" },
      { key: "contact.form.btn_send", label: "Bouton Envoyer", type: "text", placeholder: "Envoyer" },
      { key: "contact.form.success", label: "Message succès", type: "text", placeholder: "Message envoyé." },
      { key: "contact.form.error", label: "Message erreur", type: "text", placeholder: "Une erreur est survenue." },
    ],
  },

  {
    id: "legal",
    title: "Pages légales — Conditions / Confidentialité / Cookies",
    description: "Titres + contenus (longs).",
    fields: [
      { key: "legal.terms.title", label: "Conditions — Titre", type: "text", placeholder: "Conditions d’utilisation" },
      { key: "legal.terms.body", label: "Conditions — Contenu", type: "textarea", placeholder: "Texte conditions..." },

      { key: "legal.privacy.title", label: "Confidentialité — Titre", type: "text", placeholder: "Politique de confidentialité" },
      { key: "legal.privacy.body", label: "Confidentialité — Contenu", type: "textarea", placeholder: "Texte confidentialité..." },

      { key: "legal.cookies.title", label: "Cookies — Titre", type: "text", placeholder: "Cookies" },
      { key: "legal.cookies.body", label: "Cookies — Contenu", type: "textarea", placeholder: "Texte cookies..." },
    ],
  },
];

function inputType(t: FieldType) {
  if (t === "url") return "url";
  if (t === "number") return "number";
  return "text";
}

function normalizeNumberString(v: string) {
  const s = (v ?? "").toString().trim();
  if (!s) return "";
  const n = Number(s);
  return Number.isFinite(n) ? String(n) : s;
}

function pillClasses(visible: boolean) {
  return visible
    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border-slate-200 bg-slate-50 text-slate-600";
}

export default function AdminContent() {
  const { toast } = useToast();
  const upsert = useUpsertSiteContent();
  const togglePublish = useTogglePublishSiteContent();

  const [activeLocale, setActiveLocale] = React.useState<Locale>("fr");
  const [q, setQ] = React.useState("");

  const ALL_KEYS = React.useMemo(
    () => Array.from(new Set(SECTIONS.flatMap((s) => s.fields.map((f) => f.key)))).sort(),
    []
  );

  const list = useQuery({
    queryKey: ["site_content_sections_full", ALL_KEYS.join("|")],
    queryFn: async (): Promise<SiteContentRow[]> => {
      const { data, error } = await supabase
        .from("site_content")
        .select("id,key,locale,type,value,is_published,updated_at")
        .in("key", ALL_KEYS)
        .in("locale", LOCALES)
        .order("key", { ascending: true })
        .order("locale", { ascending: true });

      if (error) throw error;
      return (data ?? []) as SiteContentRow[];
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  const rows = list.data ?? [];
  const isBusy = list.isLoading || upsert.isPending || togglePublish.isPending;

  const rowByKeyLocale = React.useMemo(() => {
    const map = new Map<string, SiteContentRow>();
    for (const r of rows) map.set(`${r.key}__${r.locale}`, r);
    return map;
  }, [rows]);

  const getRow = React.useCallback(
    (key: string, locale: Locale) => rowByKeyLocale.get(`${key}__${locale}`) ?? null,
    [rowByKeyLocale]
  );

  // drafts[locale][sectionId][key] = value
  const [drafts, setDrafts] = React.useState<Record<Locale, Record<string, Record<string, string>>>>({
    fr: {},
    en: {},
  });

  // visibleByLocale[locale][sectionId] = boolean (publish status)
  const [visibleByLocale, setVisibleByLocale] = React.useState<Record<Locale, Record<string, boolean>>>({
    fr: {},
    en: {},
  });

  // Load DB into drafts when data changes
  React.useEffect(() => {
    const nextDrafts: Record<Locale, Record<string, Record<string, string>>> = { fr: {}, en: {} };
    const nextVisible: Record<Locale, Record<string, boolean>> = { fr: {}, en: {} };

    for (const loc of LOCALES) {
      for (const section of SECTIONS) {
        const d: Record<string, string> = {};
        let anyPublished = false;

        for (const f of section.fields) {
          const r = getRow(f.key, loc);
          const v = (r?.value ?? "").toString();
          d[f.key] = f.type === "number" ? normalizeNumberString(v) : v;
          if (Boolean(r?.is_published)) anyPublished = true;
        }

        nextDrafts[loc][section.id] = d;
        nextVisible[loc][section.id] = anyPublished;
      }
    }

    setDrafts(nextDrafts);
    setVisibleByLocale(nextVisible);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowByKeyLocale]);

  const setDraft = (loc: Locale, sectionId: string, key: string, value: string) => {
    setDrafts((prev) => ({
      ...prev,
      [loc]: {
        ...(prev[loc] ?? {}),
        [sectionId]: {
          ...((prev[loc] ?? {})[sectionId] ?? {}),
          [key]: value,
        },
      },
    }));
  };

  const toggleSectionVisible = async (loc: Locale, sectionId: string, next: boolean) => {
    setVisibleByLocale((p) => ({ ...p, [loc]: { ...(p[loc] ?? {}), [sectionId]: next } }));

    // appliquer immédiatement sur les rows existantes (si elles existent déjà)
    try {
      const section = SECTIONS.find((s) => s.id === sectionId);
      if (!section) return;

      const tasks: Promise<any>[] = [];
      for (const f of section.fields) {
        const row = getRow(f.key, loc);
        if (row?.id) tasks.push(togglePublish.mutateAsync({ id: row.id, is_published: next }));
      }
      if (tasks.length) await Promise.all(tasks);
      await list.refetch();
    } catch {
      // si erreur, l’état UI reste, et la sauvegarde consolidera
    }
  };

  const saveSection = async (loc: Locale, sectionId: string) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    try {
      const visible = Boolean((visibleByLocale[loc] ?? {})[sectionId]);
      const values = ((drafts[loc] ?? {})[sectionId] ?? {}) as Record<string, string>;

      await Promise.all(
        section.fields.map((f) =>
          upsert.mutateAsync({
            key: f.key,
            locale: loc,
            type: "text",
            value: (values[f.key] ?? "").toString(),
            is_published: visible,
          })
        )
      );

      toast({
        title: "Enregistré",
        description: `${section.title} (${loc.toUpperCase()}) mis à jour.`,
      });

      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Enregistrement impossible.",
        variant: "destructive",
      });
    }
  };

  const initSections = async () => {
    if (isBusy) return;

    const ok = window.confirm(
      "Initialiser toutes les sections ?\n\n- Crée toutes les clés définies dans le back-office\n- FR + EN\n- Valeurs vides\n- Brouillon (non publié)\n\nAucun écrasement des valeurs existantes."
    );
    if (!ok) return;

    try {
      let created = 0;

      for (const section of SECTIONS) {
        for (const field of section.fields) {
          for (const loc of LOCALES) {
            const existing = getRow(field.key, loc);
            if (existing) continue;
            await upsert.mutateAsync({
              key: field.key,
              locale: loc,
              type: "text",
              value: "",
              is_published: false,
            });
            created += 1;
          }
        }
      }

      toast({
        title: "Initialisation terminée",
        description: created ? `${created} entrée(s) créée(s).` : "Rien à créer.",
      });

      await list.refetch();
    } catch (e: any) {
      toast({
        title: "Erreur",
        description: e?.message ?? "Initialisation impossible.",
        variant: "destructive",
      });
    }
  };

  const filteredSections = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return SECTIONS;

    return SECTIONS.filter((s) => {
      if (s.title.toLowerCase().includes(query)) return true;
      if ((s.description ?? "").toLowerCase().includes(query)) return true;

      // cherche aussi dans les labels / clés / contenu du locale actif
      const d = (drafts[activeLocale]?.[s.id] ?? {}) as Record<string, string>;
      return s.fields.some((f) => {
        if (f.label.toLowerCase().includes(query)) return true;
        if (f.key.toLowerCase().includes(query)) return true;
        const v = (d[f.key] ?? "").toLowerCase();
        return v.includes(query);
      });
    });
  }, [q, drafts, activeLocale]);

  const sectionVisible = (loc: Locale, sectionId: string) =>
    Boolean((visibleByLocale[loc] ?? {})[sectionId]);

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h1 className="text-lg font-semibold">Contenu du site</h1>
          <p className="text-sm text-muted-foreground">
            Modifie toutes les sections visibles sur ton site (accueil, recherche, abonnements, footer, pages légales…).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Tabs value={activeLocale} onValueChange={(v) => setActiveLocale(v as Locale)}>
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="fr">FR</TabsTrigger>
              <TabsTrigger value="en">EN</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={() => list.refetch()} disabled={isBusy}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recharger
            </Button>
            <Button type="button" variant="outline" onClick={initSections} disabled={isBusy}>
              <ListPlus className="h-4 w-4 mr-2" />
              Initialiser les sections
            </Button>
          </div>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative max-w-2xl">
            <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher une section, un label, une clé, ou un contenu…"
              className="pl-9"
              disabled={isBusy}
            />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            {list.isLoading ? "Chargement…" : `${filteredSections.length} section(s)`}
          </div>
          {list.isError ? (
            <div className="mt-2 rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
              {(list.error as any)?.message ?? "Erreur de chargement"}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Sections grid (responsive like capture) */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3">
        {filteredSections.map((section) => {
          const visible = sectionVisible(activeLocale, section.id);
          const d = (drafts[activeLocale]?.[section.id] ?? {}) as Record<string, string>;

          return (
            <Card key={section.id} className="min-w-0">
              <CardContent className="p-4 space-y-4">
                {/* Section header */}
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="text-xs text-muted-foreground">SECTION</div>
                    <div className="text-sm font-semibold">{section.title}</div>
                    {section.description ? (
                      <div className="text-xs text-muted-foreground mt-1">
                        {section.description}
                      </div>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={[
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
                        pillClasses(visible),
                      ].join(" ")}
                    >
                      {visible ? "Affichée" : "Masquée"}
                    </span>

                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={visible}
                        onChange={(e) => toggleSectionVisible(activeLocale, section.id, e.target.checked)}
                        disabled={isBusy}
                      />
                      Visible sur le site
                    </label>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid gap-3">
                  {section.fields.map((f) => {
                    const val = (d[f.key] ?? "").toString();

                    if (f.type === "textarea") {
                      return (
                        <div key={f.key} className="space-y-1">
                          <div className="text-xs text-muted-foreground">{f.label}</div>
                          <Textarea
                            value={val}
                            onChange={(e) => setDraft(activeLocale, section.id, f.key, e.target.value)}
                            placeholder={f.placeholder}
                            rows={4}
                            className="min-h-[110px]"
                            disabled={isBusy}
                          />
                          {f.help ? (
                            <div className="text-[11px] text-muted-foreground">{f.help}</div>
                          ) : null}
                        </div>
                      );
                    }

                    return (
                      <div key={f.key} className="space-y-1">
                        <div className="text-xs text-muted-foreground">{f.label}</div>
                        <Input
                          type={inputType(f.type)}
                          value={val}
                          onChange={(e) => setDraft(activeLocale, section.id, f.key, e.target.value)}
                          placeholder={f.placeholder}
                          disabled={isBusy}
                        />
                        {f.help ? (
                          <div className="text-[11px] text-muted-foreground">{f.help}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                {/* Footer actions */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {visible ? (
                      <>
                        <Eye className="h-4 w-4" />
                        Visible (publié à l’enregistrement)
                      </>
                    ) : (
                      <>
                        <EyeOff className="h-4 w-4" />
                        Masqué (brouillon à l’enregistrement)
                      </>
                    )}
                  </div>

                  <Button
                    type="button"
                    onClick={() => saveSection(activeLocale, section.id)}
                    disabled={isBusy}
                    className="sm:w-auto w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
