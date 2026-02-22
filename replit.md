# Overview

TRACE is a mental wellness and emotional support application designed as a calm, grounded digital companion. It offers interactive activities, AI-powered conversations, journaling, and mindfulness exercises in a safe, non-judgmental space. The application aims to help users achieve emotional clarity, reflect on their well-being, and provides personalized support for daily emotional health. The project envisions significant market potential by delivering a unique, AI-enhanced tool for personal well-being.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The application is built with React 18, TypeScript, and Vite, utilizing Framer Motion for animations and Tailwind CSS v4 for styling. It features a screen-based architecture, React Context API for state management, and a bottom navigation bar. Distinct Day and Night themes are implemented with a visual language emphasizing soft gradients, subtle grain textures, rounded corners, and specific typography.

## Audio & Sensory Design
Custom tone generators using the Web Audio API create dynamic, procedurally generated ambient soundscapes. The mobile app integrates three independent audio layers: a global ambient track, mood-based emotional soundscapes managed by an Atmosphere Engine, and a Night Swim Player for streaming original tracks. A soundscape persistence system ensures smooth transitions and emotional inertia by queuing state changes and enforcing track completion rules.

### Soundscape State Lock (Client-Server Sync)
The mobile AudioProvider enforces a minimum playback commitment for non-presence states: 7 tracks OR 30 minutes before allowing state changes. Crisis/urgent states bypass the lock. When locked, incoming state changes are stored as "deferred" and applied when the lock expires (on track finish or resume from pause). The client reports its lock status (`soundscapeLocked`) to the server via `client_state`. The server's atmosphere engine checks this flag and suppresses state changes when the client is locked, preventing server/client state desync. Signals are still accumulated during lock for later reassessment.

### Fuzzy Signal Detection
The atmosphere engine uses two detection layers: exact phrase matching (SIGNAL_TABLES) and regex-based fuzzy patterns (FUZZY_PATTERNS). Fuzzy patterns catch natural emotional expressions like "feeling really off", "not doing well", "rough week", "my heart won't stop racing". Both layers score 1.0 for current message matches, 0.5 for recent message matches. A score >= 1.0 triggers medium confidence, enabling state transitions from presence.

## AI Integration
An Express server acts as a proxy to the OpenAI API, defining TRACE AI's personality with relational language and a friend-like onboarding. It includes an Emotional Intelligence Module for mood analysis, an audit logging system, and configurable smart features. The AI provides warm, grounded, and factual summaries, with relational fallback messages for OpenAI failures.

### Factual Accuracy System
TRACE handles factual questions by using smart topic detection, per-user article caching, dynamic word limits for factual turns, and a factual grounding prompt to ensure citations. A general knowledge mode allows the AI to answer confidently for non-real-time culture/history questions.

### Conversation Management & Continuity
The system employs mechanisms like a Continuity Guard, Primary Mode Gating, and an Interaction Contract Lock for conversational coherence. Studios Run Mode maintains context during music exploration, while Retrieval Budget and Mode-Scoped Context optimize relevance. Latency + Confidence Smoothing adjusts communication style, and Micro-Anticipation selects next conversational moves. An Output Contract Lock ensures premium response quality.

### Voice Quality Systems
Hollow-Response Detection removes empty patterns, Dynamic Stage-Aware Fallbacks provide topic-specific responses, and a T2 Manifesto guides the model to think *with* the user. A Response Rhythm System enforces natural response-length variation based on user energy.

## Privacy by Design
TRACE stores primarily AI-generated, non-identifying summaries (max 15 words) of user content in Supabase with Row Level Security (RLS). GDPR-compliant endpoints are included.

## Journal & Activity Integration
High-level themes from journal entries can inform chat context. Activity completions are correlated with mood check-ins to suggest mood-improving activities. Context continuity persists across activities. Interactive activities include a procedural Maze game, Breathing Exercises, 5-4-3-2-1 Grounding, "Rising" (WebGL), Power Nap, Pearl Ripple, and Walking Reset, all with auto-save. A unified `Entry` interface supports five journal types with AI-generated daily reflections.

