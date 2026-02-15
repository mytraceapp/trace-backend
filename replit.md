# Overview

TRACE is a mental wellness and emotional support application designed as a calm, grounded digital companion. It offers interactive activities, AI-powered conversations, journaling, and mindfulness exercises in a safe, non-judgmental space. The application aims to help users achieve emotional clarity, reflect on their well-being, and provides personalized support for daily emotional health. The project envisions significant market potential by delivering a unique, AI-enhanced tool for personal well-being.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The application is built with React 18, TypeScript, and Vite, using Framer Motion for animations and Tailwind CSS v4 for styling. It features a screen-based architecture, React Context API for state management, and a bottom navigation bar. Distinct Day (sage greens, warm earth tones) and Night (deep olive-charcoal, desert sand undertones) themes are used, with a visual language emphasizing soft gradients, subtle grain textures, rounded corners, and specific typography.

## Audio & Sensory Design
Custom tone generators, built with the Web Audio API, create dynamic, procedurally generated ambient soundscapes. The mobile app integrates three independent audio layers: a global ambient track, mood-based emotional soundscapes triggered by an Atmosphere Engine, and a Night Swim Player for streaming original tracks.

### Soundscape Persistence System
Emotional soundscapes are designed to persist — not switch like a DJ. Each state has 7 tracks that cycle through sequentially (no looping). State changes are queued and applied only when the current track finishes naturally. The Atmosphere Engine enforces dual gates: minimum 25 messages AND all 7 tracks must complete before allowing state reassessment. Server-side track counting persists the client's reported track progress. Crisis/extreme spike events bypass queuing for immediate response. Queued state changes survive pause/resume flows (activities, originals). Signal decay is slow (0.97/message, 0.9 at reassessment) to preserve emotional inertia. Presence triggers are intentionally narrow — only explicit "I'm calm now" phrases, not generic "good" or "okay."

## AI Integration
An Express server acts as a proxy to the OpenAI API, defining TRACE AI's personality with relational language and a friend-like onboarding sequence including a therapy disclaimer. It features an Emotional Intelligence Module for mood analysis, an audit logging system, and configurable smart features via feature flags. Summaries are warm, grounded, and factual, avoiding jargon, with relational fallback messages for OpenAI failures.

### Factual Accuracy System
TRACE handles news, culture, and history questions with accuracy:
- **Smart Topic Detection**: `hasSpecificTopic()` detects proper nouns, events, locations. When a user message has a specific new topic, it always wins over cached follow-up topics. Vague follow-ups ("tell me more") use the cached topic.
- **Article Caching**: Fetched news articles are cached per user (30min TTL) so follow-up questions reference the same data without re-fetching.
- **Dynamic Word Limits**: Factual turns with data get 200-word max (vs normal 20-50). Factual turns without data get 150. This only applies on factual turns -- normal conversation cadence is untouched.
- **Factual Grounding Prompt**: When NEWS_CONTEXT is present, explicit instructions tell the AI to share specific headlines, cite sources, never paraphrase vaguely.
- **General Knowledge Mode**: For culture/history questions that don't need real-time data, the AI is instructed to answer confidently from its training data rather than deflecting.
- **FACTS_GUARD**: Only intercepts truly time-sensitive political questions ("who is the current president") -- does not block culture/history.

### Conversation Management & Continuity
The system employs advanced mechanisms for conversational coherence including a Continuity Guard to prevent resets, Primary Mode Gating for single authoritative responses, and an Interaction Contract Lock for action-response consistency. A Studios Run Mode maintains context during music exploration, while Retrieval Budget and Mode-Scoped Context optimize relevance. Latency + Confidence Smoothing adjusts communication style, and Micro-Anticipation selects clear next conversational moves. An Output Contract Lock and `finalizeTraceResponse()` helper ensure premium response quality and consistent response envelopes.

### Voice Quality Systems
The system includes Hollow-Response Detection to remove emotionally empty patterns, Dynamic Stage-Aware Fallbacks with topic-specific and stage-aware response pools, and a T2 Manifesto v2 to guide the model towards thinking *with* the user. A Response Rhythm System enforces natural response-length variation, utilizing length tiers, rhythm tracking, user energy detection, and buddy acknowledgment pools.

## Privacy by Design
TRACE prioritizes privacy by storing primarily AI-generated, non-identifying summaries (max 15 words) of user content in Supabase with Row Level Security (RLS). GDPR-compliant endpoints are included for data management.

## Journal & Activity Integration
High-level themes from journal entries can be extracted with user consent to inform chat context. The system correlates activity completions with mood check-ins to suggest mood-improving activities. Context continuity across activities ensures music and topic context persist. Interactive activities include a procedural Maze game, Breathing Exercises, 5-4-3-2-1 Grounding, "Rising" (WebGL), Power Nap, Pearl Ripple, and Walking Reset, all with auto-save. A unified `Entry` interface supports five journal types, visualized in a calendar, with AI-generated daily reflections.

