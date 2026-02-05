# Overview

TRACE is a mental wellness and emotional support application providing a calm, grounded companion experience. It offers interactive activities, AI-powered conversations, journaling, pattern tracking, and mindfulness exercises within a safe, non-judgmental space. The application aims to help users reflect and achieve emotional clarity, featuring an aesthetic inspired by the iPhone 15 Pro. Key capabilities include real-time AI chat, interactive mini-games, a comprehensive journaling system with calendar views, and emotional pattern recognition to understand mental and emotional rhythms. The project's vision is to offer a personalized, supportive digital companion for daily emotional well-being.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The application uses React 18 with TypeScript and Vite, employing Framer Motion for animations and Tailwind CSS v4 with custom design tokens for styling. It features a screen-based architecture with dedicated components, using the React Context API for global state management (user, entries, theme data) and local component state. Client-side routing is handled by a bottom navigation bar for primary screens and modal overlays for secondary flows.

## Audio & Sensory Design

Custom tone generators, built with the Web Audio API, create dynamic, procedurally generated ambient soundscapes. Audio profiles adapt to screen navigation.

## AI Integration

An Express server acts as a proxy to the OpenAI API, defining TRACE AI's personality via system prompts. Client-side conversation history maintains context. An Emotional Intelligence Module analyzes mood trajectories, detects user absence, and provides check-backs. An audit logging system tracks AI interactions and decisions, including consent for pattern reflections. Bug guardrails ensure graceful degradation if AI components fail. A system confidence level dynamically adjusts AI responses based on internal context reliability. Feature flags (`PATTERN_REFLECTIONS_ENABLED`, `EMOTIONAL_INTELLIGENCE_ENABLED`, `CONSENT_SYSTEM_ENABLED`, `ACTIVITY_SUGGESTIONS_ENABLED`, `LONG_TERM_MEMORY_ENABLED`) allow for disabling smart features.

### Presence Enhancements

TRACE uses relational language for activity acknowledgments and journal conversation invitations. It integrates Spotify for playlist suggestions and offers original ambient music. Features are introduced contextually.

### Scripted Onboarding Flow

New users complete a friend-like onboarding sequence managed by a state machine, which includes an introduction, activity suggestion, auto-navigation to an activity, a post-activity check-in, and a critical, one-time therapy disclaimer. Once `onboarding_step` is `completed` and `disclaimer_shown` is `true`, this flow does not repeat. Post-activity, the AI extracts recent chat context to ensure conversation continuity.

### Summary Tone Guidelines

All TRACE summaries maintain a warm but grounded tone, akin to a thoughtful friend noticing patterns. The style focuses on factual observations of patterns, themes, and topics from actual user data, avoiding therapeutic jargon.

### Privacy by Design

TRACE primarily stores AI-generated summaries (max 15 words, non-identifying) of user content by default, discarding raw text unless the user opts in. Data is stored in dedicated Supabase tables (`trace_entries_summary`, `trace_entries_raw`) with Row Level Security (RLS). GDPR-compliant endpoints for data export and deletion, along with privacy settings management, are included.

### Reliability & Graceful Degradation

The backend provides relational fallback messages when OpenAI retries fail. Spotify integration includes a triple safety net, falling back to web players if the app is unavailable. All network requests use AbortController timeouts to prevent hanging, with graceful degradation for activity logs and music configurations.

### Journal Memory Integration

High-level themes from journal entries are extracted and stored. With user consent, these themes are fed into chat context, allowing TRACE to reference past entries using hedging language.

### Activity Outcomes Learning

The system correlates activity completions with mood check-ins to identify activities that improve user mood, suggesting them with warm, tentative phrases.

### Dreamscape Presence Memory

Recent Dreamscape session history is loaded to allow TRACE to reference past sessions contextually.

### Doorways v1 (Brain-Only Detection)

A system to detect when users are entering specific emotional/psychological realms (e.g., `dreams_symbols`, `grief`, `joy_delight`). It injects contextual intent into the system prompt for natural AI responses within the therapeutic realm. Mechanisms include phrase-based scoring with weighted triggers, affinity decay, per-door cooldowns, crisis override, and telemetry logging with text hashing for privacy.

## Interactive Activities

Activities are short (45 seconds to 5 minutes) and include a procedural Maze mini-game, Breathing Exercises, 5-4-3-2-1 Grounding, "Rising" (WebGL shader animation), Power Nap, Pearl Ripple, and Walking Reset. All activities auto-save an entry upon completion.

## Journal & Entries System

A unified `Entry` interface supports five types: `session`, `emotional_note`, `ai_reflection`, `check_in`, and `pattern`. Entries are timestamped with metadata and visualized in a calendar. AI-generated daily reflections summarize user activity. Data is managed via an in-memory React context with localStorage persistence.

## Patterns Feature

The system identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and suggested actions. A visual rhythm map shows weekly emotional cadence.

## Authentication & Subscription Management

The app supports email/password authentication (with Face ID placeholder) and an onboarding flow for plan selection (Light/Free, Premium, Studio). Subscription plans are managed globally via UserProvider for feature gating.

## Design System

The app employs distinct Day (sage greens, warm earth tones) and Night (deep olive-charcoal, desert sand undertones) themes, applied at the root using CSS classes. The visual language emphasizes soft gradients, subtle grain textures, rounded corners, liquid light animations, and typography using SF Pro Text and Display. Interactions prioritize gentle spring animations and clear visual feedback.

## Synthesis Gate — Prompt Architecture Refactoring

A multi-phase refactoring implemented a two-layer V2 prompt system to address prompt fragmentation. Phase 3 (Legacy Injection Stripping) reduces prompt size by stripping ConvoState probe rules, anti-repetition openers, and the T2 manifesto. Phase 4 (Schema Enforcement) uses server-side deterministic computation for meta-data (sentence count, question count, activity offers) and a validator to check micro mode limits. It includes a single-attempt `gpt-4o-mini` rewrite if schema validation fails, with various retirement flags to disable legacy prompt adjustments when schema enforcement is active. V2 rollout is controlled by `TRACE_PROMPT_V2_PCT` (percentage of users on V2), `TRACE_V2_STRIP_INJECTIONS`, and `TRACE_SCHEMA_ENFORCEMENT` environment flags, allowing for instant rollback.

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
-   **PostgreSQL**: Server-side relational database via Drizzle ORM and `pg` client library.