// src/hooks/useOfflineProfile.ts
import { useEffect, useState } from "react";
import { profileRepository, type CachedProfile } from "@/services/repositories/profileRepository";
import { authCache } from "@/services/authCache";
import { useNetworkStatus } from "@/services/networkService";

type UseOfflineProfileState = {
  loading: boolean;
  profile: CachedProfile | null;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useOfflineProfile(): UseOfflineProfileState {
  const { connected } = useNetworkStatus();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CachedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const snapshot = await authCache.getSnapshot<CachedProfile>();
      const userId = snapshot.userId;
      const cachedProfile = snapshot.profile ?? null;

      if (!userId) {
        setProfile(null);
        setLoading(false);
        return;
      }

      if (!connected) {
        setProfile(cachedProfile);
        setError(cachedProfile ? null : "Aucun profil synchronisé disponible hors connexion.");
        setLoading(false);
        return;
      }

      try {
        const data = await profileRepository.getMyProfile(userId);
        setProfile(data ?? cachedProfile ?? null);

        if (data) {
          await authCache.updateProfile(data as any);
        }
      } catch (err: any) {
        if (cachedProfile) {
          setProfile(cachedProfile);
          setError(null);
        } else {
          setProfile(null);
          setError(String(err?.message ?? "Profile load failed"));
        }
      }
    } catch (err: any) {
      setProfile(null);
      setError(String(err?.message ?? "Profile load failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [connected]);

  return {
    loading,
    profile,
    error,
    refresh: load,
  };
}