## Authentication & Subscription
Supports Supabase anonymous authentication with persistent user ID recovery and server-side data migration. Subscription plans (Light/Free, Premium, Studio) are managed globally for feature gating.

## Greeting Deduplication
Manages welcome greetings to ensure variety and freshness by tracking past approaches and topics, and filtering against recent conversation topics.

## Prompt Architecture
A two-layer V2 prompt system addresses prompt fragmentation with schema enforcement. Prompt Deduplication resolves overlapping directives across V2 directive, Studios gate, and T2 manifesto, ensuring consistent prompt instructions. A TRACE Control Block is prepended as a separate system message on every /api/chat call, providing deterministic per-turn constraints: LENGTH_MODE (micro/short/medium with max word counts), QUESTION_MODE (WITNESS_ONLY or ALLOW_ONE with budget 0 or 1), soundscape state, relational anchors, session continuity summary, and door context. The control block leverages the existing rhythm system (conversationState.js) and question streak tracking (qStreak) to prevent back-to-back questions.

## Patterns Feature
Identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and a visual rhythm map.

## Persistence
Music familiarity (new → aware → fan) is tracked per user and persisted to Supabase. Doorways v1 user profiles (affinity scores, hit history) are also persisted to Supabase for cross-session unlock rules.

## Audio Control Path Resolution
An audio control handler system differentiates between early interceptors and the Studios handler to prevent conflicts in stop/resume/pause commands, ensuring correct track context. It also includes logic to prevent replaying already-offered tracks.

## 3-Layer Memory System

### Layer 1: Relational Memory (Phase 1 + Phase 2)
Entity-anchored relational memory system (`server/relationalMemory.js`) that tracks people the user mentions. Extracts relationship mentions ("my mom", "my brother") from chat messages, normalizes synonyms (mom/mother/mama → mom), and resolves known people from the local PostgreSQL `people` table. Relational anchors (e.g., "mom = Sarah") are injected into the LLM system prompt so TRACE can reference people by name. Handles ambiguous relationships (multiple friends) with buddy-voice clarification. Auto-creates person records when users explicitly name someone ("my mom Sarah"). CRUD endpoints at `/api/memory/people` and `/api/memory/person`. High-salience people are always included in system prompt context even without explicit mentions.

Phase 2 enhancements:
- **Pending Confirmation**: Explicit mentions persist immediately but append a deterministic confirmation line ("Just checking—Emma is your sister, right?"). Handles yes/no on next turn; denied records are deleted. Guards against conflict with activity confirmation flow.
- **Correction Detection**: Detects patterns like "Emma is my cousin not sister" and updates the DB relationship accordingly.
- **Pronoun Resolution**: In-memory tracking of last-mentioned person per user. Injects soft pronoun hints ("Recent reference: Emma (sister)") into system prompt within 3-message window, auto-clears after 5 messages.
- **Post-Processing Guardrail**: After LLM response, replaces "your sister" → "Emma" when anchor was injected but model didn't use the name. Conservative exact-phrase matching only.

### Layer 2: Topic Memory (`server/topicMemory.js`)
Persistent topic tracking across conversations using PostgreSQL `conversation_topics` table. Extracts topics from user messages (31 patterns covering work, school, relationships, health, creative, finances, etc.) with parent-child dedup (e.g., "deadlines" suppresses generic "work"). Topics are stored per user/conversation with mention counts and resolution status. Active topics from current conversation and recent cross-session topics (last 7 days) are injected into the system prompt. Resolution detection marks completed topics (e.g., "that's done", "worked out"). Daily cleanup removes old resolved topics after 30 days. All operations are fire-and-forget with graceful degradation.

### Layer 3: Emotional Carryover (`server/emotionalCarryover.js`)
Prevents tone whiplash between sessions. Classifies conversation emotional tone (crisis > heavy > positive > neutral) using pattern matching on recent messages. Tone is saved to Supabase `trace_sessions` table at session rotation and periodically (every 5th message). On next session, fetches last session's tone and injects context into system prompt: after crisis/heavy sessions, instructs minimal greetings ("hey." not "hey! what's up?"); after positive, matches energy. Provides greeting hints with time-aware logic (< 3h, < 24h, > 24h). All layers have independent try/catch — any single layer failure doesn't affect the others.

### Memory Integration
All 3 layers are injected into the system prompt after relational anchors, before the TRACE Control Block. Each layer fetches data independently and degrades gracefully. The `conversationMeta.conversationId` (from `memoryStore.ensureConversation`) is used as the authoritative conversation ID across all layers.

**Note**: Layer 3 requires `emotional_tone`, `emotional_summary`, and `tone_updated_at` columns on the Supabase `trace_sessions` table. Until these are added in Supabase, emotional carryover saves will fail silently and the layer will skip gracefully.

# External Dependencies

-   **OpenAI API**: For TRACE AI chat completions.
-   **Supabase**: Backend database for user data, authentication, and real-time sync.
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