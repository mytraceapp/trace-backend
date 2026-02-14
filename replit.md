# Overview

TRACE is a mental wellness and emotional support application designed as a calm, grounded digital companion. It offers interactive activities, AI-powered conversations, journaling, and mindfulness exercises in a safe, non-judgmental space. The application aims to help users achieve emotional clarity, reflect on their well-being, and provides personalized support for daily emotional health. The project envisions significant market potential by delivering a unique, AI-enhanced tool for personal well-being.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend
The application is built with React 18, TypeScript, and Vite, using Framer Motion for animations and Tailwind CSS v4 for styling. It features a screen-based architecture, React Context API for state management, and a bottom navigation bar. Distinct Day (sage greens, warm earth tones) and Night (deep olive-charcoal, desert sand undertones) themes are used, with a visual language emphasizing soft gradients, subtle grain textures, rounded corners, and specific typography.

## Audio & Sensory Design
Custom tone generators, built with the Web Audio API, create dynamic, procedurally generated ambient soundscapes. The mobile app integrates three independent audio layers: a global ambient track, mood-based emotional soundscapes triggered by an Atmosphere Engine, and a Night Swim Player for streaming original tracks.

## AI Integration
An Express server acts as a proxy to the OpenAI API, defining TRACE AI's personality with relational language and a friend-like onboarding sequence including a therapy disclaimer. It features an Emotional Intelligence Module for mood analysis, an audit logging system, and configurable smart features via feature flags. Summaries are warm, grounded, and factual, avoiding jargon, with relational fallback messages for OpenAI failures.

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
A two-layer V2 prompt system addresses prompt fragmentation with schema enforcement. Prompt Deduplication resolves overlapping directives across V2 directive, Studios gate, and T2 manifesto, ensuring consistent prompt instructions.

## Patterns Feature
Identifies three pattern types: Peak Window, Energy Tides, and Stress Echoes, providing insights and a visual rhythm map.

## Persistence
Music familiarity (new → aware → fan) is tracked per user and persisted to Supabase. Doorways v1 user profiles (affinity scores, hit history) are also persisted to Supabase for cross-session unlock rules.

## Audio Control Path Resolution
An audio control handler system differentiates between early interceptors and the Studios handler to prevent conflicts in stop/resume/pause commands, ensuring correct track context. It also includes logic to prevent replaying already-offered tracks.

## Relational Memory (Phase 1 + Phase 2)
Entity-anchored relational memory system (`server/relationalMemory.js`) that tracks people the user mentions. Extracts relationship mentions ("my mom", "my brother") from chat messages, normalizes synonyms (mom/mother/mama → mom), and resolves known people from the local PostgreSQL `people` table. Relational anchors (e.g., "mom = Sarah") are injected into the LLM system prompt so TRACE can reference people by name. Handles ambiguous relationships (multiple friends) with buddy-voice clarification. Auto-creates person records when users explicitly name someone ("my mom Sarah"). CRUD endpoints at `/api/memory/people` and `/api/memory/person`. High-salience people are always included in system prompt context even without explicit mentions.

Phase 2 enhancements:
- **Pending Confirmation**: Explicit mentions persist immediately but append a deterministic confirmation line ("Just checking—Emma is your sister, right?"). Handles yes/no on next turn; denied records are deleted. Guards against conflict with activity confirmation flow.
- **Correction Detection**: Detects patterns like "Emma is my cousin not sister" and updates the DB relationship accordingly.
- **Pronoun Resolution**: In-memory tracking of last-mentioned person per user. Injects soft pronoun hints ("Recent reference: Emma (sister)") into system prompt within 3-message window, auto-clears after 5 messages.
- **Post-Processing Guardrail**: After LLM response, replaces "your sister" → "Emma" when anchor was injected but model didn't use the name. Conservative exact-phrase matching only.

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