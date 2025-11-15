import React, { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Login: React.FC = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1️⃣ Auth via Supabase
      const { data: authData, error: authError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (authError) {
        setError(authError.message);
        setLoading(false);
        return;
      }

      const session = authData.session;
      if (!session) {
        setError("Erreur de connexion. Veuillez réessayer.");
        setLoading(false);
        return;
      }

      const userId = session.user.id;

      // 2️⃣ Récupérer le rôle depuis op_users
      const { data: userProfile, error: profileError } = await supabase
        .from("op_users")
        .select("role")
        .eq("id", userId)
        .single();

      if (profileError) {
        // Si aucun rôle n’est trouvé → retour accueil
        navigate("/");
        return;
      }

      const role = userProfile.role;

      // 3️⃣ Redirection selon le rôle
      if (role === "admin") {
        navigate("/admin/dashboard");
      } else if (role === "worker") {
        navigate("/espace-ouvrier");
      } else {
        navigate("/");
      }
    } catch (err: any) {
      console.error(err);
      setError("Erreur inattendue. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h1 className="text-xl font-semibold text-pro-gray mb-4">
          Connexion
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Email
            </label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.com"
            />
          </div>

          {/* Mot de passe */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Mot de passe
            </label>
            <Input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {/* Erreur */}
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}

          {/* Bouton */}
          <Button
            type="submit"
            className="w-full bg-pro-blue hover:bg-blue-700"
            disabled={loading}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
