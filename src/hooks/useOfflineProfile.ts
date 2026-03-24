// src/hooks/useOfflineProfile.ts
import { useEffect, useState } from "react";
import { profileRepository, type CachedProfile } from "@/services/repositories/profileRepository";
import { authCache } from "@/services/authCache";

type UseOfflineProfileState = {
  loading: boolean;
  profile: CachedProfile | null;
  error: string | null;
  refresh: () => Promise<void>;
};

export function useOfflineProfile(): UseOfflineProfileState {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<CachedProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const userId = await authCache.getUserId();

      if (!userId) {
        setProfile(null);
        return;
      }

      const data = await profileRepository.getMyProfile(userId);
      setProfile(data);
    } catch (err: any) {
      setError(String(err?.message ?? "Profile load failed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return {
    loading,
    profile,
    error,
    refresh: load,
  };
}
