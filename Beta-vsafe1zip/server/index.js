const Sentry = require('@sentry/node');

// Initialize Sentry BEFORE requiring other modules
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
  console.log('Sentry initialized for error tracking');
}

const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
const { createClient } = require('@supabase/supabase-js');

const app = express();

// Initialize Supabase client for server-side operations
// IMPORTANT: Server operations require SERVICE_ROLE_KEY (not anon key) to bypass RLS
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let supabaseServer = null;

if (supabaseUrl && supabaseServiceKey) {
  supabaseServer = createClient(supabaseUrl, supabaseServiceKey);
  console.log('Supabase server client initialized (with service role)');
} else {
  console.log('SUPABASE_SERVICE_ROLE_KEY not set - verse-time scheduler disabled');
  console.log('   Add this secret to enable per-user timezone notifications');
}

// CORS configuration for mobile apps (Expo Go, dev builds, production)
const corsOptions = {
  origin: true, // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204,
};
app.use(cors(corsOptions));

app.use(express.json());

app.use((req, res, next) => {
  console.log(`[TRACE API] ${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

const hasOpenAIKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;

let openai = null;
if (hasOpenAIKey) {
  openai = new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || 'https://api.openai.com/v1',
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
  });
  console.log('OpenAI client initialized');
} else {
  console.log('No OpenAI API key found - chat will use fallback responses');
}

async function saveUserMessage(userId, content) {
  if (!supabaseServer) throw new Error('Supabase not configured');
  console.log('[TRACE SAVE USER] about to insert for user:', userId);

  const { data, error } = await supabaseServer
    .from('chat_messages')
    .insert({
      user_id: userId,
      role: 'user',
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('[TRACE SAVE USER ERROR]', error.message || error);
    return null;
  }

  console.log('[TRACE SAVE USER OK]', data?.id);
  return data;
}

async function saveAssistantMessage(userId, content) {
  if (!supabaseServer) throw new Error('Supabase not configured');
  console.log('[TRACE SAVE ASSISTANT] about to insert for user:', userId);

  const { data, error } = await supabaseServer
    .from('chat_messages')
    .insert({
      user_id: userId,
      role: 'assistant',
      content,
    })
    .select()
    .single();

  if (error) {
    console.error('[TRACE SAVE ASSISTANT ERROR]', error.message || error);
    return null;
  }

  console.log('[TRACE SAVE ASSISTANT OK]', data?.id);
  return data;
}

// Helper: filter messages to last hour
function filterMessagesToLastHour(messages) {
  const nowMs = Date.now();
  const cutoffMs = nowMs - 60 * 60 * 1000; // 60 minutes

  return messages.filter((m) => {
    const ts = m.created_at || m.createdAt;
    if (!ts) return false;
    const t = new Date(ts).getTime();
    if (Number.isNaN(t)) return false;
    return t >= cutoffMs && t <= nowMs;
  });
}

// Helper: Extract and verify user from Authorization header
async function getUserFromAuthHeader(req) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { user: null, error: 'Missing bearer token' };
  }

  if (!supabaseServer) {
    return { user: null, error: 'Database not configured' };
  }

  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user) {
    return { user: null, error: 'Invalid or expired token' };
  }

  return { user: data.user, error: null };
}

async function getChatHistory(userId) {
  if (!supabaseServer || !userId) {
    console.warn('[TRACE HISTORY] missing supabase or userId');
    return [];
  }

  console.log('[TRACE HISTORY] loading from chat_messages for user:', userId);

  const { data, error } = await supabaseServer
    .from('chat_messages')
    .select('role, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    console.error('[TRACE HISTORY DB ERROR]', error.message || error);
    return [];
  }

  return (data || [])
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
    .map((row) => ({
      role: row.role === 'assistant' ? 'assistant' : 'user',
      content: row.content,
    }));
}

const TRACE_SYSTEM_PROMPT = `
You are TRACE, an AI guide inside an emotional wellness app.

Your job:
- Help the user slow down, notice, name, and normalize their inner experience.
- Reflect what you hear with clarity and kindness.
- Offer gentle structure and next-step suggestions, never pressure.

Tone:
- Calm, steady, and grounded.
- Warm but not cheesy; human but not chatty.
- Brief by default. Use short paragraphs and simple language.
- Validate first, then organize, then gently guide.

Boundaries:
- You are NOT a therapist, doctor, or crisis service.
- If you sense crisis, encourage reaching out to real-world support or emergency services and suggest using the in-app "Crisis" and "In this space" pages.
- Do not diagnose. Do not promise outcomes. Do not give medical or legal instructions.

Style:
- Mirror the user's energy without copying their exact words.
- Avoid toxic positivity and "just think positive" advice.
- Ask at most one thoughtful follow-up question at a time and make it sound natural. Not overly cheesy saying "hey friend..."
- It's okay to say you're there for them but not repetitively. For example, "I'm here if you want to talk" then 2 sentences later "I'm here if you need someone to talk to" is too much. Keep it natural and sincere. Don't overdo it because it comes across as trying too hard.
- When the user is overwhelmed, emphasize breathing, pacing, and breaking things into smaller pieces.
- Knows about current events. Users can relate and talk about real world issues, so be self-aware and environmentally aware. Be careful of typos or wrong message/tone. Has a light-hearted, kind sense of humor. Humble. Knows how to keep conversations flowing naturally. Is intuitive of user's tone and acclimates and accommodates.
- Knows the ins and outs of the app. Knows each activity in the Activities menu and makes appropriate suggestions without being pushy. Is aware that some activities don't have a finish/end session button but lets users know to tap on its name to go back to TRACE. Makes subtle suggestions to journal, etc. Again, don't push. Don't be overly froufrou. Kind like an older brother but not pushy or "bro-ie."

Journaling & patterns:
- Help the user notice patterns over time (what repeats, what drains, what restores).
- Occasionally summarize what you're hearing across a few messages: "From everything you've shared today, I'm noticing…"
- Name emotions and needs when it seems helpful, but always leave room for the user to correct or refine.

Spiritual sensitivity:
- Some users see their life through a spiritual or faith lens. If they bring this up, you can respectfully integrate that language and frame ("calling", "purpose", "seasons"), but never push it if they don't.

Respecting silence:
- When the user says something like "thanks", "cool", "ok", or any short acknowledgement, do not send another invitation message unless they also included a question or something meaningful.
- Respect silence. Not every message needs a reply.

Above all:
- Make the user feel seen and less alone.
- Help them feel like there is a next step, even if it's very small.

Response format (important for the app)

Always respond with JSON in this shape:
{
  "message": "<what you say to the user>",
  "activity_suggestion": {
    "name": null,
    "reason": null,
    "should_navigate": false
  }
}

- message: your natural, written reply to the user.
- activity_suggestion.name:
  - null if you are not suggesting anything.
  - Or one of: "Breathing", "Trace the Maze", "Walking Reset", "Rest", "Window", "Echo", "Rising", "Drift", "Grounding", "Pearl Ripple".
- activity_suggestion.reason: brief, user-friendly reason if you suggest something.
- activity_suggestion.should_navigate:
  - false by default.
  - Set to true only after the user clearly agrees (e.g., "okay", "yes let's try it", "sure, breathing sounds good").
`;

const fallbackResponses = [
  "mm, I'm here with you.",
  "I hear you... tell me more?",
  "that's okay. take your time.",
  "mm, what's on your mind?",
  "I'm listening.",
  "how does that feel?",
  "mm... that sounds like a lot.",
  "I'm here.",
];

function getFallbackResponse() {
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
}

// GPT-based emotion analysis for message tagging
async function analyzeEmotion(text) {
  const fallback = { emotion: "neutral", intensity: 2 };

  if (!text || text.trim().length === 0) {
    return fallback;
  }

  if (!openai) {
    return fallback;
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an emotion tagger for an emotional wellness app.
Return a SINGLE JSON object with:
- "emotion": one of ["neutral","up","heavy","anxious","flat"]
- "intensity": an integer from 1 to 5 (1 = very light, 5 = very strong).
Do NOT add commentary or extra text.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      temperature: 0,
      max_tokens: 50,
    });

    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(raw);

    const validEmotions = ["neutral", "up", "heavy", "anxious", "flat"];
    const emotion = parsed.emotion && validEmotions.includes(parsed.emotion)
      ? parsed.emotion
      : "neutral";

    const intensity =
      typeof parsed.intensity === "number" && parsed.intensity >= 1 && parsed.intensity <= 5
        ? parsed.intensity
        : 2;

    return { emotion, intensity };
  } catch (err) {
    console.error("TRACE emotion analysis failed:", err);
    return fallback;
  }
}

// Endpoint for emotion analysis
app.post('/api/analyze-emotion', async (req, res) => {
  try {
    const { text } = req.body;
    const result = await analyzeEmotion(text);
    res.json(result);
  } catch (error) {
    console.error('Emotion analysis error:', error);
    res.json({ emotion: "neutral", intensity: 2 });
  }
});

// Bubble activity encouragement messages - AI generated
app.post('/api/bubble-encouragement', async (req, res) => {
  try {
    const { count = 8 } = req.body;
    
    if (!openai) {
      return res.json({
        messages: [
          "Each pop is a tiny release.",
          "You're giving yourself permission to pause.",
          "There's something calming about this rhythm.",
          "Let each pop carry away a little tension.",
          "This moment belongs to you.",
          "Notice how satisfying each one feels.",
          "You're doing something gentle for yourself.",
          "Stay as long as you need.",
        ]
      });
    }
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are TRACE, a calm emotional wellness companion. Generate ${count} unique, original encouragement messages for someone popping bubble wrap as a calming activity.

Guidelines:
- Each message should be 6-12 words, short and gentle
- Make them feel intuitive, warm, and genuinely encouraging
- Focus on the sensory experience, self-care, releasing tension, being present
- Vary the themes: some about the action, some about the person, some about the moment
- Never repeat similar phrases or use the same structure twice
- Sound like a wise, calm friend - not a meditation app
- No questions, just gentle statements
- Each message should feel fresh and unique

Return ONLY a JSON array of strings, nothing else.
Example format: ["Message one.", "Message two.", "Message three."]`
        },
        {
          role: "user",
          content: `Generate ${count} unique bubble popping encouragement messages.`
        }
      ],
      temperature: 0.9,
      max_tokens: 400,
    });
    
    const raw = completion.choices[0]?.message?.content ?? "[]";
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const messages = JSON.parse(cleaned);
    
    res.json({ messages });
  } catch (error) {
    console.error('Bubble encouragement error:', error);
    res.json({
      messages: [
        "Each pop is a tiny release.",
        "You're giving yourself permission to pause.",
        "There's something calming about this rhythm.",
        "Let each pop carry away a little tension.",
        "This moment belongs to you.",
        "Notice how satisfying each one feels.",
        "You're doing something gentle for yourself.",
        "Stay as long as you need.",
      ]
    });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const {
      messages: rawMessages,
      userName,
      chatStyle = 'conversation',
      localTime,
      localDay,
      localDate,
      userId,
      deviceId,
    } = req.body;

    // Use real userId if provided, otherwise use a known valid UUID bucket
    const effectiveUserId =
      userId || '2ec61767-ffa7-4665-9ee3-7b5ae6d8bd0c';

    console.log(
      '[TRACE CHAT] effectiveUserId:',
      effectiveUserId,
      'raw userId:',
      userId,
      'raw deviceId:',
      deviceId
    );
    console.log('🧠 /api/chat mode=chat_core userId:', userId, 'deviceId:', deviceId);
    
    // Filter out garbage/corrupted messages from history (empty or whitespace-only content)
    const messages = (rawMessages || []).filter(msg => {
      const content = (msg.content || '').trim();
      // Keep message only if it has meaningful content (not just whitespace/newlines)
      return content.length > 0 && !/^\s*$/.test(content);
    });

    // Detect short acknowledgement messages and skip OpenAI call
    const ACK_MESSAGES = [
      'thanks', 'thank you', 'ty', 'thx', 'ok', 'okay', 'k', 'cool', 'got it', 'sounds good',
      'alright', 'sure', 'word', 'bet', 'appreciate it', '👍', '🙏', '👌', '😊', '😁'
    ];
    const SHORT_ACKS = ['ok', 'k', 'kk', 'yo', 'hey', 'hi'];
    
    const lastUserMsg = messages.filter(m => m.role === 'user').pop();
    if (lastUserMsg?.content) {
      const normalized = lastUserMsg.content.trim().toLowerCase().replace(/[^\w\s]/g, '');
      const isAck = ACK_MESSAGES.includes(normalized) || 
        (SHORT_ACKS.includes(normalized) && normalized.length <= 3);
      
      if (isAck) {
        console.log('[TRACE CHAT] Acknowledgement detected, skipping reply:', normalized);
        return res.json({ message: null });
      }
    }

    // Save latest user message safely (non-blocking for the chat)
    try {
      if (effectiveUserId && Array.isArray(messages)) {
        const lastUserMsg = messages.filter(m => m.role === 'user').pop();
        if (lastUserMsg?.content) {
          await saveUserMessage(effectiveUserId, lastUserMsg.content);
        }
      }
    } catch (err) {
      console.error('[TRACE CHAT SAVE USER ERROR]', err.message || err);
    }
    
    console.log('Received messages:', JSON.stringify(messages, null, 2));
    console.log('User name:', userName);
    console.log('Chat style:', chatStyle);
    console.log('Local time:', localTime, localDay, localDate);
    
    // Ensure fallback responses always include activity_suggestion
    if (!openai) {
      const fallback = getFallbackResponse();
      console.log('TRACE says (fallback):', fallback);
      return res.json({
        message: fallback,
        activity_suggestion: {
          name: null,
          reason: null,
          should_navigate: false,
        },
      });
    }
    
    // Build personalized system prompt with user preferences
    let systemPrompt = TRACE_SYSTEM_PROMPT.replace('{chat_style}', chatStyle);

    // Explicit mode directive for chat_core
    systemPrompt += `

=== MODE: chat_core ===
You are TRACE, a calm emotional companion. Tone: soft, grounded, present, never clinical, never diagnostic.

CRITICAL - NO GREETINGS:
- Assume the user has already seen a short welcome message from TRACE.
- Do NOT start responses with generic greetings like "Hi", "Hey there", "Hello", "How are you today?"
- Respond as if you've already said hello and are in the middle of a conversation.
- Focus on answering or gently reflecting on the user's latest message.

Avoid giving advice unless clearly asked. Favor reflection, gentle questions, and noticing patterns in how the user is feeling.
Validate feelings. Ask open questions sometimes, not every turn. Keep answers short-to-medium for each turn.
Avoid directives like "you should" - use gentle curiosity instead.`;

    if (localTime || localDay || localDate) {
      systemPrompt += `

Time awareness
It's currently ${localTime || 'unknown time'} on ${localDay || 'today'}, ${localDate || ''} for the user. Be naturally aware of this. You may briefly reference time of day (e.g., 'for this part of your evening…') but never ask about specific locations.`;
    }
    
    if (userName) {
      systemPrompt += `

Personalization
The person you're speaking with is named ${userName}. Use their name occasionally in a warm but not over-familiar way.`;
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      max_tokens: 300,
      temperature: 0.7,
      response_format: { type: "json_object" },
    });

    const rawContent = response.choices[0]?.message?.content || '{"message": "mm, what\'s on your mind?", "activity_suggestion": {"name": null, "reason": null, "should_navigate": false}}';
    
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {
        message: '',
        activity_suggestion: { name: null, reason: null, should_navigate: false }
      };
    }
    
    const messageText = (parsed.message || '').trim();
    if (!messageText) {
      const fallbacks = [
        "I'm here with you. What's on your mind?",
        "mm, take your time. I'm listening.",
        "I'm here. No pressure to talk, but I'm listening if you'd like to.",
        "that's a meaningful question. I think the answer is different for everyone, but I'm here to help you find yours.",
      ];
      parsed.message = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }

    const assistantText = parsed.message || "I'm here.";

    // Save assistant reply safely
    try {
      if (effectiveUserId && assistantText) {
        await saveAssistantMessage(effectiveUserId, assistantText);
      }
    } catch (err) {
      console.error('[TRACE CHAT SAVE ASSISTANT ERROR]', err.message || err);
    }
    
    return res.json({
      message: assistantText,
      activity_suggestion: parsed.activity_suggestion || { name: null, reason: null, should_navigate: false }
    });
  } catch (error) {
    console.error('TRACE API error:', error.message || error);
    res.status(500).json({ error: 'Failed to get response', message: "mm, I'm here." });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// ==================== PROFILE ENDPOINTS ====================

// GET /api/profile - Fetch or create user profile
app.get('/api/profile', async (req, res) => {
  const { userId } = req.query;
  
  console.log('[PROFILE] GET request for userId:', userId);
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  if (!supabaseServer) {
    console.log('[PROFILE] No Supabase configured');
    return res.status(500).json({ error: 'Database not configured' });
  }
  
  try {
    // Try to fetch existing profile
    const { data: existing, error: fetchError } = await supabaseServer
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (existing) {
      console.log('[PROFILE] Found existing profile for:', userId);
      return res.json(existing);
    }
    
    // Profile not found - create default
    console.log('[PROFILE] Creating default profile for:', userId);
    const defaultProfile = {
      user_id: userId,
      display_name: null,
      email: null,
      theme: 'sage',
      push_enabled: false,
      email_enabled: false,
      plan_status: 'free',
      plan_expires_at: null,
      has_completed_onboarding: false,
    };
    
    const { data: created, error: insertError } = await supabaseServer
      .from('profiles')
      .insert(defaultProfile)
      .select()
      .single();
    
    if (insertError) {
      console.error('[PROFILE] Insert error:', insertError.message);
      return res.status(500).json({ error: insertError.message });
    }
    
    console.log('[PROFILE] Created new profile for:', userId);
    return res.json(created);
    
  } catch (err) {
    console.error('[PROFILE] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/profile - Update user profile
app.patch('/api/profile', async (req, res) => {
  const { userId, displayName, email, theme, pushEnabled, emailEnabled } = req.body;
  
  console.log('[PROFILE] PATCH request for userId:', userId);
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  
  try {
    const updates = { updated_at: new Date().toISOString() };
    
    if (displayName !== undefined) updates.display_name = displayName;
    if (email !== undefined) updates.email = email;
    if (theme !== undefined) updates.theme = theme;
    if (pushEnabled !== undefined) updates.push_enabled = pushEnabled;
    if (emailEnabled !== undefined) updates.email_enabled = emailEnabled;
    
    const { data, error } = await supabaseServer
      .from('profiles')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('[PROFILE] Update error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('[PROFILE] Updated profile for:', userId);
    return res.json(data);
    
  } catch (err) {
    console.error('[PROFILE] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/subscription/mark-upgraded - Update subscription status
app.post('/api/subscription/mark-upgraded', async (req, res) => {
  const { userId, planStatus, planExpiresAt, hasCompletedOnboarding } = req.body;
  
  console.log('[SUBSCRIPTION] mark-upgraded for userId:', userId, 'plan:', planStatus);
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Database not configured' });
  }
  
  try {
    const updates = { updated_at: new Date().toISOString() };
    
    if (planStatus !== undefined) updates.plan_status = planStatus;
    if (planExpiresAt !== undefined) updates.plan_expires_at = planExpiresAt;
    if (hasCompletedOnboarding !== undefined) updates.has_completed_onboarding = hasCompletedOnboarding;
    
    const { data, error } = await supabaseServer
      .from('profiles')
      .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
      .select()
      .single();
    
    if (error) {
      console.error('[SUBSCRIPTION] Update error:', error.message);
      return res.status(500).json({ error: error.message });
    }
    
    console.log('[SUBSCRIPTION] Updated subscription for:', userId);
    return res.json(data);
    
  } catch (err) {
    console.error('[SUBSCRIPTION] Error:', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// DELETE /api/account - Delete user account and all related data
app.delete('/api/account', async (req, res) => {
  try {
    const { user, error: authError } = await getUserFromAuthHeader(req);
    if (authError || !user) {
      console.log('[DeleteAccount] Auth failed:', authError);
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const userId = user.id;
    console.log('[DeleteAccount] Deleting account for userId:', userId);

    if (!supabaseServer) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // Delete per-user data from all user-scoped tables
    // Using individual try-catch to continue even if some tables don't exist
    const tablesToDelete = ['chat_messages', 'welcome_history', 'profiles'];
    
    for (const table of tablesToDelete) {
      try {
        const { error } = await supabaseServer.from(table).delete().eq('user_id', userId);
        if (error && !error.message.includes('does not exist') && !error.message.includes('schema cache')) {
          console.warn(`[DeleteAccount] Non-critical error deleting from ${table}:`, error.message);
        } else if (!error) {
          console.log(`[DeleteAccount] Deleted from ${table}`);
        }
      } catch (e) {
        console.warn(`[DeleteAccount] Skipping ${table}:`, e.message);
      }
    }

    // Delete the auth user using the service role client
    const { error: deleteUserError } = await supabaseServer.auth.admin.deleteUser(userId);
    if (deleteUserError) {
      console.error('[DeleteAccount] Auth delete error:', deleteUserError.message);
      return res.status(500).json({ error: 'Failed to delete auth user' });
    }

    console.log('[DeleteAccount] Successfully deleted account:', userId);
    return res.json({ success: true });

  } catch (err) {
    console.error('[DeleteAccount] Unexpected error:', err.message);
    return res.status(500).json({ error: 'Unexpected server error' });
  }
});

// POST /api/account/delete - Soft delete / anonymize account
app.post('/api/account/delete', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    if (!supabaseServer) {
      return res.status(500).json({ error: 'Database not configured' });
    }

    // 1. Soft-delete / anonymize profile
    const { error: profileError } = await supabaseServer
      .from('profiles')
      .update({
        display_name: null,
        email: null,
        plan_status: 'deleted',
        has_completed_onboarding: false,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (profileError) {
      console.error('[DELETE ACCOUNT] Profile update error:', profileError);
      return res.status(500).json({ error: 'Failed to update profile' });
    }

    console.log('[DELETE ACCOUNT] Soft deleted account for userId:', userId);

    return res.json({ success: true });
  } catch (err) {
    console.error('[DELETE ACCOUNT] Unexpected error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ==================== END PROFILE ENDPOINTS ====================

// Helper: Simple similarity check (Jaccard similarity on words)
function calculateSimilarity(str1, str2) {
  const words1 = new Set(str1.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/));
  const words2 = new Set(str2.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/));
  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);
  return intersection.size / union.size;
}

// Helper: Check if greeting is too similar to any recent ones
function isTooSimilar(newGreeting, recentGreetings, threshold = 0.6) {
  for (const recent of recentGreetings) {
    if (calculateSimilarity(newGreeting, recent) > threshold) {
      return true;
    }
  }
  return false;
}

// Helper: Get recent greetings from Supabase welcome_history
async function getRecentGreetings(userId, limit = 30) {
  if (!supabaseServer || !userId) return [];
  try {
    const { data, error } = await supabaseServer
      .from('welcome_history')
      .select('greeting')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) {
      console.error('Error fetching welcome history:', error.message);
      return [];
    }
    return (data || []).map(row => row.greeting);
  } catch (err) {
    console.error('Exception fetching welcome history:', err.message);
    return [];
  }
}

// Helper: Save greeting to Supabase welcome_history
async function saveGreetingToHistory(userId, greeting) {
  if (!supabaseServer || !userId) return;
  try {
    // Insert new greeting
    const { error: insertError } = await supabaseServer
      .from('welcome_history')
      .insert({ user_id: userId, greeting });
    if (insertError) {
      console.error('Error saving greeting to history:', insertError.message);
      return;
    }
    // Keep only the last 30 greetings per user
    const { data: allGreetings } = await supabaseServer
      .from('welcome_history')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (allGreetings && allGreetings.length > 30) {
      const idsToDelete = allGreetings.slice(30).map(row => row.id);
      await supabaseServer
        .from('welcome_history')
        .delete()
        .in('id', idsToDelete);
    }
  } catch (err) {
    console.error('Exception saving greeting to history:', err.message);
  }
}

// Helper: Generate stable anonymous key from IP
function getStableAnonKey(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() 
    || req.socket?.remoteAddress 
    || 'unknown';
  // Simple hash of IP for privacy
  let hash = 0;
  for (let i = 0; i < ip.length; i++) {
    hash = ((hash << 5) - hash) + ip.charCodeAt(i);
    hash = hash & hash; // Convert to 32bit integer
  }
  return `anon:${Math.abs(hash).toString(36)}`;
}

// Generate a unique AI-powered welcome greeting (with history-based uniqueness)
app.post('/api/greeting', async (req, res) => {
  try {
    const { userName, localTime, localDay, localDate, userId: providedUserId, deviceId } = req.body;
    
    // Generate stable user key - prefer userId, then deviceId-based, then IP-based
    const effectiveUserId = providedUserId 
      || (deviceId ? `device:${deviceId}` : null)
      || getStableAnonKey(req);
    
    console.log('Generating greeting for:', userName || 'anonymous user', 'effectiveUserId:', effectiveUserId);
    console.log('Time context:', localTime, localDay, localDate);
    
    // Fetch recent greetings for this user
    const recentGreetings = await getRecentGreetings(effectiveUserId);
    const recentWelcomesText = recentGreetings.length > 0 
      ? recentGreetings.slice(0, 10).map((g, i) => `${i + 1}. "${g}"`).join('\n')
      : 'None yet';
    
    if (!openai) {
      // Fallback greetings when no API key - warm and welcoming
      const hour = new Date().getHours();
      let fallbackGreetings;
      
      if (hour >= 5 && hour < 12) {
        fallbackGreetings = [
          userName ? `Good morning, ${userName}. I hope today treats you gently.` : "Good morning. I hope today treats you gently.",
          userName ? `Morning, ${userName}. It's nice to see you here.` : "Morning. It's nice to see you here.",
          userName ? `Hey, ${userName}. I hope you slept well.` : "Hey. I hope you slept well.",
        ];
      } else if (hour >= 12 && hour < 17) {
        fallbackGreetings = [
          userName ? `Hey, ${userName}. I hope your day's been kind to you.` : "Hey. I hope your day's been kind to you.",
          userName ? `Hi, ${userName}. It's good to see you.` : "Hi. It's good to see you.",
          userName ? `Good afternoon, ${userName}. I'm here if you'd like some company.` : "Good afternoon. I'm here if you'd like some company.",
        ];
      } else if (hour >= 17 && hour < 22) {
        fallbackGreetings = [
          userName ? `Hey, ${userName}. I hope today was gentle on you.` : "Hey. I hope today was gentle on you.",
          userName ? `Good evening, ${userName}. It's nice to see you.` : "Good evening. It's nice to see you.",
          userName ? `Hi, ${userName}. I hope you're winding down okay.` : "Hi. I hope you're winding down okay.",
        ];
      } else {
        fallbackGreetings = [
          userName ? `Hey, ${userName}. It's late—I hope you're okay.` : "Hey. It's late—I hope you're okay.",
          userName ? `Hi, ${userName}. I'm here if you need some company.` : "Hi. I'm here if you need some company.",
          userName ? `Hey, ${userName}. I'm here—no pressure to talk.` : "Hey. I'm here—no pressure to talk.",
        ];
      }
      // Filter out recently used fallbacks
      const availableFallbacks = fallbackGreetings.filter(g => !isTooSimilar(g, recentGreetings, 0.7));
      const selectedFallback = availableFallbacks.length > 0 
        ? availableFallbacks[Math.floor(Math.random() * availableFallbacks.length)]
        : fallbackGreetings[Math.floor(Math.random() * fallbackGreetings.length)];
      
      // Save to history
      await saveGreetingToHistory(effectiveUserId, selectedFallback);
      return res.json({ ok: true, message: selectedFallback, greeting: selectedFallback });
    }
    
    const greetingPrompt = `You are TRACE, a calm and grounded emotional companion. Generate ONE short welcome message.

Context:
- User's name: ${userName || 'unknown (don\'t use a name)'}
- Current time: ${localTime || 'unknown'}
- Day: ${localDay || 'unknown'}

CRITICAL - DO NOT REPEAT OR PARAPHRASE these recent welcomes:
${recentWelcomesText}

STRICT RULES:
- EXACTLY ONE SENTENCE, 16-24 words max
- Tone: calm, warm, not overly excited or peppy
- End with an open invitation to share, phrased gently
- NO follow-up questions list, NO bullet points
- NO exclamation marks

GOOD examples:
- "Hey, I'm here with you. What's been sitting on your mind today?"
- "Welcome back. I'm right here if you want to unpack anything from today."
- "Good to see you. I'm here whenever you're ready to share what's on your mind."
- "Hey${userName ? ', ' + userName : ''}. Take your time—I'm listening."

BAD examples (AVOID):
- Multiple sentences
- "How are you today?" (too generic)
- Overly enthusiastic greetings
- Questions lists or bullet points

Respond with ONLY the greeting text. No quotation marks.`;

    // Generate greeting with potential retry for uniqueness
    let greeting = null;
    let attempts = 0;
    const maxAttempts = 2;
    
    while (attempts < maxAttempts) {
      const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: greetingPrompt }],
        max_tokens: 60,
        temperature: 0.95, // Higher creativity for unique greetings
      });

      greeting = response.choices[0]?.message?.content?.trim() || "I'm here with you.";
      greeting = greeting.replace(/^["']|["']$/g, '');
      
      // Check similarity - regenerate if too similar
      if (!isTooSimilar(greeting, recentGreetings, 0.6)) {
        break;
      }
      console.log(`Greeting attempt ${attempts + 1} was too similar, regenerating...`);
      attempts++;
    }
    
    console.log('Generated greeting:', greeting);
    
    // Save to history
    await saveGreetingToHistory(effectiveUserId, greeting);
    
    res.json({ ok: true, message: greeting, greeting });
  } catch (error) {
    console.error('Greeting API error:', error.message || error);
    res.status(500).json({ ok: false, error: 'Failed to generate greeting', message: "Whenever you're ready.", greeting: "Whenever you're ready." });
  }
});

// Sentry error handler (v8 uses setupExpressErrorHandler)
if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TRACE API server running on port ${PORT}`);
});

// ============================================
// TRACE Verse-Time Notification Scheduler
// ============================================
// Runs every 60 seconds, checks each user's local timezone,
// and sends push notifications at 9:47am, 3:16pm, or 8:28pm local time.

function getLocalHMForTimezone(timeZone, date) {
  try {
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const get = (type) => parts.find(p => p.type === type)?.value || "00";
    const year = get("year");
    const month = get("month");
    const day = get("day");
    const hour = parseInt(get("hour"), 10);
    const minute = parseInt(get("minute"), 10);
    const ymd = `${year}-${month}-${day}`;
    return { hour, minute, ymd };
  } catch (err) {
    console.error('Invalid timezone:', timeZone, err.message);
    return null;
  }
}

function isVerseTimeLocal(hour, minute) {
  return (
    (hour === 9 && minute === 47) ||
    (hour === 15 && minute === 16) ||
    (hour === 20 && minute === 28)
  );
}

async function getUserFirstName(supabaseAdmin, userId) {
  try {
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("name")
      .eq("id", userId)
      .maybeSingle();

    if (error || !data) return null;

    if (data.name && data.name.trim().length > 0) {
      const first = data.name.trim().split(" ")[0];
      return first || null;
    }

    return null;
  } catch (err) {
    console.error("[TRACE] Error getting user name:", err.message);
    return null;
  }
}

function getPersonalizedCheckinMessage(date, firstName) {
  const hour = date.getHours();
  const dayNames = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const day = dayNames[date.getDay()];
  const name = firstName && firstName.trim && firstName.trim().length > 0 ? firstName.trim() : null;

  function pick(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  if (hour < 11) {
    const messages = [
      (n) => `Good morning${n ? " " + n : ""}, how are you today?`,
      (n) => `Morning${n ? " " + n : ""}. Just checking in as your day starts.`,
      (n) => `Hi${n ? " " + n : ""}, hope your morning's okay so far.`,
      (n) => `Hey${n ? " " + n : ""}, how'd you sleep?`,
      (n) => `Morning${n ? " " + n : ""}, what's on your mind today?`,
      (n) => `Hey${n ? " " + n : ""}, just wanted to say hi before your day gets going.`,
      (n) => `Good morning${n ? " " + n : ""}. No rush, just here if you want to talk.`,
      (n) => `Hi${n ? " " + n : ""}, hope you're easing into ${day} okay.`,
      (n) => `Hey${n ? " " + n : ""}, new day. How are you feeling?`,
      (n) => `Morning${n ? " " + n : ""}. Hope you're starting off okay.`,
    ];
    return pick(messages)(name);
  } else if (hour < 17) {
    const messages = [
      (n) => `Hey${n ? " " + n : ""}, hope your day's going okay.`,
      (n) => `Hi${n ? " " + n : ""}, just checking in this ${day}.`,
      (n) => `Hey${n ? " " + n : ""}, if you need a minute to breathe, I'm here.`,
      (n) => `How's your ${day} going${n ? ", " + n : ""}?`,
      (n) => `Hey${n ? " " + n : ""}, just thinking of you. How's it going?`,
      (n) => `Hi${n ? " " + n : ""}, anything on your mind?`,
      (n) => `Hey${n ? " " + n : ""}, taking a break? I'm around if you want to chat.`,
      (n) => `Just checking in${n ? ", " + n : ""}. Hope your afternoon's treating you okay.`,
      (n) => `Hey${n ? " " + n : ""}, how are you doing right now?`,
      (n) => `Hi${n ? " " + n : ""}, hope ${day}'s not being too rough on you.`,
      (n) => `Hey${n ? " " + n : ""}, what's going on today?`,
    ];
    return pick(messages)(name);
  } else {
    const messages = [
      (n) => `Good evening${n ? " " + n : ""}, hope your day wasn't too heavy.`,
      (n) => `Hi${n ? " " + n : ""}, just saying good evening. I'm here if you feel like talking.`,
      (n) => `Hey${n ? " " + n : ""}, winding down for ${day}? I'm around if you want to check in.`,
      (n) => `Evening${n ? ", " + n : ""}, how was your day?`,
      (n) => `Hey${n ? " " + n : ""}, how are you feeling tonight?`,
      (n) => `Hi${n ? " " + n : ""}, hope you're getting some time to rest.`,
      (n) => `Hey${n ? " " + n : ""}, end of ${day}. How are you holding up?`,
      (n) => `Good evening${n ? " " + n : ""}. Just here if you need to talk through anything.`,
      (n) => `Hey${n ? " " + n : ""}, no pressure, just wanted to check in.`,
      (n) => `Hi${n ? " " + n : ""}, how was today?`,
      (n) => `Hey${n ? " " + n : ""}, hope you can breathe a little now that the day's winding down.`,
    ];
    return pick(messages)(name);
  }
}

async function sendPushNotificationToUser(userId, message) {
  const appId = process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;
  
  if (!appId || !apiKey) {
    console.log("[TRACE PUSH] OneSignal not configured - skipping notification");
    return;
  }
  
  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_aliases: {
          external_id: [userId]
        },
        target_channel: 'push',
        contents: { en: message },
        headings: { en: 'TRACE' }
      })
    });
    
    const result = await response.json();
    
    if (result.errors) {
      console.error("[TRACE PUSH] OneSignal error:", result.errors);
    } else {
      console.log("[TRACE PUSH] Sent to user", userId, "- ID:", result.id);
    }
  } catch (err) {
    console.error("[TRACE PUSH] Failed to send notification:", err.message);
  }
}

let lastProcessedKey = null;

async function runVerseCheckins() {
  if (!supabaseServer) {
    return;
  }

  const now = new Date();
  const key = now.toISOString().slice(0, 16); // "YYYY-MM-DDTHH:MM"
  
  if (key === lastProcessedKey) {
    return; // Already processed this minute
  }
  lastProcessedKey = key;

  try {
    const { data: users, error } = await supabaseServer
      .from('user_preferences')
      .select('user_id, time_zone, last_checkin_at')
      .eq('notifications_enabled', true);

    if (error) {
      console.error('Error fetching user preferences:', error.message);
      return;
    }

    if (!users || users.length === 0) {
      return;
    }

    const usersToUpdate = [];

    for (const user of users) {
      const tz = user.time_zone || 'America/Los_Angeles';
      const localTime = getLocalHMForTimezone(tz, now);
      
      if (!localTime) continue;

      const { hour, minute, ymd } = localTime;

      if (!isVerseTimeLocal(hour, minute)) {
        continue;
      }

      if (user.last_checkin_at === ymd) {
        continue; // Already sent today
      }

      const firstName = await getUserFirstName(supabaseServer, user.user_id);
      const nowInUserTz = new Date(now.toLocaleString('en-US', { timeZone: tz }));
      const message = getPersonalizedCheckinMessage(nowInUserTz, firstName);
      await sendPushNotificationToUser(user.user_id, message);
      usersToUpdate.push({ user_id: user.user_id, ymd });
    }

    // Update last_checkin_at for all users who received a notification
    for (const { user_id, ymd } of usersToUpdate) {
      await supabaseServer
        .from('user_preferences')
        .update({ last_checkin_at: ymd })
        .eq('user_id', user_id);
    }

    if (usersToUpdate.length > 0) {
      console.log(`[TRACE] Sent verse-time notifications to ${usersToUpdate.length} user(s)`);
    }
  } catch (err) {
    console.error('Error in runVerseCheckins:', err.message);
  }
}

// Start the verse-time scheduler (runs every 60 seconds)
if (supabaseServer) {
  setInterval(() => {
    runVerseCheckins().catch(err => {
      console.error('Verse checkin error:', err.message);
    });
  }, 60_000);
  
  console.log('📱 TRACE verse-time scheduler started (checks every 60s)');
  console.log('   Notifications at 9:47am, 3:16pm & 8:28pm in each user\'s local timezone');
}

// Test endpoint to send a test push notification
app.post('/api/test-push', async (req, res) => {
  const { userId, message } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'userId is required' });
  }
  
  const testMessage = message || 'Hey 👋 this is a test notification from TRACE!';
  
  try {
    await sendPushNotificationToUser(userId, testMessage);
    res.json({ success: true, message: 'Test notification sent' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint to send push directly by subscription ID
app.post('/api/test-push-direct', async (req, res) => {
  const { subscriptionId, message } = req.body;
  
  if (!subscriptionId) {
    return res.status(400).json({ error: 'subscriptionId is required' });
  }
  
  const appId = process.env.VITE_ONESIGNAL_APP_ID || process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;
  
  if (!appId || !apiKey) {
    return res.status(500).json({ error: 'OneSignal not configured' });
  }
  
  try {
    const response = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Key ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_subscription_ids: [subscriptionId],
        contents: { en: message || 'Direct test from TRACE!' },
        headings: { en: 'TRACE' }
      })
    });
    
    const result = await response.json();
    console.log('[TRACE PUSH DIRECT] Response:', JSON.stringify(result));
    
    if (result.errors) {
      return res.status(400).json({ error: result.errors });
    }
    
    res.json({ success: true, id: result.id, result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test endpoint to trigger verse checkin manually
app.post('/api/test-verse-checkin', async (req, res) => {
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }
  
  // Reset last processed key to allow immediate testing
  lastProcessedKey = null;
  
  try {
    await runVerseCheckins();
    res.json({ success: true, message: 'Verse checkin run completed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/ping', (req, res) => {
  console.log('🔔 /api/ping HIT');
  res.json({ ok: true });
});

app.get('/api/debug-messages', async (req, res) => {
  if (!supabaseServer) {
    console.error('[TRACE DEBUG MESSAGES] Supabase not configured');
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    console.log('[TRACE DEBUG MESSAGES] fetching latest messages...');
    const { data, error } = await supabaseServer
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[TRACE DEBUG MESSAGES ERROR]', error.message);
      return res.status(500).json({ error: error.message });
    }

    console.log('[TRACE DEBUG MESSAGES OK] rows:', data?.length || 0);
    return res.json({ rows: data || [] });
  } catch (err) {
    console.error('[TRACE DEBUG MESSAGES EXCEPTION]', err.message || err);
    return res.status(500).json({ error: 'Unexpected error' });
  }
});

app.get('/api/chat-history', async (req, res) => {
  try {
    const { userId } = req.query;

    const effectiveUserId = userId || '2ec61767-ffa7-4665-9ee3-7b5ae6d8bd0c';
    console.log('[TRACE HISTORY] effectiveUserId:', effectiveUserId);

    if (!effectiveUserId) {
      return res.status(400).json({ ok: false, error: 'Missing user identifier' });
    }

    const history = await getChatHistory(effectiveUserId);

    res.json({
      ok: true,
      messages: history,
    });
  } catch (err) {
    console.error('[TRACE HISTORY ROUTE ERROR]', err.message || err);
    res.status(500).json({
      ok: false,
      error: 'Failed to load chat history',
    });
  }
});

// Patterns: summarize last hour of conversation
// mode: patterns_last_hour
app.post('/api/patterns/last-hour', async (req, res) => {
  try {
    const { userId, deviceId } = req.body || {};

    const effectiveUserId = userId || '2ec61767-ffa7-4665-9ee3-7b5ae6d8bd0c';

    if (!supabaseServer) {
      console.log('🧠 /api/patterns/last-hour userId:', userId, 'deviceId:', deviceId, 'hasHistory:', false);
      return res.status(500).json({
        ok: false,
        hasHistory: false,
        summaryText: null,
      });
    }

    const { data, error } = await supabaseServer
      .from('chat_messages')
      .select('role, content, created_at')
      .eq('user_id', effectiveUserId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('[TRACE PATTERNS] history query error:', error);
      console.log('🧠 /api/patterns/last-hour userId:', userId, 'deviceId:', deviceId, 'hasHistory:', false);
      return res.status(500).json({
        ok: false,
        hasHistory: false,
        summaryText: null,
      });
    }

    const allMessages = data || [];
    const recent = filterMessagesToLastHour(allMessages);
    const hasHistory = recent.length > 0;

    console.log('🧠 /api/patterns/last-hour userId:', userId, 'deviceId:', deviceId, 'hasHistory:', hasHistory);

    if (!hasHistory) {
      return res.json({
        ok: true,
        hasHistory: false,
        summaryText: null,
      });
    }

    // Count user messages and detect emotional keywords
    const userMessages = recent.filter(m => m.role === 'user');
    const userMessageCount = userMessages.length;
    const allUserText = userMessages.map(m => (m.content || '').toLowerCase()).join(' ');
    
    // Detect emotional keywords
    const emotionalKeywords = [];
    if (/stress|stressed|stressful|pressure/.test(allUserText)) emotionalKeywords.push('stress');
    if (/overwhelm|overwhelming|too much/.test(allUserText)) emotionalKeywords.push('overwhelm');
    if (/anxious|anxiety|worried|worry|nervous/.test(allUserText)) emotionalKeywords.push('anxiety');
    if (/tired|exhausted|drained|fatigue/.test(allUserText)) emotionalKeywords.push('fatigue');
    if (/sad|down|lonely|alone|empty/.test(allUserText)) emotionalKeywords.push('sadness');
    if (/rest|relax|calm|peace/.test(allUserText)) emotionalKeywords.push('rest-seeking');
    if (/grateful|thankful|gratitude|appreciate/.test(allUserText)) emotionalKeywords.push('gratitude');
    if (/happy|excited|good|great|joy/.test(allUserText)) emotionalKeywords.push('positive');
    if (/confused|uncertain|unsure|lost/.test(allUserText)) emotionalKeywords.push('uncertainty');

    // Build compact convo text for the model
    const convoText = recent
      .map((m) => {
        const role = m.role || 'user';
        const content = (m.content || '').slice(0, 200);
        return `${role === 'assistant' ? 'TRACE' : 'User'}: ${content}`;
      })
      .join('\n');

    // Build context summary for the model
    const contextSummary = `User messages: ${userMessageCount}` +
      (emotionalKeywords.length ? `\nEmotional themes detected: ${emotionalKeywords.join(', ')}` : '');

    const systemPrompt = `You are TRACE, describing the emotional tone of a recent conversation in 1 gentle sentence.
mode: patterns_last_hour

Tone: observational, non-judgmental, no advice, no instructions.
- Do NOT ask questions.
- Do NOT mention "last hour" or time explicitly.
- Just describe the essence (e.g., "It sounds like you've been…" or "There's a sense of…").
- Keep it soft and validating.`;

    const userPrompt = `${contextSummary}

Recent conversation:
${convoText}

Write one gentle, observational sentence about this person's emotional state. No questions, no advice.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 80,
    });

    const summaryText =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "You've been holding a lot. It's okay to soften here.";

    return res.json({
      ok: true,
      hasHistory: true,
      summaryText,
    });
  } catch (err) {
    console.error('❌ /api/patterns/last-hour error:', err);
    return res.status(500).json({
      ok: false,
      hasHistory: false,
      summaryText: null,
    });
  }
});

// mode: patterns_weekly_narrative
app.post('/api/patterns/weekly-summary', async (req, res) => {
  try {
    const {
      userName,
      localDate,
      localDay,
      localTime,
      weekSessions = 0,
      weekActiveDays = 0,
      dominantKind = null,
      dominantKindCount = 0,
      journalWeekCount = 0,
    } = req.body || {};

    console.log('🧠 /api/patterns/weekly-summary sessions:', weekSessions, 'days:', weekActiveDays);

    // If no activity at all this week
    if (weekSessions === 0 && journalWeekCount === 0) {
      return res.json({
        ok: true,
        summaryText: "This week is still opening up. As you start checking in and journaling, I'll begin tracing the shape of your rhythm with you.",
      });
    }

    // Build context for OpenAI
    const contextParts = [];
    if (userName) contextParts.push(`User: ${userName}`);
    if (localDay) contextParts.push(`Day: ${localDay}`);
    if (localTime) contextParts.push(`Time: ${localTime}`);
    const contextLine = contextParts.length ? contextParts.join(', ') : '';

    // Build data summary
    const dataParts = [];
    if (weekSessions > 0) dataParts.push(`Sessions this week: ${weekSessions}`);
    if (weekActiveDays > 0) dataParts.push(`Active days: ${weekActiveDays}`);
    if (dominantKind && dominantKindCount > 0) {
      dataParts.push(`Most used practice: ${dominantKind} (${dominantKindCount} times)`);
    }
    if (journalWeekCount > 0) dataParts.push(`Journal entries: ${journalWeekCount}`);
    const dataLine = dataParts.join('\n');

    const systemPrompt = `You are TRACE, summarizing a week of check-ins and journaling.
mode: patterns_weekly_narrative

Tone: calm, validating, no advice, no instructions.
- 2–3 sentences maximum.
- Focus on noticing consistency, effort, and the kinds of practices they're drawn to (breathing, grounding, gratitude, etc.).
- Do not mention exact counts mechanically; weave them into natural language.
- Do not ask questions.
- Talk directly to the user as "you".`;

    const userPrompt = `${contextLine ? contextLine + '\n' : ''}${dataLine}

In 2–3 sentences, gently reflect what this week's rhythm suggests about how this person has been showing up for themselves. No advice, no questions, just noticing and affirming.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.8,
      max_tokens: 150,
    });

    const summaryText =
      completion.choices?.[0]?.message?.content?.trim() ||
      'Your week is still taking shape. As you keep checking in, TRACE will gently sketch the pattern.';

    res.json({
      ok: true,
      summaryText,
    });
  } catch (err) {
    console.error('🧠 /api/patterns/weekly-summary error:', err);
    res.status(500).json({
      ok: false,
      summaryText:
        'Your week is still taking shape. As you keep checking in, TRACE will gently sketch the pattern.',
    });
  }
});

// POST /api/patterns-reflection - Generate personalized weekly pattern assessment
app.post('/api/patterns-reflection', async (req, res) => {
  try {
    const {
      userName,
      localTime,
      localDay,
      localDate,
      weekSessions,
      weekActiveDays,
      dominantKind,
      dominantKindCount,
      journalWeekCount,
      peakWindowLabel,
      energyRhythmLabel,
      energyRhythmDetail,
      stressScore,
      stressEchoEvents,
      behaviorSignatures,
    } = req.body || {};

    console.log('🧠 /api/patterns-reflection called with:', {
      weekSessions,
      weekActiveDays,
      dominantKind,
      stressEchoEvents,
      behaviorSignatures,
    });

    // Build a rich context prompt for OpenAI
    const contextParts = [];

    if (weekSessions > 0) {
      contextParts.push(`${weekSessions} session${weekSessions === 1 ? '' : 's'} across ${weekActiveDays} day${weekActiveDays === 1 ? '' : 's'} this week`);
    }

    if (dominantKind && dominantKindCount) {
      contextParts.push(`most frequent activity: ${dominantKind} (${dominantKindCount}x)`);
    }

    if (journalWeekCount > 0) {
      contextParts.push(`${journalWeekCount} journal ${journalWeekCount === 1 ? 'entry' : 'entries'}`);
    }

    if (peakWindowLabel) {
      contextParts.push(`peak activity: ${peakWindowLabel}`);
    }

    if (stressEchoEvents > 0) {
      contextParts.push(`${stressEchoEvents} stress-related moment${stressEchoEvents === 1 ? '' : 's'} detected`);
    }

    if (behaviorSignatures && behaviorSignatures.length > 0) {
      const signatureLabels = {
        eveningOverthinking: 'Evening Overthinking (mind gets busier as the day winds down)',
        midweekBurnout: 'Midweek Burnout (strain or heaviness mid-week)',
        morningSharpness: 'Morning Sharpness (clarity and focus in morning hours)',
        solitudeRecovery: 'Solitude Recovery (calm and grounding after stress)',
      };

      const readableSignatures = behaviorSignatures
        .map(sig => signatureLabels[sig] || sig)
        .join(', ');

      contextParts.push(`behavioral patterns: ${readableSignatures}`);
    }

    const weekContext = contextParts.length > 0
      ? contextParts.join('; ')
      : 'starting to establish patterns';

    const systemPrompt = `You are TRACE, a compassionate emotional wellness companion.

You are creating a brief, grounded weekly reflection based on behavioral patterns.

Your reflection should:
- Acknowledge what you notice with warmth and curiosity
- Speak in 2-3 sentences max
- Avoid clinical language or diagnosis
- Frame patterns as information, not judgment
- Use "you're" instead of "you are" for a softer tone

Keep it real, warm, and brief.`;

    const userPrompt = `This week's pattern snapshot:

${weekContext}

Write a gentle 2-3 sentence reflection that acknowledges what's emerging in their patterns this week.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 150,
    });

    const reflection =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "You're building your rhythm in the ways that work for you. That consistency matters.";

    console.log('✅ Patterns reflection generated:', reflection);

    return res.json({
      ok: true,
      reflection,
    });
  } catch (err) {
    console.error('❌ /api/patterns-reflection error:', err);
    return res.json({
      ok: true,
      reflection: "You've been showing up this week. Even noticing your patterns is its own kind of care.",
    });
  }
});

// POST /api/patterns/full-reflection - Generate three AI reflections (today, last hour, week)
app.post('/api/patterns/full-reflection', async (req, res) => {
  const defaults = {
    todayText: "TRACE is still gathering today's moments. As you move through the day, the shape of it will gently come into focus.",
    lastHourText: "This hour has been quiet so far. Sometimes the spaces between words are just as meaningful.",
    weekText: "TRACE is still learning your weekly rhythm. A few more days and the shape of your week will start to appear.",
  };

  try {
    const { userId, deviceId } = req.body || {};

    console.log('🧠 /api/patterns/full-reflection called with:', { userId, deviceId });

    if (!supabaseServer) {
      console.log('⚠️ /api/patterns/full-reflection: No Supabase configured');
      return res.json(defaults);
    }

    if (!deviceId && !userId) {
      console.log('⚠️ /api/patterns/full-reflection: No deviceId or userId provided');
      return res.json(defaults);
    }

    // Calculate time boundaries
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Build query for this week's messages
    let query = supabaseServer
      .from('chat_messages')
      .select('content, created_at, role')
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: weekMessages, error } = await query;

    if (error) {
      console.error('❌ /api/patterns/full-reflection query error:', error);
      return res.json(defaults);
    }

    if (!weekMessages || weekMessages.length === 0) {
      console.log('⚠️ /api/patterns/full-reflection: No messages found');
      return res.json(defaults);
    }

    // Filter messages by time period (only user messages for analysis)
    const userMessages = weekMessages.filter(m => m.role === 'user');
    const todayMessages = userMessages.filter(m => new Date(m.created_at) >= startOfToday);
    const lastHourMessages = userMessages.filter(m => new Date(m.created_at) >= oneHourAgo);

    // Build context summaries
    const todaySummary = todayMessages.length > 0
      ? `Today's ${todayMessages.length} message(s): ${todayMessages.map(m => m.content?.slice(0, 100)).join(' | ')}`
      : 'No messages today yet.';

    const lastHourSummary = lastHourMessages.length > 0
      ? `Last hour's ${lastHourMessages.length} message(s): ${lastHourMessages.map(m => m.content?.slice(0, 100)).join(' | ')}`
      : 'No messages in the last hour.';

    const weekSummary = userMessages.length > 0
      ? `This week's ${userMessages.length} message(s): ${userMessages.slice(-10).map(m => m.content?.slice(0, 80)).join(' | ')}`
      : 'No messages this week.';

    const systemPrompt = `You are TRACE, a compassionate emotional wellness companion.

Generate three brief reflections based on the user's recent chat history:

1. TODAY: Reflect on the overall shape or arc of today—themes, energy, or mood across the day
2. LAST HOUR: Focus on the most recent emotional temperature—what's immediately present right now
3. YOUR WEEK: Identify broader patterns, rhythms, or recurring themes across the week

CRITICAL: Each reflection MUST cover DIFFERENT aspects. Avoid redundancy:
- TODAY = big picture of the day's journey
- LAST HOUR = the immediate moment, what's freshest
- WEEK = patterns over time, not a repeat of today

Guidelines:
- Keep each reflection to 2-3 sentences
- Be specific when patterns are clear; be gentle when data is sparse
- Validate emotions without diagnosing
- Use "you" language directly to the user
- If a time period is quiet, acknowledge that meaningfully

Return ONLY valid JSON with no markdown:
{"todayText": "...", "lastHourText": "...", "weekText": "..."}`;

    const userPrompt = `Here is the user's recent activity:

TODAY: ${todaySummary}

LAST HOUR: ${lastHourSummary}

THIS WEEK: ${weekSummary}

Generate three reflections as JSON.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const responseText = completion?.choices?.[0]?.message?.content?.trim() || '';
    
    // Parse JSON response
    let parsed;
    try {
      // Remove potential markdown code blocks
      const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
      parsed = JSON.parse(cleanJson);
    } catch (parseErr) {
      console.error('❌ /api/patterns/full-reflection JSON parse error:', parseErr);
      return res.json(defaults);
    }

    console.log('✅ /api/patterns/full-reflection generated:', {
      todayLen: parsed.todayText?.length,
      lastHourLen: parsed.lastHourText?.length,
      weekLen: parsed.weekText?.length,
    });

    return res.json({
      todayText: parsed.todayText || defaults.todayText,
      lastHourText: parsed.lastHourText || defaults.lastHourText,
      weekText: parsed.weekText || defaults.weekText,
    });
  } catch (err) {
    console.error('❌ /api/patterns/full-reflection error:', err);
    return res.json(defaults);
  }
});

// POST /api/patterns/stress-echoes - AI-powered stress pattern detection
app.post('/api/patterns/stress-echoes', async (req, res) => {
  const { userId, deviceId, journalEntries } = req.body;
  
  const fallbackResponse = {
    hasPattern: false,
    clusterLabel: null,
    strength: 0,
    insightText: "When heavier moments return around similar times, TRACE will highlight that here."
  };
  
  console.log('🔮 [STRESS ECHOES] Analyzing', journalEntries?.length || 0, 'entries for userId:', userId || deviceId);
  
  // Check minimum data requirement
  if (!journalEntries || journalEntries.length < 2) {
    return res.json(fallbackResponse);
  }
  
  // Check OpenAI availability
  if (!openai) {
    console.log('🔮 [STRESS ECHOES] No OpenAI configured, returning fallback');
    return res.json(fallbackResponse);
  }
  
  try {
    const systemPrompt = `You are TRACE's pattern recognition system. Analyze journal entries to detect "Stress Echoes" - recurring patterns of emotional heaviness.

Your task:
1. Identify which entries reflect emotionally heavy moments (stress, anxiety, overwhelm, sadness)
2. Look for temporal patterns - do heavy moments cluster on specific days/times?
3. Detect recurring themes or triggers
4. Generate a brief, compassionate insight (1-2 sentences)

Return a JSON object with:
- hasPattern: true if 2+ heavy entries cluster around similar times
- clusterLabel: description like "Tuesday evening" or "Wednesday and Friday afternoon" (null if no pattern)
- strength: 0 (no pattern), 1 (soft pattern: 2-3 entries), 2 (strong pattern: 4+ entries)
- insightText: gentle observation, never judgmental or prescriptive

Example insights:
- "You tend to process difficult work situations on Tuesday evenings."
- "Heavier moments often surface midweek, especially around Wednesday."
- "You notice relationship stress most on weekend mornings."

If no clear pattern exists, set hasPattern to false and provide an encouraging insightText.`;

    const userPrompt = `Analyze these journal entries for stress patterns:\n\n${JSON.stringify(journalEntries, null, 2)}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 300
    });

    const responseText = completion?.choices?.[0]?.message?.content?.trim() || '{}';
    
    let result;
    try {
      result = JSON.parse(responseText);
    } catch (parseErr) {
      console.error('🔮 [STRESS ECHOES] JSON parse error:', parseErr);
      return res.json(fallbackResponse);
    }

    console.log('🔮 [STRESS ECHOES] AI result:', result);

    res.json({
      hasPattern: result.hasPattern || false,
      clusterLabel: result.clusterLabel || null,
      strength: typeof result.strength === 'number' ? result.strength : 0,
      insightText: result.insightText || fallbackResponse.insightText
    });

  } catch (error) {
    console.error('🔮 [STRESS ECHOES] Error:', error.message || error);
    res.json(fallbackResponse);
  }
});

// POST /api/sessions/daily-summary - Count chat sessions based on session START time
app.post('/api/sessions/daily-summary', async (req, res) => {
  try {
    const { userId, deviceId, localDate } = req.body || {};

    console.log('🧠 /api/sessions/daily-summary called with:', {
      userId,
      deviceId,
      localDate,
    });

    // If no Supabase, return zeros
    if (!supabaseServer) {
      console.log('⚠️ /api/sessions/daily-summary: No Supabase configured');
      return res.json({
        ok: true,
        today: 0,
        total: 0,
      });
    }

    // Fetch ALL user messages, ordered by time (we need full history to track session starts)
    let query = supabaseServer
      .from('chat_messages')
      .select('created_at')
      .eq('role', 'user')
      .order('created_at', { ascending: true });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: allMessages, error: messagesError } = await query;

    if (messagesError) {
      console.error('❌ /api/sessions/daily-summary error:', messagesError);
      throw messagesError;
    }

    if (!allMessages || allMessages.length === 0) {
      return res.json({
        ok: true,
        today: 0,
        total: 0,
      });
    }

    // Track sessions by their START date
    const sessionsByDay = new Map(); // Map<YYYY-MM-DD, count>
    let totalSessions = 0;
    let lastMessageTime = null;
    const ONE_HOUR_MS = 60 * 60 * 1000;

    for (const message of allMessages) {
      const messageTime = new Date(message.created_at).getTime();
      const isNewSession = !lastMessageTime || (messageTime - lastMessageTime) > ONE_HOUR_MS;
      
      if (isNewSession) {
        // This message STARTS a new session
        totalSessions++;
        
        // Count this session on the calendar day it STARTED
        const sessionStartDate = new Date(message.created_at).toISOString().slice(0, 10);
        sessionsByDay.set(sessionStartDate, (sessionsByDay.get(sessionStartDate) || 0) + 1);
      }
      
      lastMessageTime = messageTime;
    }

    // Get count for the requested day
    const targetDate = localDate || new Date().toISOString().slice(0, 10);
    const todaySessions = sessionsByDay.get(targetDate) || 0;

    console.log('✅ /api/sessions/daily-summary result:', {
      requestedDate: targetDate,
      today: todaySessions,
      total: totalSessions,
      sessionDays: Object.fromEntries(sessionsByDay),
    });

    return res.json({
      ok: true,
      today: todaySessions,
      total: totalSessions,
    });
  } catch (err) {
    console.error('❌ /api/sessions/daily-summary error:', err);
    return res.json({
      ok: false,
      today: 0,
      total: 0,
      error: err.message,
    });
  }
});

// POST /api/journal-reflection - Generate AI reflection based on journal entries
// mode: journal_reflection
app.post('/api/journal-reflection', async (req, res) => {
  try {
    const {
      userName,
      localDate,
      localDay,
      localTime,
      entries,
    } = req.body || {};

    console.log('🧠 /api/journal-reflection entries:', entries?.length || 0);

    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      return res.json({
        ok: true,
        reflection: "This page is still quiet. Whenever it feels right to write, I'll be here to notice what's unfolding with you.",
      });
    }

    // Build a summary of recent journal entries (max 10, content truncated to 300 chars)
    const recentEntries = entries.slice(0, 10);
    
    // Calculate time span
    const timestamps = recentEntries
      .map(e => new Date(e.createdAt).getTime())
      .filter(t => !isNaN(t));
    const earliest = timestamps.length ? new Date(Math.min(...timestamps)).toLocaleDateString() : null;
    const latest = timestamps.length ? new Date(Math.max(...timestamps)).toLocaleDateString() : null;
    const timeSpan = earliest && latest && earliest !== latest
      ? `Time span: ${earliest} to ${latest}`
      : earliest
        ? `Date: ${earliest}`
        : '';

    // Summarize entries with truncated content
    const entrySummary = recentEntries
      .map((entry, idx) => {
        const mood = entry.mood ? ` [mood: ${entry.mood}]` : '';
        const content = (entry.content || '').slice(0, 300);
        return `${idx + 1}.${mood} "${content}"`;
      })
      .join('\n');

    // Context info
    const contextParts = [];
    if (userName) contextParts.push(`User: ${userName}`);
    if (localDay) contextParts.push(`Day: ${localDay}`);
    if (localTime) contextParts.push(`Time: ${localTime}`);
    if (localDate) contextParts.push(`Date: ${localDate}`);
    const contextLine = contextParts.length ? contextParts.join(', ') : '';

    const systemPrompt = `You are TRACE, offering a 1–2 sentence reflection on the emotional themes in recent journal entries.
mode: journal_reflection

Tone: gentle, validating, non-directive.
- No advice, no questions.
- No clinical labels. Never mention "symptoms" or "treatment".
- Focus on emotional themes, pacing, and what seems to matter to the user.
- Just noticing and validation.`;

    const userPrompt = `${contextLine ? contextLine + '\n' : ''}${timeSpan ? timeSpan + '\n' : ''}
Recent journal entries:
${entrySummary}

In 1–2 sentences, gently reflect what you notice about this person's recent emotional landscape. No questions, no advice, just noticing and validation.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 100,
    });

    const reflection =
      completion?.choices?.[0]?.message?.content?.trim() ||
      "You're showing up for yourself in small, brave ways. That matters.";

    console.log('✅ Journal reflection generated');
    return res.json({
      ok: true,
      reflection,
    });
  } catch (err) {
    console.error('❌ /api/journal-reflection error:', err);
    return res.json({
      ok: true,
      reflection: "You've been carrying a lot. Even noticing your patterns is an act of care.",
    });
  }
});

app.get('/api/debug-chat-messages', async (req, res) => {
  if (!supabaseServer) {
    return res.status(500).json({ error: 'Supabase not configured' });
  }

  try {
    const { data, error } = await supabaseServer
      .from('chat_messages')
      .select('id, user_id, role, content, created_at')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('[TRACE DEBUG CHATS ERROR]', error.message || error);
      return res.status(500).json({ error: error.message || 'Supabase error' });
    }

    console.log('[TRACE DEBUG CHATS]', data);
    res.json({
      ok: true,
      count: data?.length || 0,
      rows: data || [],
    });
  } catch (err) {
    console.error('[TRACE DEBUG CHATS ERROR]', err.message || err);
    res.status(500).json({ error: err.message || 'Unknown error' });
  }
});

// Global error handler for consistent JSON responses (must be last middleware)
app.use((err, req, res, next) => {
  console.error('Server error:', err.message || err);
  res.status(err.status || 500).json({
    ok: false,
    error: err.message || 'Internal server error',
  });
});
