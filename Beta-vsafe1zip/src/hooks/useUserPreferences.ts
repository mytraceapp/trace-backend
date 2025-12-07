import { useState, useEffect, useCallback } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { UserPreferences } from "../lib/preferences";
import {
  getUserPreferences,
  updateUserPreferences,
} from "../lib/preferences";

type UserLike = { id: string } | null;

type UseUserPreferencesResult = {
  preferences: UserPreferences | null;
  loading: boolean;
  error: string | null;
  setNotificationsEnabled: (next: boolean) => Promise<void>;
  setReminderTime: (next: string | null) => Promise<void>;
  setHapticsEnabled: (next: boolean) => Promise<void>;
};

export function useUserPreferences(
  supabase: SupabaseClient,
  user: UserLike
): UseUserPreferencesResult {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState<boolean>(!!user);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user) {
        setPreferences(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const { data, error } = await getUserPreferences(supabase, user.id);

      if (cancelled) return;

      if (error) {
        console.error("Failed to load user preferences", error);
        setError("Unable to load your preferences right now.");
        setPreferences(null);
      } else {
        setPreferences(data);
      }

      setLoading(false);
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [supabase, user?.id]);

  const applyUpdate = useCallback(
    async (
      partial: Partial<Omit<UserPreferences, "user_id" | "updated_at">>
    ) => {
      if (!user) return;

      setError(null);

      setPreferences((prev) => {
        if (!prev) return prev;
        return { ...prev, ...partial };
      });

      const { data, error } = await updateUserPreferences(
        supabase,
        user.id,
        partial
      );

      if (error || !data) {
        console.error("Failed to update user preferences", error);
        setError("Unable to save your preferences right now.");

        const refreshed = await getUserPreferences(supabase, user.id);
        if (!refreshed.error && refreshed.data) {
          setPreferences(refreshed.data);
        }
      } else {
        setPreferences(data);
      }
    },
    [supabase, user]
  );

  const setNotificationsEnabled = useCallback(
    async (next: boolean) => {
      await applyUpdate({ notifications_enabled: next });
    },
    [applyUpdate]
  );

  const setReminderTime = useCallback(
    async (next: string | null) => {
      await applyUpdate({ reminder_time: next });
    },
    [applyUpdate]
  );

  const setHapticsEnabled = useCallback(
    async (next: boolean) => {
      await applyUpdate({ haptics_enabled: next });
    },
    [applyUpdate]
  );

  return {
    preferences,
    loading,
    error,
    setNotificationsEnabled,
    setReminderTime,
    setHapticsEnabled,
  };
}