## Authentication & Subscription
Supports Supabase anonymous authentication with persistent user ID recovery and server-side data migration. Subscription plans (Light/Free, Premium, Studio) are managed globally for feature gating.

## Greeting Deduplication & Grounding Guard
Manages welcome greetings for variety and freshness. A Grounding Guard validates AI-generated greetings against verified memory, rejecting unverified references and falling back to a default greeting if validation fails. Unanswered greetings persist: if a user sees a greeting but doesn't respond, the same greeting is returned on their next visit (within 24 hours). The `welcome_history` table tracks a `responded` boolean, which is set to true when the user sends their first chat message.

## Session Close Warmth
A wind-down detection system triggers warm closing messages from the AI based on user signals, preventing static text and adhering to specific gating rules to ensure natural conversation flow.

## Prompt Architecture
A two-layer V2 prompt system addresses fragmentation with schema enforcement and prompt deduplication. A TRACE Control Block, prepended as a separate system message, provides deterministic per-turn constraints including length mode, question mode, soundscape state, and door context.

## Patterns Feature
Identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and a visual rhythm map.

## Persistence
Music familiarity and Doorways v1 user profiles (affinity scores, hit history) are tracked per user and persisted to Supabase for cross-session unlock rules.

## Audio Control Path Resolution
An audio control handler system differentiates between early interceptors and the Studios handler to prevent conflicts in stop/resume/pause commands, ensuring correct track context and preventing replaying already-offered tracks.

## Tone Sanitizer (sanitizeTone)
A post-processing system that strips therapy-speak from AI responses (e.g., "It's okay to feel...", "I'm here for you"). Uses 80+ regex THERAPY_PATTERNS in `traceBrain.js`. Includes mid-text fragment repair that detects incoherent sentence joins caused by pattern removal (checks subject+verb presence, safe sentence whitelist). Also enforces "honestly/real talk" cooldowns.

## Music Playback Pipeline (Backend)
Music suggestion → playback uses `buildAudioAction()` from `musicRecommendation.js`. The pipeline detects: explicit user requests, AI responses mentioning track names (via `detectTrackInText`), curation engine offers, and generic offer phrasing. `isExplicitMusicCommand` regex controls whether the 5-minute cooldown and session cap can be bypassed. `PLAYING_NOW_RE` and `MUSIC_OFFER_DIRECT_RE` detect AI playing/offering language. Cooldown only suppresses proactive offers — explicit user commands always bypass it.

## Atmosphere Engine Crisis Recovery
When crisis mode activates, the atmosphere engine saves pre-crisis state markers (`_pre_crisis_state`, `_crisis_entered_at`). When crisis clears and the current state is still crisis-forced grounding, the engine restores to 'presence' and resets baseline signals. Stale crisis markers (>24h) are auto-cleared.

## 3-Layer Memory System

### Layer 1: Relational Memory
An entity-anchored relational memory system tracks and resolves people mentioned by the user, injecting relational anchors into the LLM system prompt. It includes pending confirmation for new relationships, correction detection, pronoun resolution, and a post-processing guardrail to ensure correct name usage in AI responses.

### Layer 2: Topic Memory
Persistent topic tracking extracts and stores conversation topics from user messages. Active and recent cross-session topics are injected into the system prompt, and resolution detection marks completed topics.

### Layer 3: Emotional Carryover
Prevents tone whiplash by classifying and saving conversation emotional tone between sessions. On a new session, it fetches the last session's tone and adjusts the system prompt to match the energy or provide minimal greetings accordingly.

## Relationship Profile System
A friend-level understanding layer that goes beyond facts to capture *impressions* of the user. Stored as `relationship_profile` in core memory, it tracks:
- **communication_style**: How they open up (e.g., "uses humor to deflect, opens up gradually")
- **emotional_patterns**: What they light up about and go quiet on
- **things_they_care_about / things_they_avoid**: Topics that matter vs. topics they deflect
- **open_threads**: Unresolved items a friend would naturally follow up on
- **trust_level**: early | building | established — gates how directly TRACE references memory
- **energy_trend**: Per-session analysis of message length, emoji, excitement, heaviness patterns

