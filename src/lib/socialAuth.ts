// src/lib/socialAuth.ts
// Authentification sociale Google + Facebook via Supabase OAuth
// Fonctionne sur Android, iOS et Web sans plugin natif Google

import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

const SUPABASE_URL = "https://bvezcivihjpscatsgrvu.supabase.co";

// ─── Détection plateforme ────────────────────────────────────────────────────
const isNative = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

// URL de redirect selon la plateforme
const getRedirectUrl = (): string => {
  if (isNative()) {
    // Sur mobile natif : deep link vers l'app
    return "com.proxiservices.app://auth/callback";
  }
  // Sur web : page callback locale
  return `${window.location.origin}/auth/callback`;
};

// ─── GOOGLE (OAuth web — sans plugin natif) ──────────────────────────────────
export const signInWithGoogle = async (): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        skipBrowserRedirect: false,
      },
    });

    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    console.error("[socialAuth] Google error:", err);
    return { error: err?.message ?? "Erreur lors de la connexion Google." };
  }
};

// ─── FACEBOOK (OAuth web) ────────────────────────────────────────────────────
export const signInWithFacebook = async (): Promise<{ error: string | null }> => {
  try {
    if (isNative()) {
      // ── Capacitor natif (Android / iOS) ──
      const { FacebookLogin } = await import("@capacitor-community/facebook-login");

      const result = await FacebookLogin.login({
        permissions: ["email", "public_profile"],
      });

      if (!result.accessToken?.token) {
        return { error: null }; // annulé par l'utilisateur
      }

      // Échange du token Facebook avec Supabase
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: getRedirectUrl(),
        },
      });

      if (error) return { error: error.message };
      return { error: null };
    } else {
      // ── Web browser ──
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "facebook",
        options: {
          redirectTo: getRedirectUrl(),
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

// ─── Callback OAuth ───────────────────────────────────────────────────────────
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
        .insert({
          id: userId,
          email: userEmail,
          full_name: fullName || null,
          role: "user",
        })
        .select("id, role")
        .maybeSingle();
      profile = inserted;
    }

    return { role: profile?.role ?? "user", error: null };
  } catch (err: any) {
    return { role: null, error: err?.message ?? "Erreur callback OAuth." };
  }
};
