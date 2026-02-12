# Overview

TRACE is a mental wellness and emotional support application designed to be a calm, grounded digital companion. It offers interactive activities, AI-powered conversations, journaling, and mindfulness exercises in a safe, non-judgmental space. The application aims to help users achieve emotional clarity, reflect on their well-being, and provides personalized support for daily emotional health. The project envisions significant market potential by delivering a unique, AI-enhanced tool for personal well-being.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

The application is built with React 18, TypeScript, and Vite, utilizing Framer Motion for animations and Tailwind CSS v4 for styling. It features a screen-based architecture, React Context API for state management, and a bottom navigation bar.

## Audio & Sensory Design

Custom tone generators, built with the Web Audio API, create dynamic, procedurally generated ambient soundscapes.

### Mobile Audio Layers (Feb 2026)

The mobile app has three independent audio layers:
1. **Global Ambient** (`ambientAudio.ts`): Plays `trace_ambient.m4a` on chat tab focus when Night Swim player is inactive. Simple loop at 0.35 volume.
2. **Emotional Soundscapes** (`AudioProvider.tsx`): 5 mood-based folders × 7 tracks each, triggered by the Atmosphere Engine's `sound_state` payload. Uses `isFirstActivation` guard to start playback on the initial "presence" state even when `changed: false`. Pauses for activities or originals playback.
3. **Night Swim Player** (inline in `chat.tsx`): Streams tracks from Supabase `trace_originals_tracks` table (7 tracks). Server sends 0-based track index via `audio_action`; mobile fetches tracks ordered by `track_number asc` and plays `data[trackIndex]`.

### Night Swim Track Index Alignment
Server `TRACK_INDEX_MAP` (0-based) → DB `track_number` (1-based):
- 0 → Midnight Underwater (track 1)
- 1 → Slow Tides Over Glass (track 2)
- 2 → Undertow (track 3)
- 3 → Euphoria (track 4)
- 4 → Ocean Breathing (track 5)
- 5 → Tidal House (track 6)
- 6 → Neon Promise (track 7)

Audio URLs are currently SoundHelix placeholders; replace with real assets when available.

## AI Integration

An Express server acts as a proxy to the OpenAI API, defining TRACE AI's personality with relational language and a friend-like onboarding sequence that includes a therapy disclaimer. It features an Emotional Intelligence Module for mood analysis, an audit logging system, and configurable smart features via feature flags. Summaries are warm, grounded, and factual, avoiding jargon. The system is designed for reliability with relational fallback messages for OpenAI failures.

## Privacy by Design

TRACE prioritizes privacy by storing primarily AI-generated, non-identifying summaries (max 15 words) of user content in Supabase with Row Level Security (RLS). GDPR-compliant endpoints are included for data management.

## Journal & Activity Integration

High-level themes from journal entries can be extracted, with user consent, to inform chat context, allowing the AI to reference past entries. The system correlates activity completions with mood check-ins to suggest mood-improving activities. Context continuity across activities is maintained to ensure music and topic context persist.

## Conversation Management & Continuity

The system employs several mechanisms to ensure conversational coherence:
-   **Continuity Guard**: A two-layer approach prevents conversation resets when response sources change, utilizing prompt directives and server-side contextual bridges, with topic anchoring to prevent context drift.
-   **Primary Mode Gating**: Enforces a single authoritative mode per response (e.g., `studios`, `conversation`) to prevent mixed responses.
-   **Interaction Contract Lock**: Ensures action-response consistency for music/studios requests by classifying user messages into typed actions.
-   **Studios Run Mode (Sticky Session)**: Maintains context stability during music exploration sessions by defaulting `primaryMode` to `studios` and managing session TTLs, with clear pivot detection for emotional disclosures, crisis, or onboarding.
-   **Retrieval Budget + Mode-Scoped Context**: Enforces strict mode-scoped context filtering based on the primary mode and topic anchor, optimizing context relevance.
-   **Continuity Bridge**: Wraps non-model early-return messages with a short continuity phrase when required.
-   **Return-to-Chat Pivot Hardening**: Manages conversation pivots, especially to "studios," by forcing continuity, setting topic anchors, and quarantining activity-related context.
-   **Latency + Confidence Smoothing**: Adjusts TRACE's communication style (e.g., directness, hedging) based on confidence levels and conversation stage to feel less scripted.
-   **Micro-Anticipation + Next-Move Contracts**: Selects a clear next conversational move per turn (e.g., continue, clarify, offer music) and enforces specific behavioral rules for each.
-   **Output Contract Lock**: Ensures premium response quality through prompt-level output contracts and assertions, validating first-line continuity, studios-specific rules, and mode guardrails.
-   **Response Shape Lock + finalizeTraceResponse()**: A centralized `finalizeTraceResponse()` helper (in `server/responseFinalize.js`) wraps every `return` path in `/api/chat` (~51 exit points). It normalizes the response envelope, runs `applyResponseShapeLock()` (validate + sanitize + derive mode), ensures `messages[]` array exists, and emits both `[RESPONSE_SHAPE]` and `[APP_TRACE]` logs for every path. This replaced the previous pattern where only ~4 of ~19 early returns ran shape lock, and ~15 paths returned inconsistent envelopes.

