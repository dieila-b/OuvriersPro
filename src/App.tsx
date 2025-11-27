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
import Register from "./pages/Register";

// Espace de compte (connexion / inscription / explication)
import MonCompte from "./pages/MonCompte";

// Back-office Admin
import AdminOuvrierContacts from "./pages/AdminOuvrierContacts";
import AdminOuvrierInscriptions from "./pages/AdminOuvrierInscriptions";
import AdminDashboard from "./pages/AdminDashboard";

// Espace ouvrier connecté
import WorkerDashboard from "./pages/WorkerDashboard";

// ✅ Nouvel espace Client / Particulier
import ClientDashboard from "./pages/ClientDashboard";

// ✅ Profil client
import ClientProfile from "./pages/ClientProfile";

// ✅ Liste des demandes client
import ClientRequestsList from "./pages/ClientRequestsList";

// ✅ Liste des échanges client ↔ ouvriers
import ClientMessagesList from "./pages/ClientMessagesList";

// ✅ Liste des ouvriers favoris
import ClientFavoritesList from "./pages/ClientFavoritesList";

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
            {/* 🏠 Accueil */}
            <Route path="/" element={<Index />} />

            {/* 🔎 Recherche d’ouvrier (même page que l’accueil, mais URL dédiée) */}
            <Route path="/search" element={<Index />} />

            {/* 🧑‍💼 Mon compte (connexion + inscription + choix ouvrier/particulier) */}
            <Route path="/mon-compte" element={<MonCompte />} />

            {/* 🔐 Connexion */}
            <Route path="/login" element={<Login />} />

            {/* 🆕 Inscription utilisateur (particulier ou ouvrier) */}
            <Route path="/register" element={<Register />} />

            {/* 📝 Formulaire d'inscription ouvrier + forfait */}
            <Route
              path="/inscription-ouvrier"
              element={<InscriptionOuvrier />}
            />

            {/* 👤 Fiche ouvrier (auth gérée dans WorkerDetail : redirection si non connecté) */}
            <Route path="/ouvrier/:id" element={<WorkerDetail />} />

            {/* 👥 Espace Client / Particulier (protégé : user) */}
            <Route
              path="/espace-client"
              element={
                <PrivateRoute allowedRoles={["user"]}>
                  <ClientDashboard />
                </PrivateRoute>
              }
            />

            {/* 👤 Mon profil client (protégé : user) */}
            <Route
              path="/mon-profil"
              element={
                <PrivateRoute allowedRoles={["user"]}>
                  <ClientProfile />
                </PrivateRoute>
              }
            />

            {/* 📄 Mes demandes (liste des demandes du client, protégée : user) */}
            <Route
              path="/mes-demandes"
              element={
                <PrivateRoute allowedRoles={["user"]}>
                  <ClientRequestsList />
                </PrivateRoute>
              }
            />

            {/* 💬 Mes échanges (liste des messages client ↔ ouvriers, protégée : user) */}
            <Route
              path="/mes-echanges"
              element={
                <PrivateRoute allowedRoles={["user"]}>
                  <ClientMessagesList />
                </PrivateRoute>
              }
            />

            {/* ❤️ Mes favoris (liste des ouvriers favoris, protégée : user) */}
            <Route
              path="/mes-favoris"
              element={
                <PrivateRoute allowedRoles={["user"]}>
                  <ClientFavoritesList />
                </PrivateRoute>
              }
            />

            {/* 👷‍♂️ Espace ouvrier (protégé : worker) */}
            <Route
              path="/espace-ouvrier"
              element={
                <PrivateRoute allowedRoles={["worker"]}>
                  <WorkerDashboard />
                </PrivateRoute>
              }
            />

            {/* 🛠️ Admin : Dashboard */}
            <Route
              path="/admin/dashboard"
              element={
                <PrivateRoute allowedRoles={["admin"]}>
                  <AdminDashboard />
                </PrivateRoute>
              }
            />

            {/* 🛠️ Admin : demandes de contact */}
            <Route
              path="/admin/ouvrier-contacts"
              element={
                <PrivateRoute allowedRoles={["admin"]}>
                  <AdminOuvrierContacts />
                </PrivateRoute>
              }
            />

            {/* 🛠️ Admin : inscriptions ouvriers */}
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
