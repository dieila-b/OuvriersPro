import React, { useMemo, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HelpCircle, Search, X } from "lucide-react";

type FaqCategory =
  | "all"
  | "general"
  | "clients"
  | "providers"
  | "payments"
  | "security"
  | "account"
  | "location"
  | "reviews"
  | "support"
  | "medical"
  | "it"
  | "tutoring"
  | "crafts";

type FaqItem = {
  id: string;
  category: Exclude<FaqCategory, "all">;
  qKey: string; // i18n key question
  aKey: string; // i18n key answer
};

const FAQPage: React.FC = () => {
  const { t, language } = useLanguage();

  // ----------------------------
  // Categories (i18n)
  // ----------------------------
  const categories: { id: FaqCategory; label: string }[] = useMemo(
    () => [
      { id: "all", label: t("faq.categories.all") },
      { id: "general", label: t("faq.categories.general") },
      { id: "clients", label: t("faq.categories.clients") },
      { id: "providers", label: t("faq.categories.providers") },
      { id: "account", label: t("faq.categories.account") },
      { id: "location", label: t("faq.categories.location") },
      { id: "reviews", label: t("faq.categories.reviews") },
      { id: "payments", label: t("faq.categories.payments") },
      { id: "security", label: t("faq.categories.security") },
      { id: "support", label: t("faq.categories.support") },

      // catégories “services” (optionnelles mais utiles pour filtrer)
      { id: "medical", label: t("faq.categories.medical") },
      { id: "it", label: t("faq.categories.it") },
      { id: "tutoring", label: t("faq.categories.tutoring") },
      { id: "crafts", label: t("faq.categories.crafts") },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  );

  // ----------------------------
  // FAQ Items (keys i18n)
  // ----------------------------
  const items: FaqItem[] = useMemo(
    () => [
      // GENERAL
      { id: "g1", category: "general", qKey: "faq.items.g1.q", aKey: "faq.items.g1.a" },
      { id: "g2", category: "general", qKey: "faq.items.g2.q", aKey: "faq.items.g2.a" },
      { id: "g3", category: "general", qKey: "faq.items.g3.q", aKey: "faq.items.g3.a" },

      // CLIENTS
      { id: "c1", category: "clients", qKey: "faq.items.c1.q", aKey: "faq.items.c1.a" },
      { id: "c2", category: "clients", qKey: "faq.items.c2.q", aKey: "faq.items.c2.a" },
      { id: "c3", category: "clients", qKey: "faq.items.c3.q", aKey: "faq.items.c3.a" },

      // PROVIDERS
      { id: "p1", category: "providers", qKey: "faq.items.p1.q", aKey: "faq.items.p1.a" },
      { id: "p2", category: "providers", qKey: "faq.items.p2.q", aKey: "faq.items.p2.a" },
      { id: "p3", category: "providers", qKey: "faq.items.p3.q", aKey: "faq.items.p3.a" },
      { id: "p4", category: "providers", qKey: "faq.items.p4.q", aKey: "faq.items.p4.a" },

      // ACCOUNT
      { id: "a1", category: "account", qKey: "faq.items.a1.q", aKey: "faq.items.a1.a" },
      { id: "a2", category: "account", qKey: "faq.items.a2.q", aKey: "faq.items.a2.a" },

      // LOCATION
      { id: "l1", category: "location", qKey: "faq.items.l1.q", aKey: "faq.items.l1.a" },
      { id: "l2", category: "location", qKey: "faq.items.l2.q", aKey: "faq.items.l2.a" },

      // REVIEWS
      { id: "r1", category: "reviews", qKey: "faq.items.r1.q", aKey: "faq.items.r1.a" },
      { id: "r2", category: "reviews", qKey: "faq.items.r2.q", aKey: "faq.items.r2.a" },

      // PAYMENTS
      { id: "pay1", category: "payments", qKey: "faq.items.pay1.q", aKey: "faq.items.pay1.a" },
      { id: "pay2", category: "payments", qKey: "faq.items.pay2.q", aKey: "faq.items.pay2.a" },

      // SECURITY
      { id: "s1", category: "security", qKey: "faq.items.s1.q", aKey: "faq.items.s1.a" },
      { id: "s2", category: "security", qKey: "faq.items.s2.q", aKey: "faq.items.s2.a" },

      // SUPPORT
      { id: "su1", category: "support", qKey: "faq.items.su1.q", aKey: "faq.items.su1.a" },
      { id: "su2", category: "support", qKey: "faq.items.su2.q", aKey: "faq.items.su2.a" },

      // SERVICES (medical / it / tutoring / crafts) – utiles si tu veux filtrer “par métier”
      { id: "m1", category: "medical", qKey: "faq.items.m1.q", aKey: "faq.items.m1.a" },
      { id: "it1", category: "it", qKey: "faq.items.it1.q", aKey: "faq.items.it1.a" },
      { id: "t1", category: "tutoring", qKey: "faq.items.t1.q", aKey: "faq.items.t1.a" },
      { id: "cr1", category: "crafts", qKey: "faq.items.cr1.q", aKey: "faq.items.cr1.a" },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language]
  );

  // ----------------------------
  // Filters
  // ----------------------------
  const [category, setCategory] = useState<FaqCategory>("all");
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const catOk = category === "all" ? true : it.category === category;
      if (!catOk) return false;

      if (!q) return true;

      const question = (t(it.qKey) || "").toLowerCase();
      const answer = (t(it.aKey) || "").toLowerCase();
      return question.includes(q) || answer.includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, category, query, language]);

  const activeCategoryLabel = useMemo(() => {
    return categories.find((c) => c.id === category)?.label ?? t("faq.categories.all");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, language]);

  const clearSearch = () => setQuery("");

  return (
    <section className="w-full bg-white pt-0 pb-12 sm:pb-14 lg:pb-16">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 min-w-0">
        {/* Header */}
        <div className="border-b border-gray-200 pb-4 sm:pb-5 mb-5 sm:mb-7">
          <div className="flex items-start gap-3">
            <div className="shrink-0 w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center border border-blue-100">
              <HelpCircle className="w-5 h-5 text-pro-blue" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray leading-tight">
                {t("faq.title")}
              </h1>
              <p className="mt-1.5 text-sm sm:text-base text-gray-600 max-w-4xl">
                {t("faq.subtitle")}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge variant="outline" className="border-gray-200 text-gray-700">
                  {t("faq.brand")}
                </Badge>
                <Badge className="bg-pro-blue hover:bg-blue-700">{activeCategoryLabel}</Badge>
                <Badge variant="outline" className="border-gray-200 text-gray-700">
                  {filtered.length} {t("faq.results")}
                </Badge>
              </div>
            </div>
          </div>

          {/* Search + Category */}
          <div className="mt-4 grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-3 items-start">
            <div className="relative min-w-0">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("faq.searchPlaceholder")}
                className="pl-9 pr-10"
              />
              {query.trim().length > 0 && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  aria-label="Clear"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant={category === c.id ? "default" : "outline"}
                  className={
                    category === c.id
                      ? "bg-pro-blue hover:bg-blue-700"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50"
                  }
                  size="sm"
                  onClick={() => setCategory(c.id)}
                >
                  {c.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 lg:gap-8 items-start">
          {/* Accordion */}
          <div className="min-w-0">
            {filtered.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-gray-300 p-6 text-center text-gray-600">
                <div className="text-base font-semibold text-pro-gray">{t("faq.empty.title")}</div>
                <div className="mt-1 text-sm">{t("faq.empty.desc")}</div>
                <Button
                  type="button"
                  className="mt-4 bg-pro-blue hover:bg-blue-700"
                  onClick={() => {
                    setCategory("all");
                    setQuery("");
                  }}
                >
                  {t("faq.empty.reset")}
                </Button>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3 sm:p-4">
                <Accordion type="multiple" className="w-full">
                  {filtered.map((it) => (
                    <AccordionItem
                      key={it.id}
                      value={it.id}
                      className="bg-white rounded-xl border border-gray-200 px-3 sm:px-4 mb-3 last:mb-0"
                    >
                      <AccordionTrigger className="text-left text-pro-gray hover:no-underline">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-sm sm:text-base min-w-0 truncate">
                            {t(it.qKey)}
                          </span>
                          <Badge variant="outline" className="border-gray-200 text-gray-600 shrink-0">
                            {categories.find((c) => c.id === it.category)?.label ?? it.category}
                          </Badge>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-700 text-sm leading-relaxed pb-4">
                        {t(it.aKey)}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            )}
          </div>

          {/* Side card */}
          <aside className="min-w-0">
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-base font-semibold text-pro-gray">{t("faq.help.title")}</div>
              <p className="mt-2 text-sm text-gray-600">{t("faq.help.desc")}</p>

              <div className="mt-4 space-y-2 text-sm text-gray-700">
                <div className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-pro-blue shrink-0" />
                  <span>{t("faq.help.tip1")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-pro-blue shrink-0" />
                  <span>{t("faq.help.tip2")}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="mt-1 w-1.5 h-1.5 rounded-full bg-pro-blue shrink-0" />
                  <span>{t("faq.help.tip3")}</span>
                </div>
              </div>

              <div className="mt-5 flex gap-2">
                <Button
                  type="button"
                  className="bg-pro-blue hover:bg-blue-700 flex-1"
                  onClick={() => (window.location.href = "/contact")}
                >
                  {t("faq.help.contact")}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-gray-200 text-gray-700"
                  onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
                >
                  {t("faq.help.top")}
                </Button>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
};

export default FAQPage;
