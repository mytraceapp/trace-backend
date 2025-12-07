import { supabase } from "./supabaseClient";

export async function saveTraceMessage(
  userId: string,
  role: "user" | "assistant",
  content: string,
  emotion?: string | null,
  intensity?: number | null
) {
  // Database constraint accepts 'user' and 'assistant'
  console.log(`💾 Saving message - role: "${role}"`);
  
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        user_id: userId,
        role,
        content,
        emotion: emotion ?? null,
        intensity: intensity ?? null,
      },
    ])
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

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
  emotion: string | null;
  intensity: number | null;
}

export async function loadRecentTraceMessages(
  setMessages: (msgs: ChatMessage[]) => void
) {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    console.error("No authenticated user for recall:", userError);
    return;
  }

  const userId = userData.user.id;
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("messages")
    .select("role, content, created_at, emotion, intensity")
    .eq("user_id", userId)
    .gte("created_at", oneHourAgo)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    console.error("Error loading recent messages:", error);
    return;
  }

  if (!data || data.length === 0) {
    console.log("No recent messages to recall");
    return;
  }

  const hydrated: ChatMessage[] = (data ?? []).map((row, index) => ({
    id: `history-${index}-${row.created_at}`,
    role: row.role as 'user' | 'assistant',
    content: row.content,
    createdAt: row.created_at,
    emotion: row.emotion ?? null,
    intensity: row.intensity ?? null,
  }));

  console.log(`✅ Recalled ${hydrated.length} messages from last hour`);
  setMessages(hydrated);
}
