# Overview

TRACE is a mental wellness and emotional support application designed as a calm, grounded digital companion. It offers interactive activities, AI-powered conversations, journaling, and mindfulness exercises in a safe, non-judgmental space. The application aims to help users achieve emotional clarity, reflect on their well-being, and provides personalized support for daily emotional health. The project envisions significant market potential by delivering a unique, AI-enhanced tool for personal well-being.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The application is built with React 18, TypeScript, and Vite, using Framer Motion for animations and Tailwind CSS v4 for styling. It features a screen-based architecture, React Context API for state management, and a bottom navigation bar. Distinct Day and Night themes are implemented with a visual language emphasizing soft gradients, subtle grain textures, rounded corners, and specific typography.

## Audio & Sensory Design
Custom tone generators using the Web Audio API create dynamic, procedurally generated ambient soundscapes. The mobile app integrates three independent audio layers: a global ambient track, mood-based emotional soundscapes managed by an Atmosphere Engine, and a Night Swim Player for streaming original tracks. A soundscape persistence system ensures smooth transitions, and a Soundscape State Lock enforces minimum playback commitment for non-presence states to maintain emotional inertia. The atmosphere engine uses fuzzy signal detection for natural emotional expressions.

## AI Integration
An Express server acts as a proxy to the OpenAI API, defining TRACE AI's personality with relational language and a friend-like onboarding. It includes an Emotional Intelligence Module for mood analysis, audit logging, and configurable smart features. The AI provides warm, grounded, and factual summaries. A Factual Accuracy System uses topic detection, article caching, dynamic word limits, and a factual grounding prompt to ensure citations. Conversation management features like Continuity Guard and an Interaction Contract Lock ensure coherence. Voice Quality Systems, including Hollow-Response Detection and a Response Rhythm System, enhance natural interaction.

## Privacy by Design
TRACE stores primarily AI-generated, non-identifying summaries (max 15 words) of user content in Supabase with Row Level Security (RLS) and includes GDPR-compliant endpoints.

## Journal & Activity Integration
High-level themes from journal entries can inform chat context, and activity completions are correlated with mood check-ins. Interactive activities include a procedural Maze game, Breathing Exercises, 5-4-3-2-1 Grounding, "Rising" (WebGL), Power Nap, Pearl Ripple, and Walking Reset, all with auto-save. A unified `Entry` interface supports five journal types with AI-generated daily reflections.

## Authentication & Subscription
Supports Supabase anonymous authentication with persistent user ID recovery and server-side data migration. Subscription plans (Light/Free, Premium, Studio) are managed globally for feature gating.

## Greeting & Session Management
A Greeting Deduplication & Grounding Guard manages welcome greetings for variety and freshness, validating AI-generated greetings against verified memory. A wind-down detection system triggers warm closing messages from the AI based on user signals.

## Prompt Architecture
A two-layer V2 prompt system uses a TRACE Control Block, prepended as a separate system message, to provide deterministic per-turn constraints.

## Patterns Feature
Identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and a visual rhythm map.

## Persistence
Music familiarity and Doorways v1 user profiles (affinity scores, hit history) are tracked per user and persisted to Supabase for cross-session unlock rules.

## Audio Control Path Resolution
An audio control handler system differentiates between early interceptors and the Studios handler to prevent conflicts in stop/resume/pause commands.

## Tone Sanitizer
A post-processing system strips therapy-speak from AI responses using regex patterns and includes mid-text fragment repair.

## Warmth Floor & Emotional Pivot System
The attunement engine detects GENTLE posture for sleep/exhaustion language (insomnia, can't sleep, up all night, etc.) and enforces a minimum word floor (30 words) to prevent ultra-short dismissive responses during vulnerable moments. An emotional pivot detector breaks Studios mode lock when users shift from music/operational messages to emotional content (sleep issues, loneliness, crying, exhaustion), allowing TRACE to respond in full conversation mode. The V2 core prompt and attunement STYLE_EXAMPLES include concrete warm-without-therapy-speak guidance for vulnerable moments.

## Music Playback Pipeline (Backend)
The music suggestion to playback pipeline detects explicit user requests, AI responses mentioning track names, curation engine offers, and generic offer phrasing.

## Atmosphere Engine Crisis Recovery
When crisis mode activates, the atmosphere engine saves pre-crisis state markers and restores to 'presence' with reset baseline signals when the crisis clears.

## 3-Layer Memory System
### Layer 1: Relational Memory
An entity-anchored relational memory system tracks and resolves people mentioned by the user, injecting relational anchors into the LLM system prompt, including pronoun resolution and correction detection.
### Layer 2: Topic Memory
Persistent topic tracking extracts and stores conversation topics, injecting active and recent cross-session topics into the system prompt.
### Layer 3: Emotional Carryover
Prevents tone whiplash by classifying and saving conversation emotional tone between sessions, adjusting the system prompt accordingly.

## Relationship Profile System
A friend-level understanding layer that captures *impressions* of the user, stored as `relationship_profile`. It tracks communication style, emotional patterns, topics of care/avoidance, open threads, trust level, and energy trends. A Follow-Up Queue selects open threads and pending topics for gentle follow-up cues. A Meta-Memory Response Handler provides relationship-focused responses to "What do you know about me?". Memory Frustration Repair addresses user frustration about memory, and Contradiction Awareness surfaces inconsistencies based on trust level.

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