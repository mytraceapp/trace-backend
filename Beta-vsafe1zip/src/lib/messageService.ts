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