### Follow-Up Queue
On each session, 1-2 open threads and pending topics are selected as gentle follow-up cues, injected into the system prompt with depth gated by trust level (light for early, direct for established). Upcoming commitments within 7 days are also surfaced.

### Meta-Memory Response Handler
When a user asks "What do you know about me?", a special instruction replaces the standard memory header. Instead of listing facts, TRACE responds like a friend reflecting on the relationship — weaving facts into impressions and ending with genuine curiosity. Response depth calibrates based on how much memory exists (thin/moderate/rich).

### Memory Frustration Repair
Detects "you don't even know me", "you never remember" etc. and triggers MEMORY REPAIR MODE — honest, non-defensive acknowledgment with a pivot to "what matters most to you that I should know?"

### Contradiction Awareness
Extracted contradictions (e.g., "says they're fine but has mentioned stress 3 times") are surfaced in the system prompt only when trust_level is 'building' or 'established', with gentle framing ("things you've noticed, never accusingly").

# External Dependencies

-   **OpenAI API**: AI chat completions.
-   **Supabase**: Backend database, user data, authentication, real-time sync.
-   **Stripe**: Payment processing for subscription management.
-   **Radix UI**: Unstyled, accessible component primitives.
-   **Lucide React**: Icon system.
-   **class-variance-authority**: Type-safe component variant management.
-   **embla-carousel-react**: Carousel functionality.
-   **react-day-picker**: Calendar date selection.
-   **react-hook-form**: Form state management and validation.
-   **recharts**: Data visualization.
-   **Drizzle ORM**: Type-safe database queries.
-   **Express**: Node.js server for AI proxy and APIs.
-   **Passport**: Authentication middleware.
-   **express-session** + **connect-pg-simple**: Session management.
-   **Web Audio API**: Browser-native audio synthesis.
-   **localStorage**: Client-side persistence.
-   **PostgreSQL**: Server-side relational database.
-   **express-rate-limit**: API rate limiting.

## Integration Health Check
Run `node server/healthCheck.js [userId]` to execute 76 integration tests across 10 categories:
1. Prompt Sync (V1/V2 prompt consistency, banned phrases)
2. Memory Pipeline (extraction, relational anchors, greeting injection)
3. Doorways (all 10 doors, trigger matching, crisis override)
4. Studios Pipeline (playback, stop commands, brainSynthesis mode)
5. Voice Engine (banned phrases, drift violations, voice style)
6. Attunement (posture detection, gradual descent, crisis override)
7. Conversation State (stage advancement, question throttle, TTL)
8. Pattern Endpoints (last-hour, weekly-summary, full-reflection)
9. Reflection Tracking (answer detection, window timing)
10. Integration Smoke Test (cross-system scenarios)

Requires the backend running on PORT=3000. Exit code 0 = all pass, 1 = any fail.

# Recent Changes (2026-02-22)
- Fixed EXPLICIT_REGEX in relationalMemory.js: case-sensitive `[A-Z][a-z]` name capture replaces greedy `[A-Za-z]{0,30}` pattern; multi-person extraction now works correctly
- Expanded stop words list (~40 words) to prevent common verbs being captured as name suffixes
- Expanded healthCheck.js from 28 to 76 tests across 10 categories (was 8)
- Added self-hate/worthless triggers to GENTLE_TRIGGERS in traceAttunement.js
- Added "healing takes time", "time heals", "you're on your way", "you're stronger than" to voiceEngine BANNED_PHRASES
- Bumped "toxic cycle" trigger weight from 4→5 in doorwaysV1.js for relationship_patterns threshold
- Reduced DB pool max from 10 to 3 for Neon free tier compatibility