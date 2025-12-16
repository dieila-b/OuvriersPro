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
import WorkerMessagesPage from "./pages/WorkerMessagesPage"; // ✅ messagerie ouvrier 3 colonnes
import WorkerReviews from "./pages/WorkerReviews"; // ✅ NOUVEAU: avis ouvrier -> client

// Espace Client / Particulier
import ClientDashboard from "./pages/ClientDashboard";

// Profil client
import ClientProfile from "./pages/ClientProfile";

// Liste des demandes client
import ClientRequestsList from "./pages/ClientRequestsList";

// ✅ Nouvelle messagerie client 3 colonnes
import ClientMessagesPage from "./pages/ClientMessagesPage";

// Liste des ouvriers favoris
import ClientFavoritesList from "./pages/ClientFavoritesList";

// ✅ NOUVEAU: avis reçus par le client (public + réponse client)
import ClientReviews from "./pages/ClientReviews";

// Formulaire interne pour qu'un ouvrier contacte un client précis
import ClientContactForm from "./pages/ClientContactForm";

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

            {/* 🔎 Recherche d’ouvrier (alias FR/EN) */}
            <Route path="/search" element={<Index />} />
            <Route path="/rechercher" element={<Index />} />

            {/* 🧑‍💼 Mon compte (connexion + inscription + choix ouvrier/particulier) */}
            <Route path="/mon-compte" element={<MonCompte />} />

            {/* 🔐 Connexion */}
            <Route path="/login" element={<Login />} />

            {/* 🆕 Inscription utilisateur (particulier ou ouvrier) */}
            <Route path="/register" element={<Register />} />

            {/* 📝 Formulaire d'inscription ouvrier + forfait */}
            <Route path="/inscription-ouvrier" element={<InscriptionOuvrier />} />

            {/* 👤 Fiche ouvrier */}
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

            {/* 📄 Mes demandes (protégé : user) */}
            <Route
              path="/mes-demandes"
              element={
                <PrivateRoute allowedRoles={["user"]}>
                  <ClientRequestsList />
                </PrivateRoute>
              }
            />

            {/* 💬 Mes échanges (protégé : user) ✅ maintenant en 3 colonnes */}
            <Route
              path="/mes-echanges"
              element={
                <PrivateRoute allowedRoles={["user"]}>
                  <ClientMessagesPage />
                </PrivateRoute>
              }
            />

            {/* ⭐ Mes avis reçus (protégé : user) */}
            <Route
              path="/mes-avis"
              element={
                <PrivateRoute allowedRoles={["user"]}>
                  <ClientReviews />
                </PrivateRoute>
              }
            />

            {/* ❤️ Mes favoris (protégé : user) */}
            <Route
              path="/mes-favoris"
              element={
                <PrivateRoute allowedRoles={["user"]}>
                  <ClientFavoritesList />
                </PrivateRoute>
              }
            />

            {/* 👷‍♂️ Espace ouvrier : tableau de bord (protégé : worker) */}
            <Route
              path="/espace-ouvrier"
              element={
                <PrivateRoute allowedRoles={["worker"]}>
                  <WorkerDashboard />
                </PrivateRoute>
              }
            />

            {/* 👷‍♂️ Espace ouvrier : messagerie 3 colonnes (protégé : worker) */}
            <Route
              path="/espace-ouvrier/messages"
              element={
                <PrivateRoute allowedRoles={["worker"]}>
                  <WorkerMessagesPage />
                </PrivateRoute>
              }
            />

            {/* ⭐ Espace ouvrier : laisser des avis sur clients (protégé : worker) */}
            <Route
              path="/espace-ouvrier/avis"
              element={
                <PrivateRoute allowedRoles={["worker"]}>
                  <WorkerReviews />
                </PrivateRoute>
              }
            />

            {/* 📨 Formulaire interne : un ouvrier répond à un client précis (protégé : worker) */}
            <Route
              path="/clients/:clientId/contact"
              element={
                <PrivateRoute allowedRoles={["worker"]}>
                  <ClientContactForm />
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
