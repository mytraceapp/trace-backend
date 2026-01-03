/**
 * TRACE Weekly Letter
 * 
 * Generates a gentle, reflective summary of the user's emotional week.
 * No goals, no streaks—just a caring friend reflecting back what they saw.
 */

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1) - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

async function loadEmotionalSignals(supabase, userId, weekStartISO) {
  if (!supabase || !userId) {
    return { sessions: [], checkIns: [], chatMessages: [] };
  }

  const start = new Date(weekStartISO);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);

  const startISO = start.toISOString();
  const endISO = end.toISOString();

  try {
    const [sessions, checkIns, chatMessages] = await Promise.all([
      supabase
        .from('sessions')
        .select('created_at, activity_type, duration_seconds, notes')
        .eq('user_id', userId)
        .gte('created_at', startISO)
        .lt('created_at', endISO)
        .order('created_at', { ascending: true }),
      supabase
        .from('check_ins')
        .select('created_at, mood, energy, stress, notes')
        .eq('user_id', userId)
        .gte('created_at', startISO)
        .lt('created_at', endISO)
        .order('created_at', { ascending: true }),
      supabase
        .from('chat_messages')
        .select('created_at, role, content')
        .eq('user_id', userId)
        .eq('role', 'user')
        .gte('created_at', startISO)
        .lt('created_at', endISO)
        .order('created_at', { ascending: true })
        .limit(20),
    ]);

    return {
      sessions: sessions.data || [],
      checkIns: checkIns.data || [],
      chatMessages: chatMessages.data || [],
    };
  } catch (err) {
    console.error('[loadEmotionalSignals error]', err.message);
    return { sessions: [], checkIns: [], chatMessages: [] };
  }
}

async function generateWeeklyLetter(openai, supabase, userId, date = new Date()) {
  if (!openai || !supabase || !userId) {
    throw new Error('Missing required dependencies');
  }

  const weekStart = getWeekStart(date);
  const signals = await loadEmotionalSignals(supabase, userId, weekStart);

  const hasData = signals.sessions.length > 0 || 
                  signals.checkIns.length > 0 || 
                  signals.chatMessages.length > 0;

  if (!hasData) {
    return {
      content: "This week was quiet in TRACE. That's okay—sometimes silence is its own kind of care. Whenever you're ready, I'm here.",
      week_start: weekStart,
      user_id: userId,
    };
  }

  const prompt = `
You are TRACE, a calm, gentle emotional companion.

Write a short "weekly letter" to the user reflecting on their emotional week.

You are given structured data about their week: activities, check-ins, chat messages.
You don't need to mention every detail. Look for gentle themes.

Goals:
- Notice what felt heavy and what felt lighter.
- Affirm the effort it took just to get through.
- Offer one or two soft observations or invitations, NOT a to-do list.
- No pressure, no goals, no streak language.
- This should feel like: "Here's what I noticed. You made it. I'm glad you're here."

Format:
- 3–5 short paragraphs.
- No emojis.
- No "Dear [Name]" or formal salutations.
- No advice-y tone. More like a caring friend reflecting back what they saw.
- End with something gentle and affirming.

Here is the data for this week (${weekStart}):
${JSON.stringify(signals, null, 2)}
  `.trim();

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    temperature: 0.7,
    max_tokens: 500,
  });

  const content = completion.choices?.[0]?.message?.content?.trim() || 
    "This week held its own quiet weight. Whatever you carried, you made it here. That matters.";

  const { data, error } = await supabase
    .from('weekly_reflections')
    .upsert(
      {
        user_id: userId,
        week_start: weekStart,
        content,
      },
      { onConflict: 'user_id,week_start' }
    )
    .select()
    .single();

  if (error) {
    console.error('[weekly_reflections upsert error]', error.message);
    return { content, week_start: weekStart, user_id: userId };
  }

  return data;
}

async function getExistingWeeklyLetter(supabase, userId, date = new Date()) {
  if (!supabase || !userId) return null;

  const weekStart = getWeekStart(date);

  const { data, error } = await supabase
    .from('weekly_reflections')
    .select('*')
    .eq('user_id', userId)
    .eq('week_start', weekStart)
    .single();

  if (error || !data) return null;
  return data;
}

module.exports = {
  generateWeeklyLetter,
  getExistingWeeklyLetter,
  getWeekStart,
};
