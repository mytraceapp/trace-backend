# Overview

TRACE is a mental wellness and emotional support application providing a calm, grounded companion experience. It integrates interactive activities, AI-powered conversations, journaling, and mindfulness exercises within a safe, non-judgmental digital space. The application aims to help users achieve emotional clarity and reflect on their well-being, delivering a personalized and supportive digital companion for daily emotional well-being.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend

The application uses React 18, TypeScript, and Vite, with Framer Motion for animations and Tailwind CSS v4 for styling. It features a screen-based architecture, React Context API for state management, and a bottom navigation bar.

## Audio & Sensory Design

Custom tone generators built with the Web Audio API create dynamic, procedurally generated ambient soundscapes.

## AI Integration

An Express server proxies requests to the OpenAI API, defining TRACE AI's personality. Features include an Emotional Intelligence Module for mood analysis, an audit logging system, and configurable smart features via feature flags. TRACE uses relational language for interactions and a state machine for a friend-like onboarding sequence, including a critical therapy disclaimer. Summaries are warm, grounded, and factual, avoiding jargon.

## Privacy by Design

TRACE primarily stores AI-generated, non-identifying summaries (max 15 words) of user content in Supabase with Row Level Security (RLS). GDPR-compliant endpoints for data management are included.

## Reliability & Graceful Degradation

The backend provides relational fallback messages for OpenAI failures, and Spotify integration includes a triple safety net. All network requests use AbortController timeouts to prevent hanging.

## Journal Memory Integration

High-level themes from journal entries are extracted, with user consent, to inform chat context, allowing TRACE to reference past entries.

## Activity Outcomes Learning

The system correlates activity completions with mood check-ins to identify and suggest mood-improving activities.

## Post-Activity Followup Override

Scripted post-activity reflection follow-ups are carefully managed via session state and database flags to prevent overriding user intent pivots, with checks at pre-brainSynthesis and post-brainSynthesis gates.

## Continuity Guard

A two-layer approach prevents conversation resets when response sources change, using a V2 prompt directive and server-side contextual bridges. Topic anchoring prevents context drift, persisting `topicAnchor` and using a session summary.

## Primary Mode Gating

`traceIntent.primaryMode` enforces a single authoritative mode per response (e.g., `studios`, `conversation`) to prevent mixed responses.

## Interaction Contract Lock

Enforces action-response consistency for music/studios requests by classifying user messages into typed actions, storing them in `traceIntent.action`, and validating compliance with defined policies.

## Doorways v1 (Brain-Only Detection)

Detects user entry into specific emotional/psychological realms to inject contextual intent into the system prompt.

## Interactive Activities

Short activities (45 seconds to 5 minutes) include a procedural Maze game, Breathing Exercises, 5-4-3-2-1 Grounding, "Rising" (WebGL), Power Nap, Pearl Ripple, and Walking Reset. All auto-save an entry upon completion.

## Journal & Entries System

A unified `Entry` interface supports five types, visualized in a calendar, with AI-generated daily reflections. Data is managed via in-memory React context with localStorage persistence.

## Patterns Feature

Identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and a visual rhythm map.

## Authentication & Subscription Management

Supports email/password authentication and an onboarding flow for plan selection (Light/Free, Premium, Studio), with subscription plans managed globally for feature gating.

## Design System

Employs distinct Day (sage greens, warm earth tones) and Night (deep olive-charcoal, desert sand undertones) themes, applied using CSS classes. The visual language emphasizes soft gradients, subtle grain textures, rounded corners, liquid light animations, and specific typography.

## Synthesis Gate — Prompt Architecture Refactoring

A multi-phase refactoring implemented a two-layer V2 prompt system to address prompt fragmentation, including schema enforcement and environment-controlled rollout.

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