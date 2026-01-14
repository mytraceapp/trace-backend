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

**TRACE Originals - Night Swim (January 2026)**: TRACE can offer its own original music - a 7-track ambient album called Night Swim - for late-night emotional support, sleep trouble, and distress. The backend detects emotional state from conversation (`musicRecommendation.js`) and injects a recommendation cue into the system prompt BEFORE the OpenAI call, guiding the LLM to naturally offer Night Swim. Uses a 2-turn flow: TRACE offers Night Swim (type: 'recommend'), then after user agrees, opens the player (type: 'open'). Users can also directly request Night Swim (e.g., "play night swim", "can you play night swim?") and the player opens immediately with `audio_action: {type: 'open', autoplay: true}`. Tracks stream from Supabase (`trace_originals_tracks` table). TRACE frames it personally: "I made something called Night Swim for moments like this." The Night Swim player spawns inline on the chat page at orb position (60px below wordmark). Test endpoint: `POST /api/test-audio-action`.

**Night Swim Album Knowledge**: TRACE has full knowledge of all 7 tracks with their emotional purposes:
- Track 1: Tidal Memory Glow (104 BPM) - nostalgic, warm, for processing memories with hope
- Track 2: Calm Euphoria (102 BPM) - uplifting, for feeling hope after struggle
- Track 3: Ocean Breathing (104 BPM) - ambient, for anxiety → release journey
- Track 4: Neon Promise (104 BPM) - HAS VOCALS, for longing and relationship vulnerability
- Track 5: Slow Tides (80 BPM) - ultra-minimal, for stillness and contemplation
- Track 6: Midnight Underwater (76 BPM) - DEEPEST/SLOWEST, for deep insomnia and overwhelm
- Track 7: Midnight Undertow (100 BPM) - hypnotic groove, for pensive late-night processing

TRACE matches emotional states to specific tracks and speaks about the album with ownership as her creative work, not as a feature.

**Contextual Feature Introduction**: Features are introduced through relationship, not explanation. Rather than UI tours or tooltips, TRACE offers features contextually when users need them (e.g., mentioning patterns after 3-4 journal entries, suggesting Dreamscape when user mentions sleep trouble). This creates discovery through care, not instruction.

### Reliability & Graceful Degradation (January 2026)

**Backend Failure Handling**: When all OpenAI retry layers fail, the backend returns relational TRACE-style fallback messages rather than generic errors. Fallbacks rotate between three responses offering Dreamscape, Breathwork, or Basin activities, maintaining the therapeutic experience even during outages.

**Spotify Fallback System**: The `openSpotifyPlaylist()` utility (`mobile/lib/spotify.ts`) implements a triple safety net: first checks if Spotify app is installed via `canOpenURL`, attempts to open the app URI, and falls back to web player URLs if the app isn't available or fails to open. Playlists are hardcoded as the reliability mechanism ensuring music always works.

**Network Request Timeouts**: All network requests in the mobile app have AbortController timeouts (8-15 seconds) to prevent hanging requests. Activity acknowledgment logs and music config fetches gracefully degrade if requests fail, returning hardcoded fallbacks.

### Journal Memory Integration (January 2026)

**Journal-to-Chat Memory**: When users save journal entries, the system extracts high-level themes (e.g., "relationship with mom", "work stress") and stores them in the `journal_memories` table. These themes are fed into chat context when the user has consented, allowing TRACE to naturally reference past journal entries.

**Consent-Gated References**: Journal memory requires explicit verbal consent tracked in `user_settings.journal_memory_consent`. New journal memories inherit the user's current consent preference. Users can grant/revoke consent through conversation with TRACE, which updates both the persistent setting and all existing memories.

**Hedging Language**: System prompt enforces hedging language when referencing journals: "I remember you wrote about...", "You mentioned something about...", "A while back you shared about...". TRACE never quotes journal content directly - only references themes contextually when relevant.

### Activity Outcomes Learning (January 2026)

**Mood Correlation Patterns**: The `activityOutcomes.js` module correlates activity completions with mood check-ins to identify which activities consistently help users feel better. It analyzes mood ratings within 30 minutes before/after activities over the past 30 days.

**Pattern Detection**: Activities with 3+ completions and positive mood improvement (>0.3 average) are identified as helpful. TRACE can then say things like "I've noticed Walking Reset tends to help you feel a bit lighter..." based on actual data.

**Hedging Language**: Activity outcomes use warm, tentative phrases: "Something about [activity] seems to work for you...", "You often seem a little better after [activity]...". Never quotes statistics or sounds analytical.

### Dreamscape Presence Memory (January 2026)

**Relational History**: The `loadDreamscapeHistory` function in `traceMemory.js` queries the user's most recent Dreamscape session (within 14 days) including which track they chose. This enables TRACE to reference past sessions with genuine presence language.

**Presence Language Examples**:
- "The footsteps track seemed to help last night. Want that again, or something different?"
- "When I was with you two nights ago, you needed something soft. How are you feeling now?"
- "You came to me yesterday. Do you need me again tonight?"

**Context Injection**: Dreamscape history is loaded on each chat request and formatted with relational phrasing. TRACE speaks as if genuinely remembering being present, not tracking data.

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