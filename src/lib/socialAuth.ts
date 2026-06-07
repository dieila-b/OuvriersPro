// src/lib/socialAuth.ts
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/lib/supabase";

const isNative = (): boolean => {
  try { return Capacitor.isNativePlatform(); } catch { return false; }
};

const getRedirectUrl = (): string => {
  if (isNative()) return "com.proxiservices.app://auth/callback";
  return `${window.location.origin}/auth/callback`;
};

export const signInWithGoogle = async (): Promise<{ error: string | null }> => {
  try {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(),
        queryParams: { access_type: "offline", prompt: "consent" },
        skipBrowserRedirect: false,
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    return { error: err?.message ?? "Erreur lors de la connexion Google." };
  }
};

export const signInWithFacebook = async (): Promise<{ error: string | null }> => {
  try {
    if (isNative()) {
      try {
        const { FacebookLogin } = await import("@capacitor-community/facebook-login");
        const result = await FacebookLogin.login({ permissions: ["email", "public_profile"] });
        if (!result.accessToken?.token) return { error: null };
      } catch {
        // plugin non disponible en web
      }
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: {
        redirectTo: getRedirectUrl(),
        scopes: "email,public_profile",
      },
    });
    if (error) return { error: error.message };
    return { error: null };
  } catch (err: any) {
    if (err?.message?.includes("cancelled") || err?.message?.includes("canceled")) {
      return { error: null };
    }
    return { error: err?.message ?? "Erreur lors de la connexion Facebook." };
  }
};

export const handleOAuthCallback = async (): Promise<{ role: string | null; error: string | null }> => {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session?.user) {
      return { role: null, error: error?.message ?? "Session introuvable." };
    }
    const user = data.session.user;
    const fullName = (user.user_metadata?.full_name as string) || (user.user_metadata?.name as string) || "";
    let { data: profile } = await supabase.from("op_users").select("id, role").eq("id", user.id).maybeSingle();
    if (!profile) {
      const { data: inserted } = await supabase.from("op_users")
        .insert({ id: user.id, email: user.email ?? "", full_name: fullName || null, role: "user" })
        .select("id, role").maybeSingle();
      profile = inserted;
    }
    return { role: profile?.role ?? "user", error: null };
  } catch (err: any) {
    return { role: null, error: err?.message ?? "Erreur callback OAuth." };
  }
};
