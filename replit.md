# Overview

TRACE is a mental wellness and emotional support application built with React and Vite. It provides a calm, grounded companion experience through interactive activities, AI-powered conversations, journaling, pattern tracking, and mindfulness exercises. The app features an iPhone 15 Pro-inspired aesthetic, creating a safe, non-judgmental space for users to reflect and find emotional clarity. Key capabilities include real-time AI chat, interactive mini-games (maze, breathing, grounding), a comprehensive journaling system with calendar views, and emotional pattern recognition to help users understand their mental and emotional rhythms.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The application uses React 18 with TypeScript, Vite for building, and Framer Motion for animations. Styling is handled by Tailwind CSS v4 with custom design tokens. It follows a screen-based architecture with dedicated components for features like Chat, Activities, and Journal. State management is achieved using React Context API for global user, entries, and theme data, complemented by local component state. Routing is managed client-side with a bottom navigation bar for primary screens and modal overlays for secondary flows.

## Audio & Sensory Design

Custom tone generators built with the Web Audio API create dynamic, procedurally generated ambient soundscapes for activities. This approach reduces file size and offers unique auditory experiences. Screen-specific audio profiles adapt based on navigation.

## AI Integration

An Express server acts as a proxy to the OpenAI API, defining the TRACE AI personality through system prompts. The chat maintains client-side conversation history for context and can suggest/auto-navigate to activities. An Emotional Intelligence Module analyzes mood trajectories, detects user absence, and provides gentle check-backs based on recent themes. A robust audit logging system tracks AI interactions and decisions, including consent for pattern reflections. Bug guardrails ensure graceful degradation, allowing the application to function even if AI components encounter errors, logging failures without breaking the user experience. A system confidence level dynamically adjusts AI responses based on the reliability of internal context. Feature flags (environment variables) provide panic switches to disable smart features without code changes: `PATTERN_REFLECTIONS_ENABLED`, `EMOTIONAL_INTELLIGENCE_ENABLED`, `CONSENT_SYSTEM_ENABLED`, `ACTIVITY_SUGGESTIONS_ENABLED`, `LONG_TERM_MEMORY_ENABLED`.

### Presence Enhancements (January 2026)

**Activity Acknowledgments**: After completing activities, TRACE speaks with relational presence ("I stayed with you during that", "I was with you through all of it") rather than performative praise. TRACE invites reflection with open questions like "What's different now?" without forcing engagement.

**Journal Conversation Invites**: When users save journal entries (20+ characters), an invitation is stored and displayed when they next open chat. TRACE references the entry relationally ("I read what you wrote. Want to talk about any of it?") without quoting content. Invites expire after 24 hours.

**Spotify Music Integration**: TRACE can suggest Spotify playlists during conversation to be with users through sound. Three playlists available: Ground (anxiety/overwhelm), Drift (tiredness/numbness), Rising (low energy/hopelessness). Uses a two-step flow: TRACE offers first, then launches after user consents. Music is framed relationally ("I can be with you through sound") rather than prescriptively.

**Contextual Feature Introduction**: Features are introduced through relationship, not explanation. Rather than UI tours or tooltips, TRACE offers features contextually when users need them (e.g., mentioning patterns after 3-4 journal entries, suggesting Dreamscape when user mentions sleep trouble). This creates discovery through care, not instruction.

## Interactive Activities

Activities are designed to be short (45 seconds to 5 minutes) to reduce commitment anxiety. They include a procedural Maze mini-game, timed Breathing Exercises with synchronized visuals and audio, a 5-4-3-2-1 Grounding technique, and "Rising" – a full-screen WebGL shader animation with device tilt support and procedural particle systems. Other activities include Power Nap, Pearl Ripple, and Walking Reset. All activities auto-save an entry upon completion.

## Journal & Entries System

A unified `Entry` interface supports five types: `session`, `emotional_note`, `ai_reflection`, `check_in`, and `pattern`. Entries are timestamped with metadata and visualized in a calendar view. AI-generated daily reflections summarize user activity and emotional state. Data is managed via an in-memory React context with localStorage persistence.

## Patterns Feature

The system identifies three primary pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights, suggested actions, and tags. A visual rhythm map shows weekly emotional cadence. Currently, it uses static seed data, with future plans for personalized pattern generation from user entries.

## Authentication & Subscription Management

The app supports email/password authentication (with a Face ID placeholder) and an onboarding flow for plan selection (Light/Free, Premium, Studio). Subscription plans are managed globally via UserProvider, enabling feature gating.

## Design System

The app employs a distinct theme system with a Day Mode (soft sage greens, warm earth tones) and Night Mode (deep olive-charcoal with desert sand undertones and subtle grain animations). These themes are applied at the root level using CSS classes and pseudo-elements. The visual language emphasizes soft, organic gradients, subtle grain textures, rounded corners, and liquid light animations. Typography uses SF Pro Text and Display, with a minimal text density. Interaction patterns prioritize gentle spring animations and clear visual feedback.

# External Dependencies

## Third-Party Services

-   **OpenAI API**: For TRACE AI chat completions, accessed via a backend Express server proxy.
-   **Supabase** (Planned): Backend database for user data, authentication, and real-time sync.
-   **Stripe** (Planned): Payment processing for subscription management.

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

-   **Drizzle ORM** (Planned): Type-safe database queries.
-   **Express**: Node.js server for AI proxy and future APIs.
-   **Passport** (Planned): Authentication middleware.
-   **express-session** + **connect-pg-simple** (Planned): Session management.

## Audio & Media

-   **Web Audio API**: Browser-native audio synthesis for custom tone generation.

## Storage

-   **localStorage**: Client-side persistence for entries and user preferences.
-   **PostgreSQL** (Planned): Server-side relational database via Drizzle ORM and `pg` client library.