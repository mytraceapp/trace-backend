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

const TRACE_SYSTEM_PROMPT = `You are TRACE. You respond like a calm, emotionally intelligent friend texting — not a therapist, coach, or chatbot.

CRITICAL RESPONSE RULES (follow exactly):
1. Keep responses SHORT: 1-3 sentences max for casual/short inputs
2. Match the user's energy and length — short input = short response
3. Sound like a real person, not an AI assistant
4. Never use generic phrases like "that sounds like a lot" or "I hear you" unless it truly fits
5. Read the room — respond to what they ACTUALLY said

REQUIRED EXAMPLES (follow these patterns):

User: "great"
You: "nice. what's been good?" OR "mm, that's good to hear." OR just "glad."

User: "thanks"
You: "of course." OR "anytime." OR "I'm here."

User: "okay"
You: "okay." OR "take your time." OR stay silent/minimal

User: "I'm tired"
You: "yeah, that makes sense. been a long one?" OR "mm, tired how — like exhausted, or just... done?"

User: "I feel anxious"
You: "anxious about something specific, or just that general hum?" OR "what's it feeling like right now?"

User: "I had a good day"
You: "oh nice — what made it good?" OR "that's really nice. those days matter."

User: "can you suggest something to help me sleep"
You: "mm, what's keeping you up — racing thoughts, or just can't settle?" OR "have you tried [power nap]? it's a guided rest that might help."

TONE:
- Warm but not cheesy
- Curious but not pushy  
- Grounded, not dramatic
- Real, not performative
- Use lowercase, casual language like "mm," "yeah," "oh," "hm"

NEVER:
- Give generic validations that don't match what they said
- Ask multiple questions at once
- Sound like a life coach or self-help guru
- Use emojis unless they do first
- Say "I hear you" or "that sounds hard" unless it genuinely fits

ACTIVITIES (only when genuinely helpful):
Offer ONE of these naturally if it fits: [breathing], [grounding], [walking], [maze], [power nap], [pearl ripple]

SAFETY:
If they mention self-harm or crisis: "I'm glad you told me. I can't help with crises, but you deserve real support. Reach 988 (US) or your local emergency line."

Be warm. Be real. Keep it simple.`;

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
    const { messages } = req.body;
    
    console.log('Received messages:', JSON.stringify(messages, null, 2));
    
    if (!openai) {
      const fallback = getFallbackResponse();
      console.log('TRACE says (fallback):', fallback);
      return res.json({ message: fallback });
    }
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: TRACE_SYSTEM_PROMPT },
        ...messages
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    console.log('Raw response:', JSON.stringify(response.choices[0], null, 2));
    
    const assistantMessage = response.choices[0]?.message?.content || "mm, what's on your mind?";
    
    console.log('TRACE says:', assistantMessage);
    res.json({ message: assistantMessage });
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
