// src/pages/AdminContent.tsx
import * as React from "react";
import { supabase } from "@/lib/supabase";
import { useQuery } from "@tanstack/react-query";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";

import { useUpsertSiteContent, useTogglePublishSiteContent } from "@/hooks/useSiteContent";

import {
  RefreshCw,
  Save,
  ListPlus,
  Eye,
  EyeOff,
  Search,
  Copy,
  ExternalLink,
  ChevronRight,
  LayoutList,
  Globe,
  AlertTriangle,
} from "lucide-react";

type Locale = "fr" | "en";
type LocaleMode = "fr" | "en" | "compare";

type SiteContentRow = {
  id: string;
  key: string;
  locale: Locale;
  type: string | null;
  value: string | null;
  is_published: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
  updated_by?: string | null;
  en_is_auto?: boolean | null;
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
  location?: string;
};

const LOCALES: Locale[] = ["fr", "en"];

/**
 * ✅ SECTIONS = “CMS style capture”
 * Ajoute/ajuste ici les clés pour couvrir 100% du contenu de ton site.
 *
 * ✅ AJOUT IMPORTANT :
 * - pricing.section.enabled : switch explicite pour afficher/masquer la section abonnements
 *   (1/true/on/yes = visible, 0/empty = masqué côté front si ton SubscriptionSection utilise ce switch)
 */
