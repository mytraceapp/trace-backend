import { supabase } from "./supabaseClient";

const EMOTION_KEYWORDS = {
  heavy: ["sad", "tired", "exhausted", "heavy", "overwhelmed", "numb", "hopeless", "done", "burned out"],
  anxious: ["anxious", "nervous", "worried", "panicking", "panic", "stressed", "on edge"],
  calm: ["calm", "peaceful", "okay", "fine", "grounded", "steady", "relieved"],
};

const INTENSIFIERS = ["really", "very", "so", "extremely", "super", "totally"];

export function analyzeMessageEmotion(content: string): { emotion: string; intensity: number } {
  const lower = content.toLowerCase();
  
  let emotion = "flat";
  if (EMOTION_KEYWORDS.heavy.some(kw => lower.includes(kw))) {
    emotion = "heavy";
  } else if (EMOTION_KEYWORDS.anxious.some(kw => lower.includes(kw))) {
    emotion = "anxious";
  } else if (EMOTION_KEYWORDS.calm.some(kw => lower.includes(kw))) {
    emotion = "calm";
  }
  
  let intensity = 1;
  if (content.length > 180) intensity = Math.max(intensity, 2);
  
  const hasExclamation = content.includes("!");
  const hasQuestion = content.includes("?");
  const hasAllCaps = /\b[A-Z]{3,}\b/.test(content);
  const hasIntensifier = INTENSIFIERS.some(w => lower.includes(w));
  
  if (hasExclamation || hasQuestion || hasAllCaps || hasIntensifier) {
    intensity = Math.min(intensity + 1, 3);
  }
  
  return { emotion, intensity };
}

export async function saveTraceMessage(
  userId: string,
  role: "user" | "assistant",
  content: string
) {
  const { emotion, intensity } = analyzeMessageEmotion(content);
  
  const dbRole = role === 'assistant' ? 'trace' : role;
  
  const { data, error } = await supabase
    .from("messages")
    .insert([
      {
        user_id: userId,
        role: dbRole,
        content,
        emotion,
        intensity,
      },
    ])
    .select();

  if (error) {
    console.error("TRACE/saveMessage ❌", error);
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

export interface PatternMessage {
  id: string;
  role: string;
  content: string;
  emotion: string | null;
  intensity: number | null;
  created_at: string;
}

export async function fetchRecentMessagesForPatterns(
  userId: string,
  windowMinutes: number = 60
): Promise<PatternMessage[]> {
  const cutoff = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, emotion, intensity, created_at")
    .eq("user_id", userId)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("TRACE/fetchPatternsMessages ❌", error);
    return [];
  }

  return data ?? [];
}
