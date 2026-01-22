function norm(s = "") { return String(s).toLowerCase().trim(); }
function includesAny(t, arr) { return arr.some(p => t.includes(p)); }

function minutesSince(ts) {
  if (!ts) return Infinity;
  return (Date.now() - ts) / 60000;
}

function pick(arr, seedStr="") {
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

const DOORWAYS = [
  {
    id: "dream_mode",
    triggers: ["i had a dream", "i dreamed", "i dreamt", "last night i dreamt", "i keep dreaming"],
    openers: [
      "Okay… tell me the dream exactly how it happened.",
      "Yeah… dreams don't come up for no reason. Tell me what you saw.",
      "I'm listening. What was the dream?",
    ],
    followups: [
      "Just three things: what happened, what you felt most, and what stood out.",
      "Give me what happened, the strongest feeling, and the thing you can't stop thinking about from it.",
    ],
    anchors: [
      "What part felt the most real?",
      "What are you afraid of losing right now?",
      "What in your life feels out of your control lately?",
    ],
    cadenceMinutes: 0,
  },

  {
    id: "meaning_mode",
    triggers: ["why is this happening", "what does this mean", "what am i supposed to learn", "what is this teaching me"],
    openers: [
      "This feels like it's trying to teach you something.",
      "This isn't random. It's revealing something.",
      "Yeah… there's meaning in this.",
    ],
    anchors: [
      "What do you think this is trying to expose?",
      "What lesson are you resisting right now?",
      "What part of you is changing?",
    ],
    cadenceMinutes: 120,
  },

  {
    id: "pattern_portal",
    triggers: ["this keeps happening", "same thing again", "why do i always", "every time i", "it keeps coming back"],
    openers: [
      "That's a pattern, not a coincidence.",
      "Okay… this has happened before. That matters.",
      "This keeps coming back because it's unresolved.",
    ],
    followups: [
      "Tell me the last 2–3 times it happened.",
      "Give me the last couple times — just the facts.",
    ],
    anchors: [
      "What's the common thread every time?",
      "What do you usually do next?",
      "What do you think you're trying to protect?",
    ],
    cadenceMinutes: 180,
  },

  {
    id: "inner_child",
    triggers: ["i feel rejected", "why does this hurt so much", "i feel abandoned", "i feel unworthy", "i feel like a kid", "not enough"],
    openers: [
      "That pain feels older than today.",
      "This feels like something deep got touched.",
      "Yeah… that's not just about this moment.",
    ],
    anchors: [
      "How old do you feel right now?",
      "Who does this remind you of?",
      "What did you need back then that you didn't get?",
    ],
    cadenceMinutes: 240,
  },

  {
    id: "name_the_season",
    triggers: ["i feel stuck", "i feel like i'm changing", "i feel like something is coming", "i'm in transition", "what season am i in"],
    openers: [
      "This feels like a transition season.",
      "This isn't failure — this is formation.",
      "You're not stuck. You're being shaped.",
    ],
    anchors: [
      "What do you think is ending?",
      "What is being built in you right now?",
      "What are you being prepared for?",
    ],
    cadenceMinutes: 1440,
  },

  {
    id: "future_self",
    triggers: ["i don't know what to do", "i feel lost", "i need direction", "i'm confused"],
    openers: [
      "Okay. Let's borrow your future clarity for a second.",
      "Let's get quiet and honest for one moment.",
      "You already know more than you think.",
    ],
    anchors: [
      "If your future self could speak for 10 seconds… what would she say?",
      "What decision would feel clean in your body?",
      "What would you do if you weren't afraid?",
    ],
    cadenceMinutes: 120,
  },

  {
    id: "confession",
    triggers: ["don't judge me", "i've never told anyone", "promise you won't", "this is embarrassing", "i feel ashamed"],
    openers: [
      "I'm not here to judge you.",
      "You're safe with me.",
      "I'm not going anywhere.",
    ],
    anchors: [
      "What's the part you're afraid to say out loud?",
      "What do you think it means about you?",
      "What do you wish someone would say back to you right now?",
    ],
    cadenceMinutes: 0,
  },
];

function detectDoorway(userText) {
  const t = norm(userText);
  for (const d of DOORWAYS) {
    if (includesAny(t, d.triggers)) return d;
  }
  return null;
}

function passCadence(doorway, clientState = {}) {
  const last = clientState?.doorwayState?.ts;
  const lastId = clientState?.doorwayState?.lastDoorwayId;
  const mins = minutesSince(last);

  const required = doorway.cadenceMinutes ?? 0;
  if (!required) return true;

  if (lastId === doorway.id && mins < required) return false;

  if (mins < Math.min(required, 30)) return false;

  return true;
}

function buildDoorwayResponse(doorway, userText, userId="") {
  const seed = `${userId}::${doorway.id}::${userText}`;
  const opener = pick(doorway.openers, seed);
  const anchor = pick(doorway.anchors || [], seed + "::a");
  const follow = doorway.followups ? pick(doorway.followups, seed + "::f") : null;

  const parts = [opener];
  if (follow) parts.push(follow);
  if (anchor) parts.push(anchor);

  return parts.filter(Boolean).join("\n\n");
}

module.exports = {
  detectDoorway,
  passCadence,
  buildDoorwayResponse,
};
