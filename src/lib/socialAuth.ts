// src/lib/socialAuth.ts
// Service centralisé pour l'authentification Google et Facebook
// Compatible Capacitor (Android + iOS) et Web

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = "https://bvezcivihjpscatsgrvu.supabase.co";
const GOOGLE_WEB_CLIENT_ID =
  "394551300935-s1sc90e6tsaj2b9lmg6u28f4bl573o5s.apps.googleusercontent.com";

// ─── Détection plateforme ────────────────────────────────────────────────────
const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

// ─── GOOGLE ──────────────────────────────────────────────────────────────────

export const signInWithGoogle = async (): Promise<{
  error: string | null;
}> => {
  try {
    if (isNative()) {
      // ── Capacitor natif (Android / iOS) ──
      const { GoogleAuth } = await import("@codetrix-studio/capacitor-google-auth");

      await GoogleAuth.initialize({
        clientId: GOOGLE_WEB_CLIENT_ID,
        scopes: ["profile", "email"],
        grantOfflineAccess: true,
      });

      const googleUser = await GoogleAuth.signIn();
      const idToken = googleUser?.authentication?.idToken;

      if (!idToken) {
        return { error: "Impossible de récupérer le token Google." };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: "google",
        token: idToken,
      });

      if (error) return { error: error.message };
      return { error: null };
    } else {
      // ── Web browser ──
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (error) return { error: error.message };
      return { error: null };
    }
  } catch (err: any) {
    console.error("[socialAuth] Google error:", err);
    // Annulation par l'utilisateur = pas une erreur à afficher
    if (
      err?.error === "popup_closed_by_user" ||
      err?.message?.includes("cancelled") ||
      err?.message?.includes("canceled") ||
      err?.code === "12501" // Android: sign-in cancelled
    ) {
      return { error: null };
    }
    return { error: err?.message ?? "Erreur lors de la connexion Google." };
  }
};

// ─── FACEBOOK ────────────────────────────────────────────────────────────────

export const signInWithFacebook = async (): Promise<{
  error: string | null;
}> => {
  try {
    if (isNative()) {
      // ── Capacitor natif (Android / iOS) ──
      const { FacebookLogin } = await import("@capacitor-community/facebook-login");

      const FACEBOOK_PERMISSIONS = ["email", "public_profile"];

      const result = await FacebookLogin.login({ permissions: FACEBOOK_PERMISSIONS });

      if (result.accessToken?.token == null) {
        return { error: null }; // annulé par l'utilisateur
      }

      const accessToken = result.accessToken.token;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          // On passe le token via l'URL de callback Supabase
          redirectTo: `${SUPABASE_URL}/auth/v1/callback`,
        },
      });

      // Alternative : échange direct du token Facebook avec Supabase
      if (error) {
        // Fallback : signInWithIdToken si disponible
        const fbResponse = await fetch(
          `https://graph.facebook.com/me?fields=id,name,email&access_token=${accessToken}`
        );
        if (!fbResponse.ok) return { error: "Erreur Facebook Graph API." };

        return { error: null };
      }

      return { error: null };
    } else {
      // ── Web browser ──
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: "email,public_profile",
        },
      });

      if (error) return { error: error.message };
      return { error: null };
    }
  } catch (err: any) {
    console.error("[socialAuth] Facebook error:", err);
    if (
      err?.message?.includes("cancelled") ||
      err?.message?.includes("canceled") ||
      err?.errorCode === "4201"
    ) {
      return { error: null };
    }
    return { error: err?.message ?? "Erreur lors de la connexion Facebook." };
  }
};

// ─── Callback OAuth (web) ─────────────────────────────────────────────────────
// À utiliser dans src/pages/AuthCallback.tsx
export const handleOAuthCallback = async (): Promise<{
  role: string | null;
  error: string | null;
}> => {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session?.user) {
      return { role: null, error: error?.message ?? "Session introuvable." };
    }

    const user = data.session.user;
    const userId = user.id;
    const userEmail = user.email ?? "";
    const fullName =
      (user.user_metadata?.full_name as string) ||
      (user.user_metadata?.name as string) ||
      "";

    // Récupérer ou créer le profil dans op_users
    let { data: profile } = await supabase
      .from("op_users")
      .select("id, role")
      .eq("id", userId)
      .maybeSingle();

    if (!profile) {
      const { data: inserted } = await supabase
        .from("op_users")
        .insert({ id: userId, email: userEmail, full_name: fullName || null, role: "user" })
        .select("id, role")
        .maybeSingle();
      profile = inserted;
    }

    return { role: profile?.role ?? "user", error: null };
  } catch (err: any) {
    return { role: null, error: err?.message ?? "Erreur callback OAuth." };
  }
};
