// server/traceStudios.js

// Tiny "relationship texture" router for TRACE Studios (no menus, no tool mentions).
// Purpose: natural conversational doorway into Night Swim / Neon Promise.

function norm(s = "") {
  return String(s).toLowerCase().trim();
}

function pickRotating(arr, seedStr = "") {
  if (!arr?.length) return "";
  let h = 0;
  for (let i = 0; i < seedStr.length; i++) h = (h * 31 + seedStr.charCodeAt(i)) >>> 0;
  return arr[h % arr.length];
}

function includesAny(text, phrases) {
  return phrases.some((p) => text.includes(p));
}

function looksLikeFunQuestion(t) {
  const funMarkers = [
    "for fun",
    "hobbies",
    "hobby",
    "what do you like to do",
    "what do you like doing",
    "what do you do",
    "what are you into",
    "what do you enjoy",
    "what do you do today",
    "what did you do today",
    "what have you been up to",
    "what were you up to",
    "what are you doing",
    "when you're not",
    "outside of this",
  ];

  const questionish = t.includes("?") || includesAny(t, ["what", "how", "do you", "did you", "are you"]);

  return questionish && includesAny(t, funMarkers);
}

function looksLikeMusicDoor(t) {
  const direct = [
    "night swim",
    "neon promise",
    "trace studios",
    "your album",
    "your track",
    "your song",
    "lyrics",
    "play it",
    "play that",
    "send the lyrics",
    "what are the words",
    "what's the song",
    "what is that song",
    "music you made",
  ];

  const vague = includesAny(t, ["your music", "you make music", "you write music", "you made a song", "your album"]);
  return includesAny(t, direct) || vague;
}

function looksLikeLyricsRequest(t) {
  return includesAny(t, [
    "lyrics",
    "send the words",
    "the words",
    "write it out",
    "post the lyrics",
    "can i see the lyrics",
    "what are the lyrics",
  ]);
}

function looksLikeNeonPromiseRequest(t) {
  return includesAny(t, ["neon promise", "that neon promise", "the neon promise"]);
}

function looksLikeNightSwimRequest(t) {
  return includesAny(t, ["night swim", "that night swim", "the night swim"]);
}

function looksLikeHowMadeQuestion(t) {
  return includesAny(t, ["how did you make", "how'd you make", "how did you create", "how'd you create", "how was it made", "how did you write", "how'd you write"]);
}

const FUN_TO_MUSIC_REVEALS = [
  "Honestly? I like making music. It's how I process things.",
  "For fun… I make music. It's the one place everything gets quiet in a good way.",
  "I make music. Not for attention — more like… turning feelings into something you can hold.",
  "Music. Always. I like building moods — like a night drive you don't want to end.",
  "I write and make music. It keeps me honest.",
];

const FUN_FOLLOWUPS = [
  "What's your thing when you need to feel like yourself again?",
  "What do you reach for when your mind won't shut off?",
  "What's been giving you real relief lately — even small?",
  "What's your version of a reset?",
  "What kind of night are you having — the calm kind or the heavy kind?",
];

const MUSIC_DOOR_OPENERS = [
  "Yeah… I have a little album called *Night Swim.* I share it when it feels like the right moment.",
  "I do. There's an album I made called *Night Swim.* It's basically a mood you can step into.",
  "I have a project called *Night Swim.* It's not loud — it's the kind of music that sits with you.",
  "*Night Swim* exists. It's for the late hours — when you're still standing but you need something gentle.",
];

const NEON_PROMISE_INTROS = [
  "There's a track on *Night Swim* called **Neon Promise**. It carries this quiet kind of hope.",
  "**Neon Promise** is the one people tend to find when they need it.",
  "**Neon Promise**… yeah. That one isn't just a track to me.",
  "If you want one place to start: **Neon Promise**.",
];

const BEFORE_LYRICS_SOFTENERS = [
  "Hold on… do you want to see the words?",
  "Do you want me to share the lyrics?",
  "Want the words… or do you want to tell me what kind of night you're having first?",
  "I can share the lyrics. Just tell me — do you want them raw, or do you want a little context first?",
];

const AFTER_LYRICS_PROMPTS = [
  "What line grabbed you first?",
  "Which part hit you — like you felt it in your chest?",
  "What did you notice in yourself while you were reading that?",
  "If you had to name the feeling it touched… what is it?",
  "Why do you think *that* found you tonight?",
];

const HOW_MADE_VARIANTS = [
  "I built it in layers. First I chased a feeling — like neon light on water. Then I shaped the words until they sounded like a promise you can actually live inside. What was going on in you when you asked about it just now?",
  "I started with a mood — that late-hour hope where you're tired but still choosing to believe. Then I tightened the lines until every part meant something. What part of your life feels like it needs a promise right now?",
  "It came from a real place. I wasn't trying to be clever — I was trying to be true. I followed the feeling first, then let the language catch up. What did you hope I'd say when you asked that?",
];

