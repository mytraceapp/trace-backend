# Overview

TRACE is a mental wellness and emotional support application designed to provide a calm, grounded companion experience. It integrates interactive activities, AI-powered conversations, journaling, and mindfulness exercises within a safe, non-judgmental digital space. The application aims to help users achieve emotional clarity and reflect on their well-being. Key features include real-time AI chat, interactive mini-games, a comprehensive journaling system with calendar views, and emotional pattern recognition to understand and support mental and emotional rhythms. The project's overarching vision is to deliver a personalized and supportive digital companion for daily emotional well-being, with an aesthetic inspired by modern smartphone design.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

The application is built with React 18, TypeScript, and Vite, utilizing Framer Motion for animations and Tailwind CSS v4 for styling with custom design tokens. It follows a screen-based architecture with dedicated components. State management is handled by React Context API for global states (user, entries, theme) and local component state. Navigation uses a bottom bar for primary screens and modal overlays for secondary flows.

## Audio & Sensory Design

Custom tone generators, built using the Web Audio API, create dynamic, procedurally generated ambient soundscapes that adapt to screen navigation.

## AI Integration

An Express server proxies requests to the OpenAI API, defining TRACE AI's personality through system prompts. Client-side conversation history maintains context. An Emotional Intelligence Module analyzes mood trajectories and user engagement, prompting check-backs when needed. An audit logging system tracks AI interactions and decisions, including consent for pattern reflections. Bug guardrails ensure graceful degradation. A system confidence level dynamically adjusts AI responses based on internal context reliability. Feature flags (`PATTERN_REFLECTIONS_ENABLED`, `EMOTIONAL_INTELLIGENCE_ENABLED`, `CONSENT_SYSTEM_ENABLED`, `ACTIVITY_SUGGESTIONS_ENABLED`, `LONG_TERM_MEMORY_ENABLED`) allow for granular control over smart features.

### Presence Enhancements

TRACE uses relational language for activity acknowledgments and journal conversation invitations, integrates Spotify for playlist suggestions, and offers original ambient music. Features are introduced contextually.

### Scripted Onboarding

A state machine manages a friend-like onboarding sequence, which includes an introduction, activity suggestion, auto-navigation to an activity, a post-activity check-in, and a critical, one-time therapy disclaimer. This flow completes after the disclaimer is shown. Post-activity, the AI extracts recent chat context for conversation continuity.

### Summary Tone

All TRACE summaries maintain a warm, grounded tone, focusing on factual observations of user-generated patterns and themes without therapeutic jargon.

### Privacy by Design

TRACE primarily stores AI-generated, non-identifying summaries (max 15 words) of user content, discarding raw text unless the user explicitly opts in. Data is stored in Supabase with Row Level Security (RLS). GDPR-compliant endpoints for data export and deletion, and privacy settings management, are included.

### Reliability & Graceful Degradation

The backend provides relational fallback messages if OpenAI retries fail. Spotify integration includes a triple safety net with fallbacks to web players. All network requests use AbortController timeouts to prevent hanging, with graceful degradation for activity logs and music configurations.

### Journal Memory Integration

High-level themes from journal entries are extracted and, with user consent, fed into chat context, allowing TRACE to reference past entries using hedging language.

### Activity Outcomes Learning

The system correlates activity completions with mood check-ins to identify mood-improving activities, suggesting them with warm, tentative phrases.

### Post-Activity Followup Override

Scripted post-activity reflection follow-ups are gated to prevent overriding user intent pivots. When an activity completes, `pendingFollowup` is set in session state (TTL 10 minutes) and `awaiting_reflection` is set in `activity_reflection_state` DB table. On the next user message, the system checks for pivots at **two gates**:

1. **Early-return gate (pre-brainSynthesis)**: If Studios intercepts (`studios_intercept` or `music_invite_offer` path), `pendingFollowup` is cleared from both session state and DB immediately, with `[FOLLOWUP_OVERRIDE] reason:"pivot_to_studios" path:"studios_intercept|music_invite_offer"`. Normal Studios routing continues.

2. **Post-brainSynthesis gate**: If brainSynthesis runs (no Studios intercept), `traceIntent` is used as the source of truth. If the user pivots (`primaryMode==="studios"` OR `intentType==="music"` OR `musicRequest===true` OR play/spotify/playlist keyword match), the reflection is cleared. If the user gives a reflection answer (`isReflectionAnswer(text)` in `reflectionTracking.js`), the caring response is generated and followup is consumed. If neither, followup is deferred (not cleared) so the user can answer next turn.

Safety: crisis mode and onboarding always bypass reflection. Observability: `[FOLLOWUP_STATE]` logs pending/expired/allowed/primaryMode per request; `[FOLLOWUP_OVERRIDE]` logs when cleared with reason (`pivot_to_studios`, `onboarding_active`, `not_reflection_answer`). Files: `conversationState.js` (pendingFollowup state with TTL), `reflectionTracking.js` (isReflectionAnswer helper), `index.js` (early-return override in Studios/music_invite paths + post-brainSynthesis gate).

