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
import InscriptionOuvrier from "./pages/InscriptionOuvrier";
import WorkerDetail from "./pages/WorkerDetail";
import Login from "./pages/Login";

// Back-office Admin
import AdminOuvrierContacts from "./pages/AdminOuvrierContacts";
import AdminOuvrierInscriptions from "./pages/AdminOuvrierInscriptions";
import AdminDashboard from "./pages/AdminDashboard";

// Espace ouvrier connecté
import WorkerDashboard from "./pages/WorkerDashboard";

// Protection routes
import PrivateRoute from "./components/PrivateRoute";

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

            {/* 🔐 Connexion (admin + ouvriers) */}
            <Route path="/login" element={<Login />} />

            {/* 📝 Inscription ouvrier */}
            <Route
              path="/inscription-ouvrier"
              element={<InscriptionOuvrier />}
            />

            {/* 👤 Fiche publique ouvrier */}
            <Route path="/ouvrier/:id" element={<WorkerDetail />} />

            {/* 👷‍♂️ Espace ouvrier (protégé, rôle worker) */}
            <Route
              path="/espace-ouvrier"
              element={
                <PrivateRoute allowedRoles={["worker"]}>
                  <WorkerDashboard />
                </PrivateRoute>
              }
            />

            {/* 🛠️ Admin : Dashboard (protégé) */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />

            {/* 🛠️ Admin : demandes de contact (protégé) */}
            <Route
              path="/admin/ouvrier-contacts"
              element={
                <PrivateRoute allowedRoles={["admin"]}>
                  <AdminOuvrierContacts />
                </PrivateRoute>
              }
            />

            {/* 🛠️ Admin : inscriptions ouvriers (protégé) */}
            <Route
              path="/admin/ouvriers"
              element={
                <PrivateRoute allowedRoles={["admin"]}>
                  <AdminOuvrierInscriptions />
                </PrivateRoute>
              }
            />

            {/* ❌ 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </LanguageProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