## Authentication & Subscription

Supports Supabase anonymous authentication with persistent user ID recovery and server-side data migration for lost sessions. Subscription plans (Light/Free, Premium, Studio) are managed globally for feature gating.

## Greeting Deduplication

Manages welcome greetings to ensure variety and freshness by tracking past approaches and topics, and filtering against recent conversation topics.

## Design System

Utilizes distinct Day (sage greens, warm earth tones) and Night (deep olive-charcoal, desert sand undertones) themes with a visual language emphasizing soft gradients, subtle grain textures, rounded corners, and specific typography.

## Synthesis Gate — Prompt Architecture Refactoring

A two-layer V2 prompt system was implemented to address prompt fragmentation, including schema enforcement and environment-controlled rollout.

## Prompt Deduplication (`server/promptDedup.js`)

Resolves overlapping/conflicting prompt directives across V2 directive, Studios gate, and T2 manifesto. Gated by `PROMPT_DEDUP_ENABLED` feature flag (default `false`). When enabled:
-   **V2 directive owns**: mode/length, confidence/hedging, studios guardrail, music familiarity 6-phrase ban list.
-   **Studios gate adds only**: capability-aware action rules (PLAY_IN_APP_TRACK etc.); music familiarity injection skipped (V2 already has it).
-   **T2 manifesto trimmed**: PREMIUM BREVITY (conflicts with V2 micro mode) and DEPTH WITHOUT THERAPY VOICE (V2 core + voiceEngine enforce). Kept: CORE RULES, PREMIUM INTUITION LOOP, MICRO-ECHO, ANTI-REPETITION cadence, PREMIUM QUESTIONS, MICRO-INSIGHT, VOICE CONSTRAINTS.
-   Debug: `[PROMPT_DEDUP]` logs show which blocks were included/removed per request.

## Interactive Activities

Includes short, interactive activities like a procedural Maze game, Breathing Exercises, 5-4-3-2-1 Grounding, "Rising" (WebGL), Power Nap, Pearl Ripple, and Walking Reset, all with auto-save upon completion.

## Journal & Entries System

A unified `Entry` interface supports five types, visualized in a calendar, with AI-generated daily reflections. Data is managed via in-memory React context with localStorage persistence.

## Patterns Feature

Identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and a visual rhythm map.

## Audio Control Path Resolution (Feb 2026)

Two audio control handlers exist in index.js: an early interceptor (AUDIO CONTROL section, ~line 4699) and the Studios handler (traceStudios.js). When `traceStudiosContext` is set, the early interceptor defers to Studios for stop/resume/pause commands — this prevents conflicts where "resume" was caught by the wrong handler with no track context. Studios' audio_action responses use `{action: 'pause'}` or `{action: 'resume'}` which index.js converts to proper `{type: 'stop'}` or `{type: 'resume'}` envelopes (not play actions via TRACK_INDEX_MAP).

### Studios Replay Prevention (traceOfferedTrack)
Distinguishes "offered" vs "already played" tracks using regex patterns:
- `PLAYED_CONFIRMATION_RE`: Matches "Playing Neon Promise.", "Now playing..." etc.
- `OFFER_RE`: Matches "Want to hear...?", "Would you like to listen...?" etc.
- `traceOfferedTrack = lastMsgIsOffer && !lastMsgIsPlayConfirmation` — only fires play on affirmative if TRACE actually offered, not if it already played.
- `isBareAffirmative` check filters "yeah" buried in longer conversational messages (nonAffirmativeWords ≤ 1).

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

# Debugging Context Loss (App vs Curl)

Every `/api/chat` response includes a top-level `request_id` field that matches the `requestId` used in all server log tags (`[SCHEMA METRICS]`, `[PHASE4]`, `[RESPONSE_SOURCE]`, `[APP_TRACE]`, `[RESPONSE_SHAPE]`, `[PHASE7_CONTRACT]`).

The response also includes `response_source` (e.g. `model`, `trace_studios`, `audio_control`, `insight`, `dedup_cache`) and `_shape_meta.mode` (e.g. `conversation`, `studios`, `audio_control`).

## How to debug jumbled responses

1. Start the server with logs piped to a file:
   ```
   cd Beta-vsafe1zip && PORT=3000 node server/index.js 2>&1 | tee -a server.log
   ```
2. Reproduce 3 bad turns in the app.
3. Copy their `request_id` values from the response payload (visible in app network inspector or by logging on the client).
4. Grep for each request:
   ```
   grep <request_id> server.log
   ```
5. For each request, check:
   - `[APP_TRACE]` — Which `response_source` and `primaryMode` was used? Did `anchor_domain` change unexpectedly? Is `continuity_required` true but the response feels disconnected?
   - `[RESPONSE_SHAPE]` — Did the shape lock flag any issues? Does `mode` match what you expected?
   - `[PHASE7_CONTRACT]` — Any violations logged?
   - `[RESPONSE_SOURCE]` — Did it hit an early return (studios, insight, dedup_cache, audio_control) instead of the full model pipeline?
6. Compare `userId` across requests — if it changes between turns, the client is losing its session, which would explain context loss.
7. Compare against a curl test with the same history to confirm whether the issue is in the server pipeline or the client's request construction.