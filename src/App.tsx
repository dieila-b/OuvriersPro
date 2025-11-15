// src/App.tsx
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LanguageProvider } from "@/contexts/LanguageContext";

// Pages publiques
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WorkerDetail from "./pages/WorkerDetail";
import InscriptionOuvrier from "./pages/InscriptionOuvrier";
import Login from "./pages/Login";

// Back-office Admin
import AdminDashboard from "./pages/AdminDashboard";
import AdminOuvrierContacts from "./pages/AdminOuvrierContacts";
import AdminOuvrierInscriptions from "./pages/AdminOuvrierInscriptions";

// Espace ouvrier connecté
import WorkerDashboard from "./pages/WorkerDashboard";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <LanguageProvider>
        <Toaster />
        <Sonner />

        <BrowserRouter>
          <Routes>
            {/* 🏠 Page d'accueil */}
            <Route path="/" element={<Index />} />

            {/* 🔐 Connexion */}
            <Route path="/login" element={<Login />} />

            {/* 📝 Inscription ouvrier */}
            <Route
              path="/inscription-ouvrier"
              element={<InscriptionOuvrier />}
            />

            {/* 👤 Fiche détaillée ouvrier */}
            <Route path="/ouvrier/:id" element={<WorkerDetail />} />

            {/* 👷‍♂️ Espace Worker connecté */}
            <Route path="/espace-ouvrier" element={<WorkerDashboard />} />

            {/* 🛠️ Admin : Dashboard */}
            <Route path="/admin/dashboard" element={<AdminDashboard />} />

            {/* 🛠️ Admin : demandes de contact */}
            <Route
              path="/admin/ouvrier-contacts"
              element={<AdminOuvrierContacts />}
            />

            {/* 🛠️ Admin : inscriptions ouvriers */}
            <Route
              path="/admin/ouvriers"
              element={<AdminOuvrierInscriptions />}
            />

            {/* ❌ Page 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