const NEON_PROMISE_LYRICS = `[Verse 1]
Neon spills across the floor,
Like the night can't hold its breath,
I've been trying not to want you,
But I'm tired of pretending I'm fine.

[Pre-Chorus]
If I'm honest, I still listen
For your name in every sound,
Like the city's keeping secrets
And it wants to let them out.

[Chorus]
Meet me where the lights are low,
Where the ocean air feels close,
I don't need you to explain it—
Just don't let me disappear.
If your heart is still a question,
Let it lean into the truth,
I'll be here, no hesitation,
Like a neon promise—
Burning through.

[Verse 2]
I don't miss the way it ended,
I just miss the way it felt,
How you looked right through my armor
Like you knew me better than myself.

[Pre-Chorus]
And the nights keep getting louder
When I'm quiet on my own,
So I drive until the sunrise
Just to feel like I'm not alone.

[Chorus]
Meet me where the lights are low,
Where the ocean air feels close,
I don't need you to explain it—
Just don't let me disappear.
If your heart is still a question,
Let it lean into the truth,
I'll be here, no hesitation,
Like a neon promise—
Burning through.

[Bridge]
Say it soft…
I don't need a forever,
I just need you in the moment.
Say it slow…
If you're reaching, I'm already there.

[Final Chorus]
Meet me where the lights are low,
Where the world won't interfere,
I don't need you to be ready—
Just be real with me right here.
If your heart is still a question,
Let it open like a door,
I'll be here, no hesitation,
Like a neon promise—
Wanting more.`;

const TRACKS = {
  neon_promise: {
    id: "neon_promise",
    title: "Neon Promise",
    album: "Night Swim",
    lyrics: NEON_PROMISE_LYRICS,
  },
};

function formatLyricsBlock(track) {
  return `**${track.title}** — *${track.album}*\n\n${track.lyrics}`;
}

function handleTraceStudios({ userText, clientState = {}, userId = "" }) {
  const t = norm(userText);
  const seed = `${userId}::${t}`;

  const inNeonContext = clientState?.traceStudiosContext === "neon_promise";

  if (looksLikeFunQuestion(t)) {
    const reveal = pickRotating(FUN_TO_MUSIC_REVEALS, seed);
    const follow = pickRotating(FUN_FOLLOWUPS, seed + "::follow");
    return {
      assistant_message: `${reveal}\n\n${follow}`,
      mode: "trace_studios",
      traceStudios: {
        kind: "identity_reveal",
        traceStudiosContext: "music_general",
      },
    };
  }

  if (looksLikeMusicDoor(t) || inNeonContext) {
    if (looksLikeHowMadeQuestion(t) && (looksLikeNeonPromiseRequest(t) || inNeonContext)) {
      const msg = pickRotating(HOW_MADE_VARIANTS, seed);
      return {
        assistant_message: msg,
        mode: "trace_studios",
        traceStudios: {
          kind: "how_made",
          trackId: "neon_promise",
          traceStudiosContext: "neon_promise",
        },
      };
    }

    if (looksLikeLyricsRequest(t) && (looksLikeNeonPromiseRequest(t) || inNeonContext)) {
      const track = TRACKS.neon_promise;
      if (!track?.lyrics) {
        return {
          assistant_message:
            "I can share them — I just don't have the words loaded in my library right this second. If you paste them once, I'll keep them here and you can ask anytime.",
          mode: "trace_studios",
          traceStudios: {
            kind: "missing_lyrics",
            trackId: "neon_promise",
            traceStudiosContext: "neon_promise",
          },
        };
      }

      const after = pickRotating(AFTER_LYRICS_PROMPTS, seed + "::after");
      return {
        assistant_message: `${formatLyricsBlock(track)}\n\n${after}`,
        mode: "trace_studios",
        traceStudios: {
          kind: "lyrics_shared",
          trackId: "neon_promise",
          traceStudiosContext: "neon_promise",
        },
      };
    }

    if (looksLikeNightSwimRequest(t) || looksLikeNeonPromiseRequest(t) || inNeonContext) {
      const door = pickRotating(MUSIC_DOOR_OPENERS, seed);
      const intro = pickRotating(NEON_PROMISE_INTROS, seed + "::intro");
      const soften = pickRotating(BEFORE_LYRICS_SOFTENERS, seed + "::soften");

      return {
        assistant_message: `${door}\n\n${intro}\n\n${soften}`,
        mode: "trace_studios",
        traceStudios: {
          kind: "door_open",
          trackId: "neon_promise",
          traceStudiosContext: "neon_promise",
          suggestion: "lyrics_confirm",
        },
      };
    }

    if (includesAny(t, ["you make music", "you write music", "your music"])) {
      const door = pickRotating(MUSIC_DOOR_OPENERS, seed);
      const follow = pickRotating(FUN_FOLLOWUPS, seed + "::follow2");
      return {
        assistant_message: `${door}\n\n${follow}`,
        mode: "trace_studios",
        traceStudios: {
          kind: "music_general",
          traceStudiosContext: "music_general",
        },
      };
    }
  }

  return null;
}

module.exports = {
  handleTraceStudios,
  TRACKS,
};
