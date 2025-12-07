import { supabase } from "./supabaseClient";

export async function saveTraceMessage(
  userId: string,
  role: "user" | "assistant",
  content: string
) {
  const { data, error } = await supabase
    .from("messages")
    .insert([{ user_id: userId, role, content }])
    .select();

  if (error) {
    console.error("❌ TRACE message save error", error);
  } else {
    console.log("✅ TRACE message saved", data);
  }

  return { data, error };
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("❌ Auth error in getCurrentUserId", authError);
    return null;
  }

  return user?.id ?? null;
}
