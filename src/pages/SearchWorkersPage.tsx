// src/pages/SearchWorkersPage.tsx
import Header from "@/components/Header";
import WorkerSearchSection from "@/components/WorkerSearchSection";
import Footer from "@/components/Footer";

const SearchWorkersPage = () => {
  return (
    <div className="min-h-screen w-full bg-white overflow-x-hidden flex flex-col">
      <Header />

      <main className="w-full flex-1">
        {/* On affiche directement "Trouvez votre professionnel" */}
        <section className="w-full bg-white py-10 sm:py-14 lg:py-16">
          <WorkerSearchSection />
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default SearchWorkersPage;
