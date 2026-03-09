// src/pages/Search.tsx
import Header from "@/components/Header";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import Footer from "@/components/Footer";

export default function SearchPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white overflow-x-hidden">
      <Header />
      <main className="flex-1 w-full">
        <section className="w-full bg-white py-10 sm:py-14 lg:py-16">
          <WorkerSearchSection />
        </section>
      </main>
      <Footer />
    </div>
  );
}
