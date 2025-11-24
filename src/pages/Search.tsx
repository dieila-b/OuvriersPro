// src/pages/Search.tsx
import Header from "@/components/Header";
import SearchSection from "@/components/SearchSection";
import Footer from "@/components/Footer";

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />
      <main className="flex-1 w-full">
        <SearchSection />
      </main>
      <Footer />
    </div>
  );
}
