// src/App.tsx
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
import AdminOuvrierInscriptions from "./pages/AdminOuvrierInscriptions";
import Login from "./pages/Login";

// ⭐ Nouveau : import du Dashboard Admin
import AdminDashboard from "./pages/AdminDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Page d'accueil */}
            <Route path="/" element={<Index />} />

            {/* Connexion Admin */}
            <Route path="/login" element={<Login />} />

            {/* Page d'inscription des ouvriers */}
            <Route
              path="/inscription-ouvrier"
              element={<InscriptionOuvrier />}
            />

            {/* Fiche détaillée ouvrier */}
            <Route path="/ouvrier/:id" element={<WorkerDetail />} />

            {/* Back-office : Dashboard admin */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* Back-office : demandes de contact */}
            <Route
              path="/admin/ouvrier-contacts"
              element={<AdminOuvrierContacts />}
            />

            {/* Back-office : inscriptions ouvriers */}
            <Route
              path="/admin/ouvriers"
              element={<AdminOuvrierInscriptions />}
            />

            {/* Catch-all 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
