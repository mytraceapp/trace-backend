import type { SupabaseClient } from "@supabase/supabase-js";
import type { PostgrestError } from "@supabase/postgrest-js";

export type UserPreferences = {
  user_id: string;
  notifications_enabled: boolean;
  reminder_time: string | null;
  haptics_enabled: boolean;
  updated_at: string;
};

const DEFAULT_PREFERENCES: Omit<UserPreferences, "user_id" | "updated_at"> = {
  notifications_enabled: false,
  reminder_time: null,
  haptics_enabled: true,
};

export async function getUserPreferences(
  supabase: SupabaseClient,
  userId: string
): Promise<{ data: UserPreferences | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("user_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      const { data: inserted, error: insertError } = await supabase
        .from("user_preferences")
        .insert({
          user_id: userId,
          ...DEFAULT_PREFERENCES,
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      return { data: inserted, error: insertError };
    }
    return { data: null, error };
  }

  return { data, error: null };
}

export async function updateUserPreferences(
  supabase: SupabaseClient,
  userId: string,
  updates: Partial<Omit<UserPreferences, "user_id" | "updated_at">>
): Promise<{ data: UserPreferences | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from("user_preferences")
    .upsert(
      {
        user_id: userId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    )
    .select()
    .single();

  return { data, error };
}