### Dreamscape Presence Memory

Recent Dreamscape session history is loaded to allow TRACE to reference past sessions contextually.

### Primary Mode Gating

`traceIntent.primaryMode` enforces a single authoritative mode per response (e.g., `studios`, `conversation`, `dream`, `activity`, `crisis`, `onboarding`) to prevent mixed responses. For example, in `studios` mode, soundscapes are suppressed and activities are blocked. An anti-repetition system for Studios prevents repetitive responses.

### Topic Anchoring

Prevents context drift across conversation turns. `brainSynthesis` computes a `topicAnchor` per turn with `domain` (music/dreams/crisis/activity/onboarding/conversation), `label`, `entities`, `turnAge`, and `carried`. Persisted in `conversationState` and carried forward via `previousAnchor`; resets on `cognitiveIntent.topic_shift`. The V2 directive injects `TOPIC ANCHOR:` and `SESSION SUMMARY:` lines. `buildSessionSummary(traceIntent, sessionState)` produces a max-18-word, no-user-quotes summary from anchor + session stage to prevent context loss when history is trimmed (V2-only). Always-on logs: `[ANCHOR]` (topic tracking), `[MODE_LOCK]` (primaryMode transitions), `[SESSION_SUMMARY]` (requestId, summary_len, domain, label). Files: `brainSynthesis.js`, `traceDirectiveV2.js`, `buildTracePromptV2.js`, `conversationState.js`, `traceIntent.js`.

### Doorways v1 (Brain-Only Detection)

A system to detect user entry into specific emotional/psychological realms (e.g., `dreams_symbols`, `grief`) and inject contextual intent into the system prompt for natural AI responses. It uses phrase-based scoring, affinity decay, per-door cooldowns, and crisis override.

## Interactive Activities

Activities are short (45 seconds to 5 minutes) and include a procedural Maze mini-game, Breathing Exercises, 5-4-3-2-1 Grounding, "Rising" (WebGL shader animation), Power Nap, Pearl Ripple, and Walking Reset. All activities auto-save an entry upon completion.

## Journal & Entries System

A unified `Entry` interface supports five types: `session`, `emotional_note`, `ai_reflection`, `check_in`, and `pattern`. Entries are timestamped, include metadata, and are visualized in a calendar. AI-generated daily reflections summarize user activity. Data is managed via an in-memory React context with localStorage persistence.

## Patterns Feature

The system identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and suggested actions. A visual rhythm map shows weekly emotional cadence.

## Authentication & Subscription Management

The app supports email/password authentication (with Face ID placeholder) and an onboarding flow for plan selection (Light/Free, Premium, Studio). Subscription plans are managed globally via `UserProvider` for feature gating.

## Design System

The app employs distinct Day (sage greens, warm earth tones) and Night (deep olive-charcoal, desert sand undertones) themes, applied at the root using CSS classes. The visual language emphasizes soft gradients, subtle grain textures, rounded corners, liquid light animations, and typography using SF Pro Text and Display. Interactions prioritize gentle spring animations and clear visual feedback.

## Synthesis Gate — Prompt Architecture Refactoring

A multi-phase refactoring implemented a two-layer V2 prompt system to address prompt fragmentation. This includes stripping legacy injections, server-side deterministic computation of meta-data, schema enforcement with a single-attempt `gpt-4o-mini` rewrite for validation failures, and various retirement flags to disable legacy prompt adjustments when schema enforcement is active. V2 rollout is controlled by environment flags (`TRACE_PROMPT_V2_PCT`, `TRACE_V2_STRIP_INJECTIONS`, `TRACE_SCHEMA_ENFORCEMENT`) allowing for instant rollback.

# External Dependencies

## Third-Party Services

-   **OpenAI API**: For TRACE AI chat completions.
-   **Supabase**: Backend database for user data, authentication, and real-time sync.
-   **Stripe**: Payment processing for subscription management.

## UI Component Libraries

-   **Radix UI**: Unstyled, accessible component primitives.
-   **Lucide React**: Icon system.
-   **class-variance-authority**: Type-safe component variant management.
-   **cmdk**: Command palette.
-   **embla-carousel-react**: Carousel functionality.
-   **react-day-picker**: Calendar date selection.
-   **react-hook-form**: Form state management and validation.
-   **recharts**: Data visualization.

## Development Tools

-   **Drizzle ORM**: Type-safe database queries.
-   **Express**: Node.js server for AI proxy and APIs.
-   **Passport**: Authentication middleware.
-   **express-session** + **connect-pg-simple**: Session management.

## Audio & Media

-   **Web Audio API**: Browser-native audio synthesis.

## Storage

-   **localStorage**: Client-side persistence.
-   **PostgreSQL**: Server-side relational database.