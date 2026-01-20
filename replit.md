# Overview

TRACE is a mental wellness and emotional support application designed to provide a calm, grounded companion experience. Built with React and Vite, it offers interactive activities, AI-powered conversations, journaling, pattern tracking, and mindfulness exercises. The application aims to create a safe, non-judgmental space for users to reflect and find emotional clarity, featuring an aesthetic inspired by the iPhone 15 Pro. Key capabilities include real-time AI chat, interactive mini-games, a comprehensive journaling system with calendar views, and emotional pattern recognition to help users understand their mental and emotional rhythms.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The application is built using React 18 with TypeScript and Vite. Framer Motion handles animations, and Tailwind CSS v4, with custom design tokens, manages styling. It adopts a screen-based architecture with dedicated components and uses the React Context API for global state management (user, entries, theme data), supplemented by local component state. Client-side routing is facilitated by a bottom navigation bar for primary screens and modal overlays for secondary flows.

## Audio & Sensory Design

Custom tone generators, leveraging the Web Audio API, create dynamic, procedurally generated ambient soundscapes, reducing file size and offering unique auditory experiences. Audio profiles adapt based on screen navigation.

## AI Integration

An Express server acts as a proxy to the OpenAI API, defining the TRACE AI personality through system prompts. The chat maintains client-side conversation history for context and can suggest or auto-navigate to activities. An Emotional Intelligence Module analyzes mood trajectories, detects user absence, and provides gentle check-backs. An audit logging system tracks AI interactions and decisions, including consent for pattern reflections. Bug guardrails ensure graceful degradation, allowing the application to function even if AI components fail, logging errors without disrupting the user experience. A system confidence level dynamically adjusts AI responses based on internal context reliability. Feature flags provide panic switches to disable smart features: `PATTERN_REFLECTIONS_ENABLED`, `EMOTIONAL_INTELLIGENCE_ENABLED`, `CONSENT_SYSTEM_ENABLED`, `ACTIVITY_SUGGESTIONS_ENABLED`, `LONG_TERM_MEMORY_ENABLED`.

### Presence Enhancements

TRACE employs relational language for activity acknowledgments and journal conversation invitations. It integrates Spotify for playlist suggestions and offers original ambient music ("Night Swim") for emotional support. Features are introduced contextually rather than through explicit tutorials.

### Scripted Onboarding Flow

New users go through a friend-like onboarding sequence managed by a state machine:

**Step Sequence:**
1. `intro_sent` - Bootstrap intro shown (10 deterministic variants)
2. `waiting_ok` - After first reply, TRACE offers breathing activity
3. `activity_in_progress` - User said "okay", auto-navigated to activity
4. `reflection_pending` - Activity completed, awaiting reflection
5. `completed` - Reflection captured, onboarding done

**Client/Server Responsibilities:**
- Server handles: intro_sent → waiting_ok scripted responses, activity auto-navigate trigger
- Client handles: "Welcome back" message, reflection capture via `/api/onboarding/reflection`, handoff message
- Anonymous auth on app start with `ensureAuthSession()` and `upsertUserProfile()`

### Privacy by Design

By default, TRACE stores only AI-generated summaries (max 15 words, non-identifying) of user content, discarding raw text unless the user opts in. Dedicated Supabase tables (`trace_entries_summary`, `trace_entries_raw`) with RLS policies manage data storage. GDPR-compliant endpoints for data export and deletion, along with privacy settings management, are included.

### Reliability & Graceful Degradation

The backend provides relational fallback messages when OpenAI retries fail, maintaining the therapeutic experience. A triple safety net for Spotify integration ensures music playback reliability, falling back to web players if the app is unavailable. All network requests incorporate AbortController timeouts to prevent hanging, with graceful degradation for activity logs and music configuration fetches.

### Journal Memory Integration

High-level themes from journal entries are extracted and stored, then fed into chat context (with user consent) to allow TRACE to reference past entries. Consent for journal memory is managed through user settings and verbal interaction, with hedging language used to reference journal themes without direct quotation.

### Activity Outcomes Learning

The system correlates activity completions with mood check-ins to identify activities that consistently improve user mood. TRACE uses warm, tentative phrases to suggest activities based on observed positive outcomes.

### Dreamscape Presence Memory

The system loads recent Dreamscape session history to enable TRACE to reference past sessions with genuine presence language, injecting contextual information into chat requests.

## Interactive Activities

Activities are short (45 seconds to 5 minutes) and include a procedural Maze mini-game, timed Breathing Exercises, a 5-4-3-2-1 Grounding technique, and "Rising" (a full-screen WebGL shader animation). Other activities like Power Nap, Pearl Ripple, and Walking Reset are also present. All activities auto-save an entry upon completion.

## Journal & Entries System

A unified `Entry` interface supports five types: `session`, `emotional_note`, `ai_reflection`, `check_in`, and `pattern`. Entries are timestamped with metadata and visualized in a calendar view. AI-generated daily reflections summarize user activity. Data is managed via an in-memory React context with localStorage persistence.

## Patterns Feature

The system identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and suggested actions. A visual rhythm map shows weekly emotional cadence. Currently uses static seed data, with future plans for personalized pattern generation.

## Authentication & Subscription Management

The app supports email/password authentication (with a Face ID placeholder) and an onboarding flow for plan selection (Light/Free, Premium, Studio). Subscription plans are managed globally via UserProvider for feature gating.

## Design System

The app employs distinct Day (sage greens, warm earth tones) and Night (deep olive-charcoal, desert sand undertones) themes applied at the root level using CSS classes. The visual language emphasizes soft gradients, subtle grain textures, rounded corners, and liquid light animations. Typography uses SF Pro Text and Display, with minimal text density. Interactions prioritize gentle spring animations and clear visual feedback.

# External Dependencies

## Third-Party Services

-   **OpenAI API**: For TRACE AI chat completions, accessed via a backend Express server proxy.
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

-   **Web Audio API**: Browser-native audio synthesis for custom tone generation.

## Storage

-   **localStorage**: Client-side persistence for entries and user preferences.
-   **PostgreSQL**: Server-side relational database via Drizzle ORM and `pg` client library.