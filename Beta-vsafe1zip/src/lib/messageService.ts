import { supabase } from "./supabaseClient";

export async function saveTraceMessage(
  userId: string,
  role: "user" | "assistant",
  content: string,
  emotion?: string | null,
  intensity?: number | null
) {
  // Database stores 'trace' for assistant messages, 'user' for user messages
  const dbRole = role === 'assistant' ? 'trace' : role;
  
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        user_id: userId,
        role: dbRole,
        content,
        emotion: emotion ?? null,
        intensity: intensity ?? null,
      },
    ])
    .select();

  if (error) {
    console.error("TRACE/saveMessage ❌", error);
  } else {
    console.log("TRACE/saveMessage ✅", { role, hasEmotion: !!emotion, hasIntensity: intensity != null });
  }

  return { data, error };
}

export async function getCurrentUserId(): Promise<string | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError) {
    console.error("TRACE/getCurrentUserId ❌", authError);
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
    console.error("TRACE/loadRecentMessages ❌", userError);
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
    console.error("TRACE/loadRecentMessages ❌", error);
    return;
  }

  if (!data || data.length === 0) {
    return;
  }

  // Convert 'trace' or 'ai' back to 'assistant' when loading from database
  const hydrated: ChatMessage[] = (data ?? []).map((row, index) => ({
    id: `history-${index}-${row.created_at}`,
    role: (row.role === 'trace' || row.role === 'ai') ? 'assistant' : 'user',
    content: row.content,
    createdAt: row.created_at,
    emotion: row.emotion ?? null,
    intensity: row.intensity ?? null,
  }));

  console.log("TRACE/loadRecentMessages ✅", { count: hydrated.length });
  setMessages(hydrated);
}
