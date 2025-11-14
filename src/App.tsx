import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import InscriptionOuvrier from "./pages/InscriptionOuvrier";
import WorkerDetail from "./pages/WorkerDetail";
import AdminOuvrierContacts from "./pages/AdminOuvrierContacts";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />

            {/* Page d'inscription des ouvriers */}
            <Route
              path="/inscription-ouvrier"
              element={<InscriptionOuvrier />}
            />

            {/* Fiche détaillée ouvrier */}
            <Route path="/ouvrier/:id" element={<WorkerDetail />} />

            {/* Back-office demandes de contact */}
            <Route
              path="/admin/ouvrier-contacts"
              element={<AdminOuvrierContacts />}
            />

            {/* CATCH-ALL */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
