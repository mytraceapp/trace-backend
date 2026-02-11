# Overview

TRACE is a mental wellness and emotional support application designed to be a calm, grounded digital companion. It offers interactive activities, AI-powered conversations, journaling, and mindfulness exercises in a safe, non-judgmental space. The application aims to help users achieve emotional clarity, reflect on their well-being, and provides personalized support for daily emotional health. The project envisions significant market potential by delivering a unique, AI-enhanced tool for personal well-being.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

The application is built with React 18, TypeScript, and Vite, utilizing Framer Motion for animations and Tailwind CSS v4 for styling. It features a screen-based architecture, React Context API for state management, and a bottom navigation bar.

## Audio & Sensory Design

Custom tone generators, built with the Web Audio API, create dynamic, procedurally generated ambient soundscapes.

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
-   **Response Shape Lock**: Locks the API response envelope, normalizing and validating it at every `/api/chat` exit point to ensure consistent data structure and content based on the interaction mode.

## Authentication & Subscription

Supports Supabase anonymous authentication with persistent user ID recovery and server-side data migration for lost sessions. Subscription plans (Light/Free, Premium, Studio) are managed globally for feature gating.

## Greeting Deduplication

Manages welcome greetings to ensure variety and freshness by tracking past approaches and topics, and filtering against recent conversation topics.

## Design System

Utilizes distinct Day (sage greens, warm earth tones) and Night (deep olive-charcoal, desert sand undertones) themes with a visual language emphasizing soft gradients, subtle grain textures, rounded corners, and specific typography.

## Synthesis Gate — Prompt Architecture Refactoring

A two-layer V2 prompt system was implemented to address prompt fragmentation, including schema enforcement and environment-controlled rollout.

## Interactive Activities

Includes short, interactive activities like a procedural Maze game, Breathing Exercises, 5-4-3-2-1 Grounding, "Rising" (WebGL), Power Nap, Pearl Ripple, and Walking Reset, all with auto-save upon completion.

## Journal & Entries System

A unified `Entry` interface supports five types, visualized in a calendar, with AI-generated daily reflections. Data is managed via in-memory React context with localStorage persistence.

## Patterns Feature

Identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and a visual rhythm map.

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