const SECTIONS: SectionDef[] = [
  {
    id: "header",
    title: "Header (Barre du haut)",
    description: "Logo, tagline, boutons, langue et menu mobile.",
    fields: [
      { key: "brand.name", label: "Nom de la marque (logo)", type: "text", placeholder: "ProxiServices" },
      { key: "header.tagline", label: "Tagline (sous le logo)", type: "text", placeholder: "Prestataires vérifiés, proches de vous" },

      { key: "header.btn_login", label: "Bouton (non connecté)", type: "text", placeholder: "Se connecter" },
      { key: "header.btn_account", label: "Bouton (connecté)", type: "text", placeholder: "Mon compte" },
      { key: "header.btn_account_short", label: "Bouton mobile (court)", type: "text", placeholder: "Compte" },

      { key: "header.admin_badge", label: "Badge Admin", type: "text", placeholder: "Admin" },

      { key: "header.lang.aria", label: "Accessibilité - changer langue (aria-label)", type: "text", placeholder: "Changer de langue" },
      { key: "header.lang.fr", label: "Langue - Français (label)", type: "text", placeholder: "Français" },
      { key: "header.lang.en", label: "Langue - Anglais (label)", type: "text", placeholder: "Anglais" },

      { key: "header.mobile_menu.aria", label: "Menu mobile (aria-label)", type: "text", placeholder: "Menu mobile" },
      { key: "header.mobile_close.aria", label: "Fermer menu (aria-label)", type: "text", placeholder: "Fermer le menu" },
      { key: "header.mobile_menu.title", label: "Titre du drawer mobile", type: "text", placeholder: "Menu" },
    ],
  },

  {
    id: "home_hero",
    title: "Accueil — Hero (Bannière bleue)",
    location: "Accueil > Hero",
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
    location: "Accueil > Pourquoi",
    description: "Titre + sous-titre au-dessus des cartes.",
    fields: [
      { key: "home.features.title", label: "Titre", type: "text", placeholder: "Pourquoi ProxiServices ?" },
      { key: "home.features.subtitle", label: "Sous-titre", type: "text", placeholder: "Des pros vérifiés, un contact simple, des avis utiles." },
    ],
  },

  {
    id: "home_cards",
    title: "Accueil — 3 cartes (avantages)",
    location: "Accueil > Avantages",
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
    location: "Accueil > Statistiques",
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
    location: "Recherche > En-tête & Filtres",
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
    location: "Accueil > Abonnements",
    description: "Titres, prix, boutons, avantages.",
    fields: [
      // ✅ Switch explicite
      {
        key: "pricing.section.enabled",
        label: "Activer la section Abonnements (1=true=on=yes = actif, 0/empty = masqué)",
        type: "text",
        placeholder: "0",
        help: "Conseil: mets 0 tant que tu ne veux pas afficher les abonnements. Mets 1 quand tu voudras les activer.",
      },

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

      { key: "pricing.benefit1.title", label: "Bénéfice 1 — Titre", type: "text", placeholder: "Profil vérifié" },
      { key: "pricing.benefit1.desc", label: "Bénéfice 1 — Description", type: "textarea", placeholder: "Badge de confiance sur votre profil" },

      { key: "pricing.benefit2.title", label: "Bénéfice 2 — Titre", type: "text", placeholder: "Analytics détaillés" },
      { key: "pricing.benefit2.desc", label: "Bénéfice 2 — Description", type: "textarea", placeholder: "Suivez vos performances et optimisez" },

      { key: "pricing.benefit3.title", label: "Bénéfice 3 — Titre", type: "text", placeholder: "Support dédié" },
      { key: "pricing.benefit3.desc", label: "Bénéfice 3 — Description", type: "textarea", placeholder: "Assistance prioritaire 7j/7" },

      { key: "pricing.currency", label: "Devise affichée (ex: FG / GNF)", type: "text", placeholder: "FG" },
      { key: "pricing.price_separator", label: "Séparateur prix/période (ex: /)", type: "text", placeholder: "/" },
    ],
  },

  {
    id: "footer",
    title: "Footer — Colonnes + Contact",
    location: "Toutes pages > Footer",
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
    location: "Entreprise > Page",
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
    location: "Toutes pages > Modale Contact",
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
    location: "Pages légales",
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

function fmtDate(ts?: string | null) {
  if (!ts) return "";
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return ts;
  return d.toLocaleString();
}

function isEmptyValue(v: unknown) {
  return (v ?? "").toString().trim().length === 0;
}

function sectionCategory(sectionId: string) {
  if (sectionId.startsWith("home_")) return "Accueil";
  if (sectionId.startsWith("search_")) return "Recherche";
  if (sectionId === "pricing") return "Abonnements";
  if (sectionId === "footer") return "Footer";
  if (sectionId === "legal") return "Légal";
  if (sectionId === "company") return "Entreprise";
  if (sectionId === "contact") return "Contact";
  if (sectionId === "header") return "Header";
  return "Autres";
}

function badgeClasses(kind: "published" | "draft" | "missing" | "auto") {
  switch (kind) {
    case "published":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "draft":
      return "border-slate-200 bg-slate-50 text-slate-700";
    case "missing":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "auto":
      return "border-indigo-200 bg-indigo-50 text-indigo-700";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
}

function Pill({ children, kind }: { children: React.ReactNode; kind: "published" | "draft" | "missing" | "auto" }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-medium",
        badgeClasses(kind),
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export default function AdminContent() {
  const { toast } = useToast();
  const upsert = useUpsertSiteContent();
  const togglePublish = useTogglePublishSiteContent();

  const [mode, setMode] = React.useState<LocaleMode>("fr");
  const activeLocale: Locale = mode === "en" ? "en" : "fr";
  const [q, setQ] = React.useState("");
  const [activeSectionId, setActiveSectionId] = React.useState<string>(SECTIONS[0]?.id ?? "header");

  const ALL_KEYS = React.useMemo(
    () => Array.from(new Set(SECTIONS.flatMap((s) => s.fields.map((f) => f.key)))).sort(),
    []
  );

  const list = useQuery({
    queryKey: ["site_content_sections_full_v3", ALL_KEYS.join("|")],
    queryFn: async (): Promise<SiteContentRow[]> => {
      const { data, error } = await supabase
        .from("site_content")
        .select("id,key,locale,type,value,is_published,created_at,updated_at,updated_by,en_is_auto")
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

  const [drafts, setDrafts] = React.useState<Record<Locale, Record<string, Record<string, string>>>>({
    fr: {},
    en: {},
  });

  const [visibleByLocale, setVisibleByLocale] = React.useState<Record<Locale, Record<string, boolean>>>({
    fr: {},
    en: {},
  });

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

  const sectionVisible = (loc: Locale, sectionId: string) => Boolean((visibleByLocale[loc] ?? {})[sectionId]);

  const toggleSectionVisible = async (loc: Locale, sectionId: string, next: boolean) => {
    setVisibleByLocale((p) => ({ ...p, [loc]: { ...(p[loc] ?? {}), [sectionId]: next } }));

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
      // tolérant
    }
  };

  const saveSection = async (sectionId: string) => {
    const section = SECTIONS.find((s) => s.id === sectionId);
    if (!section) return;

    try {
      const doSaveLocale = async (loc: Locale) => {
        const visible = sectionVisible(loc, sectionId);
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
      };

      if (mode === "compare") {
        await Promise.all([doSaveLocale("fr"), doSaveLocale("en")]);
        toast({ title: "Enregistré", description: `${section.title} (FR + EN) mis à jour.` });
      } else {
        await doSaveLocale(mode);
        toast({ title: "Enregistré", description: `${section.title} (${mode.toUpperCase()}) mis à jour.` });
      }

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

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({ title: "Copié", description: "La clé a été copiée dans le presse-papiers." });
    } catch {
      toast({
        title: "Copie impossible",
        description: "Votre navigateur a bloqué l’accès au presse-papiers.",
        variant: "destructive",
      });
    }
  };

  // ✅ "manquant" = uniquement si la clé n'existe pas (row absent)
  const globalStats = React.useMemo(() => {
    let published = 0;
    let draft = 0;
    let missingFR = 0;
    let missingEN = 0;
    let autoEN = 0;

    for (const section of SECTIONS) {
      for (const f of section.fields) {
        const fr = getRow(f.key, "fr");
        const en = getRow(f.key, "en");

        if (!fr) missingFR += 1;
        if (!en) missingEN += 1;

        if (en?.en_is_auto) autoEN += 1;

        const anyPublished = Boolean(fr?.is_published) || Boolean(en?.is_published);
        if (anyPublished) published += 1;
        else draft += 1;
      }
    }

    return { published, draft, missingFR, missingEN, autoEN };
  }, [getRow]);

  const filteredSections = React.useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return SECTIONS;

    return SECTIONS.filter((s) => {
      if (s.title.toLowerCase().includes(query)) return true;
      if ((s.description ?? "").toLowerCase().includes(query)) return true;
      if ((s.location ?? "").toLowerCase().includes(query)) return true;

      const dFR = (drafts.fr?.[s.id] ?? {}) as Record<string, string>;
      const dEN = (drafts.en?.[s.id] ?? {}) as Record<string, string>;
      const dActive = (drafts[activeLocale]?.[s.id] ?? {}) as Record<string, string>;

      return s.fields.some((f) => {
        if (f.label.toLowerCase().includes(query)) return true;
        if (f.key.toLowerCase().includes(query)) return true;
        const vActive = (dActive[f.key] ?? "").toLowerCase();
        const vFr = (dFR[f.key] ?? "").toLowerCase();
        const vEn = (dEN[f.key] ?? "").toLowerCase();
        return vActive.includes(query) || vFr.includes(query) || vEn.includes(query);
      });
    });
  }, [q, drafts, activeLocale]);

  React.useEffect(() => {
    if (!filteredSections.some((s) => s.id === activeSectionId)) {
      setActiveSectionId(filteredSections[0]?.id ?? SECTIONS[0]?.id ?? "header");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const activeSection = React.useMemo(
    () => SECTIONS.find((s) => s.id === activeSectionId) ?? SECTIONS[0],
    [activeSectionId]
  );

  const sectionSummary = React.useCallback(
    (section: SectionDef) => {
      const loc = mode === "en" ? "en" : "fr";
      const d = (drafts[loc]?.[section.id] ?? {}) as Record<string, string>;
      const missing: string[] = [];
      let autoCount = 0;

      for (const f of section.fields) {
        const rFR = getRow(f.key, "fr");
        const rEN = getRow(f.key, "en");

        if (!rFR) missing.push("FR");
        if (!rEN) missing.push("EN");

        if (rEN?.en_is_auto) autoCount += 1;
      }

      const missingSet = new Set(missing);
      const visibleFR = sectionVisible("fr", section.id);
      const visibleEN = sectionVisible("en", section.id);

      let lastUpdated: string | null = null;
      for (const f of section.fields) {
        const r = getRow(f.key, loc);
        const ts = r?.updated_at ?? null;
        if (!ts) continue;
        if (!lastUpdated || new Date(ts).getTime() > new Date(lastUpdated).getTime()) lastUpdated = ts;
      }

      const filledCount = section.fields.reduce((acc, f) => {
        const v = (d[f.key] ?? "").toString().trim();
        return acc + (v ? 1 : 0);
      }, 0);

      return {
        category: sectionCategory(section.id),
        filledCount,
        totalCount: section.fields.length,
        missingSet,
        autoCount,
        visibleFR,
        visibleEN,
        lastUpdated,
      };
    },
    [drafts, getRow, mode, sectionVisible]
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">Contenu du site</h1>
            <Pill kind="published">{globalStats.published} publié(s)</Pill>
            <Pill kind="draft">{globalStats.draft} brouillon(s)</Pill>
            {(globalStats.missingFR + globalStats.missingEN) > 0 ? (
              <Pill kind="missing">{globalStats.missingFR + globalStats.missingEN} clé(s) manquante(s)</Pill>
            ) : null}
            {globalStats.autoEN > 0 ? <Pill kind="auto">{globalStats.autoEN} EN auto</Pill> : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Gère les textes visibles (Accueil, Recherche, Abonnements, Footer, Légal…). Consulte les clés, statuts et historiques.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <Tabs value={mode} onValueChange={(v) => setMode(v as LocaleMode)}>
            <TabsList className="grid grid-cols-3">
              <TabsTrigger value="fr">FR</TabsTrigger>
              <TabsTrigger value="en">EN</TabsTrigger>
              <TabsTrigger value="compare">Comparer</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open("/", "_blank", "noopener,noreferrer")}
              disabled={isBusy}
              title="Ouvrir le site"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Retour au site
            </Button>

            <Button type="button" variant="outline" onClick={() => list.refetch()} disabled={isBusy}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Recharger
            </Button>

            <Button type="button" variant="outline" onClick={initSections} disabled={isBusy}>
              <ListPlus className="h-4 w-4 mr-2" />
              Initialiser
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <Card className="lg:col-span-4 xl:col-span-3">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <LayoutList className="h-4 w-4" />
              Sections
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="relative">
              <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Rechercher (section, clé, texte)…"
                className="pl-9"
                disabled={isBusy}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{list.isLoading ? "Chargement…" : `${filteredSections.length} section(s)`}</span>
              {list.isError ? (
                <span className="text-rose-700 inline-flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Erreur
                </span>
              ) : null}
            </div>

            {list.isError ? (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700">
                {(list.error as any)?.message ?? "Erreur de chargement"}
              </div>
            ) : null}

            <div className="max-h-[62vh] overflow-auto pr-1 space-y-1">
              {filteredSections.map((s) => {
                const info = sectionSummary(s);
                const isActive = s.id === activeSectionId;

                const visibleLabel =
                  mode === "compare"
                    ? info.visibleFR || info.visibleEN
                      ? "Visible"
                      : "Masqué"
                    : mode === "en"
                    ? info.visibleEN
                      ? "Visible"
                      : "Masqué"
                    : info.visibleFR
                    ? "Visible"
                    : "Masqué";

                const missingLabel = (() => {
                  if (info.missingSet.size === 0) return null;
                  const labels = Array.from(info.missingSet).sort().join("/");
                  return labels.includes("FR") && labels.includes("EN") ? "FR+EN" : labels;
                })();

                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setActiveSectionId(s.id)}
                    className={[
                      "w-full text-left rounded-lg border px-3 py-2 transition",
                      isActive ? "border-slate-300 bg-slate-50" : "border-slate-200 hover:bg-slate-50",
                    ].join(" ")}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span className="inline-flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" />
                            {info.category}
                          </span>
                          <span className="text-muted-foreground/70">•</span>
                          <span className="truncate">{s.location ?? "—"}</span>
                        </div>

                        <div className="mt-0.5 font-medium text-sm truncate">{s.title}</div>

                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span
                            className={[
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                              visibleLabel === "Visible" ? badgeClasses("published") : badgeClasses("draft"),
                            ].join(" ")}
                          >
                            {visibleLabel}
                          </span>

                          <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] border-slate-200 bg-white text-slate-700">
                            {info.filledCount}/{info.totalCount} champs
                          </span>

                          {missingLabel ? (
                            <span
                              className={[
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                                badgeClasses("missing"),
                              ].join(" ")}
                            >
                              Manquant {missingLabel}
                            </span>
                          ) : null}

                          {info.autoCount > 0 ? (
                            <span
                              className={[
                                "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]",
                                badgeClasses("auto"),
                              ].join(" ")}
                            >
                              EN auto {info.autoCount}
                            </span>
                          ) : null}
                        </div>

                        {info.lastUpdated ? (
                          <div className="mt-1 text-[11px] text-muted-foreground">Dernière maj: {fmtDate(info.lastUpdated)}</div>
                        ) : null}
                      </div>

                      <ChevronRight
                        className={["h-4 w-4 mt-1 shrink-0", isActive ? "text-slate-700" : "text-muted-foreground"].join(" ")}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-8 xl:col-span-9">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-base font-semibold">{activeSection?.title ?? "Section"}</CardTitle>
                <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {activeSection?.location ?? "—"}
                  </span>
                  {activeSection?.description ? <span>• {activeSection.description}</span> : null}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {mode === "compare" ? (
                    <>
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={sectionVisible("fr", activeSectionId)}
                          onChange={(e) => toggleSectionVisible("fr", activeSectionId, e.target.checked)}
                          disabled={isBusy}
                        />
                        Visible FR
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={sectionVisible("en", activeSectionId)}
                          onChange={(e) => toggleSectionVisible("en", activeSectionId, e.target.checked)}
                          disabled={isBusy}
                        />
                        Visible EN
                      </label>
                    </>
                  ) : (
                    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={sectionVisible(mode, activeSectionId)}
                        onChange={(e) => toggleSectionVisible(mode, activeSectionId, e.target.checked)}
                        disabled={isBusy}
                      />
                      Visible sur le site
                    </label>
                  )}
                </div>

                <Button
                  type="button"
                  onClick={() => saveSection(activeSectionId)}
                  disabled={isBusy}
                  className="sm:w-auto w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer{mode === "compare" ? " FR + EN" : ""}
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mb-3">
              {mode === "compare" ? (
                <>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    FR: {sectionVisible("fr", activeSectionId) ? "visible" : "masqué"}
                  </span>
                  <span className="text-muted-foreground/70">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    EN: {sectionVisible("en", activeSectionId) ? "visible" : "masqué"}
                  </span>
                </>
              ) : (
                <span className="inline-flex items-center gap-1">
                  {sectionVisible(mode, activeSectionId) ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  {sectionVisible(mode, activeSectionId) ? "Visible (publié à l’enregistrement)" : "Masqué (brouillon à l’enregistrement)"}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {(activeSection?.fields ?? []).map((f) => {
                const frVal = ((drafts.fr?.[activeSectionId] ?? {}) as Record<string, string>)[f.key] ?? "";
                const enVal = ((drafts.en?.[activeSectionId] ?? {}) as Record<string, string>)[f.key] ?? "";

                const frRow = getRow(f.key, "fr");
                const enRow = getRow(f.key, "en");

                const missingFR = !frRow;
                const missingEN = !enRow;

                const autoEN = Boolean(enRow?.en_is_auto);

                const metaLine = (loc: Locale) => {
                  const r = loc === "fr" ? frRow : enRow;
                  const bits: string[] = [];
                  if (r?.updated_at) bits.push(`maj: ${fmtDate(r.updated_at)}`);
                  if (r?.updated_by) bits.push(`par: ${r.updated_by}`);
                  if (loc === "en" && r?.en_is_auto) bits.push("EN auto");
                  if (!r) bits.push("non créé");
                  return bits.length ? bits.join(" • ") : "—";
                };

                const renderInput = (loc: Locale, value: string) => {
                  const disabled = isBusy;

                  if (f.type === "textarea") {
                    return (
                      <Textarea
                        value={value}
                        onChange={(e) => setDraft(loc, activeSectionId, f.key, e.target.value)}
                        placeholder={f.placeholder}
                        rows={4}
                        className="min-h-[120px]"
                        disabled={disabled}
                      />
                    );
                  }

                  return (
                    <Input
                      type={inputType(f.type)}
                      value={value}
                      onChange={(e) => setDraft(loc, activeSectionId, f.key, e.target.value)}
                      placeholder={f.placeholder}
                      disabled={disabled}
                    />
                  );
                };

                return (
                  <div key={f.key} className="rounded-xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <div className="text-sm font-medium">{f.label}</div>
                          {missingFR ? <Pill kind="missing">FR manquant</Pill> : null}
                          {missingEN ? <Pill kind="missing">EN manquant</Pill> : null}
                          {autoEN ? <Pill kind="auto">EN auto</Pill> : null}
                        </div>

                        <div className="mt-1 text-[12px] text-muted-foreground flex flex-wrap items-center gap-2">
                          <span className="font-mono">{f.key}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => copyText(f.key)}
                            disabled={isBusy}
                            title="Copier la clé"
                          >
                            <Copy className="h-3.5 w-3.5 mr-1" />
                            Copier
                          </Button>
                        </div>

                        {f.help ? <div className="mt-1 text-[12px] text-muted-foreground">{f.help}</div> : null}
                      </div>

                      <div className="text-[11px] text-muted-foreground md:text-right space-y-1">
                        <div>FR: {metaLine("fr")}</div>
                        <div>EN: {metaLine("en")}</div>
                      </div>
                    </div>

                    <div className="mt-3">
                      {mode === "compare" ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">FR</div>
                            {renderInput("fr", frVal)}
                            <div className="flex justify-end">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-8"
                                disabled={isBusy || isEmptyValue(frVal)}
                                onClick={() => setDraft("en", activeSectionId, f.key, frVal)}
                                title="Copier FR → EN"
                              >
                                Copier FR → EN
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-1">
                            <div className="text-xs text-muted-foreground">EN</div>
                            {renderInput("en", enVal)}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">{mode.toUpperCase()}</div>
                          {renderInput(mode, mode === "fr" ? frVal : enVal)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs text-muted-foreground">
                Astuce: utilise “Comparer” pour voir FR/EN côte à côte et copier FR → EN.
              </div>
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => list.refetch()} disabled={isBusy}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Recharger
                </Button>
                <Button type="button" onClick={() => saveSection(activeSectionId)} disabled={isBusy}>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer{mode === "compare" ? " FR + EN" : ""}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="text-[12px] text-muted-foreground">
        Notes: “EN auto” correspond à <span className="font-mono">en_is_auto</span>. Les champs “non créé” indiquent que la clé n’existe pas encore en base (bouton Initialiser).
      </div>
    </div>
  );
}
