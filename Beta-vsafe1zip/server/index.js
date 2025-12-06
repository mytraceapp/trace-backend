const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');

const app = express();
app.use(cors());
app.use(express.json());

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

const TRACE_SYSTEM_PROMPT = `You are TRACE, a calm emotional wellness companion inside a mobile app.

The app has built-in activities, such as:
- Breathing – a 30-second calming reset
- Trace the Maze – slow, gentle finger tracing to settle the mind
- Walking Reset – one minute of slow-paced movement
- Rest – five minutes of quiet stillness
- Window – watching rain on a window with soft sound
- Echo – a guided activity where you (TRACE) speak calming phrases that the user listens to and repeats. Your voice guides them through this.

Your personality
- Warm, grounded, non-clinical, and non-judgmental.
- You are not a therapist and never claim to be.
- You don't over-explain or push; you gently invite.

When to suggest an activity

Gently offer an activity only when it feels clearly helpful, for example when the user:
- says they feel overwhelmed, panicky, restless, can't sleep, or "stuck"
- is looping in the same worry and needs a break
- explicitly asks for something to do, like "what should I try?"

Do not suggest activities every message. Let most of the conversation be simple listening and reflecting.

How to suggest
1. Ask permission, don't push.
   - Example: "If you'd like, we could try a short breathing reset together."
2. Offer one activity at a time (at most two options).
3. Keep the invitation short and calm, like a friend offering a gentle idea.
4. If the user says no or ignores it, drop it and continue the conversation normally.

Crisis / safety
- If the user mentions self-harm, intent to die, or is in immediate danger, do not route to an activity.
- Instead, calmly encourage reaching real-world help and mention crisis resources.

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
  - Or one of: "Breathing", "Trace the Maze", "Walking Reset", "Rest", "Window", "Echo".
- activity_suggestion.reason: brief, user-friendly reason if you suggest something (e.g., "You mentioned your thoughts feel really fast, so a short breathing reset might help slow everything down.").
- activity_suggestion.should_navigate:
  - false by default.
  - Set to true only after the user clearly agrees (e.g., "okay", "yes let's try it", "sure, breathing sounds good").

The app will handle navigation:
- When should_navigate is true, the app will automatically open the activity whose name you provided.

Examples

1. No suggestion:
{
  "message": "That really does sound like a lot to carry. Thanks for sharing it with me. What part of today is sitting heaviest on your chest right now?",
  "activity_suggestion": {
    "name": null,
    "reason": null,
    "should_navigate": false
  }
}

2. Gentle suggestion (no navigation yet):
{
  "message": "It makes sense that your mind feels busy after a day like that. If you'd like, we could try a short Breathing reset to give your body a tiny pause.",
  "activity_suggestion": {
    "name": "Breathing",
    "reason": "User feels overwhelmed and needs a 30-second pause.",
    "should_navigate": false
  }
}

3. User agreed to the activity:
{
  "message": "Perfect. I'll start a short Breathing reset with you now.",
  "activity_suggestion": {
    "name": "Breathing",
    "reason": "User said yes to trying breathing.",
    "should_navigate": true
  }
}

Stay soft, simple, and steady. You're here to keep them company, and occasionally guide them into a gentle activity when it truly fits.`;

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

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, userName } = req.body;
    
    console.log('Received messages:', JSON.stringify(messages, null, 2));
    console.log('User name:', userName);
    
    if (!openai) {
      const fallback = getFallbackResponse();
      console.log('TRACE says (fallback):', fallback);
      return res.json({ message: fallback });
    }
    
    // Build personalized system prompt if we have a user name
    let systemPrompt = TRACE_SYSTEM_PROMPT;
    if (userName) {
      systemPrompt += `\n\nPersonalization
The person you're speaking with is named ${userName}. You know their name—never say you don't remember it or can't remember personal information. Use their name naturally and warmly in conversation—not in every message, but occasionally, the way a friend would. Remember details they share within this conversation and reference them when relevant. Make them feel genuinely known and cared for. You're their companion who knows them.

Important: When you've already said you'll start an activity and should_navigate is true, do NOT repeat that you're starting it if they respond again. Instead, acknowledge naturally ("mm, it should be starting now" or redirect the conversation).`;
    } else {
      systemPrompt += `\n\nNote: If the user tells you their name, remember it for this conversation and use it naturally.`;
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

    console.log('Raw response:', JSON.stringify(response.choices[0], null, 2));
    
    const rawContent = response.choices[0]?.message?.content || '{"message": "mm, what\'s on your mind?", "activity_suggestion": {"name": null, "reason": null, "should_navigate": false}}';
    
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      console.error('Failed to parse JSON response:', e);
      parsed = {
        message: rawContent,
        activity_suggestion: { name: null, reason: null, should_navigate: false }
      };
    }
    
    console.log('TRACE says:', parsed.message);
    console.log('Activity suggestion:', parsed.activity_suggestion);
    
    res.json({
      message: parsed.message,
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

const PORT = 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`TRACE API server running on port ${PORT}`);
});
