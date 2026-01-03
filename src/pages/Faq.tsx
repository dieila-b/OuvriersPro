// src/pages/Faq.tsx
import React from "react";
import FaqAccordion from "@/components/FaqAccordion";
import { useLanguage } from "@/contexts/LanguageContext";

export default function Faq() {
  const { language } = useLanguage();

  return (
    <section className="w-full bg-white">
      <div className="w-full px-4 sm:px-6 lg:px-10 2xl:px-16 py-10 sm:py-12">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-pro-gray">
            {language === "fr" ? "FAQ ProxiServices" : "ProxiServices FAQ"}
          </h1>
          <p className="mt-2 text-gray-600">
            {language === "fr"
              ? "Retrouvez les réponses aux questions les plus fréquentes et filtrez par catégorie de service."
              : "Find answers to the most common questions and filter by service category."}
          </p>

          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-6">
            <FaqAccordion />
          </div>
        </div>
      </div>
    </section>
  );
}
