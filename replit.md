# Overview

TRACE is a mental wellness and emotional support application built with React and Vite. The app provides a calm, grounded companion experience through interactive activities, AI-powered conversations, journaling, pattern tracking, and mindfulness exercises. It features an iPhone 15 Pro-inspired aesthetic with a focus on creating a safe, non-judgmental space for users to slow down, reflect, and find emotional clarity.

The application combines real-time AI chat capabilities, interactive mini-games (maze, breathing exercises, grounding techniques), a comprehensive journaling system with calendar views, and emotional pattern recognition to help users understand their mental and emotional rhythms.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

**Framework & Tooling**
- React 18 with TypeScript for type-safe component development
- Vite as the build tool and development server
- Motion (Framer Motion) for fluid animations and transitions
- Tailwind CSS v4 for utility-first styling with custom design tokens

**Component Structure**
- Screen-based architecture with dedicated components for each major feature (Chat, Activities, Journal, Patterns, Profile, etc.)
- Shared UI components (BottomNav, modals) for consistent navigation and interactions
- Separation of concerns with utility components (audio players, tone generators) isolated from business logic

**State Management**
- React Context API for global state management across three domains:
  - **UserProvider (PlanContext)**: Manages user profile, subscription plans, payment status, and app preferences (ambience settings)
  - **EntriesProvider (EntriesContext)**: Centralized storage for all user-generated content including sessions, journal entries, AI reflections, check-ins, and pattern-linked entries
  - **ThemeProvider (ThemeContext)**: Handles application theming preferences
- Local component state using React hooks for UI interactions and temporary data
- localStorage synchronization for data persistence across browser sessions

**Routing & Navigation**
- Single-page application with state-based screen switching managed in App.tsx
- Bottom navigation bar provides primary navigation to Chat, Activities, Journal, Entries, and Profile screens
- Modal overlays and stacked screens for secondary flows (onboarding, payments, settings)

## Audio & Sensory Design

**Web Audio API Integration**
- Custom tone generators for each activity type (breathing, grounding, maze focus, power nap)
- Procedurally generated ambient soundscapes using oscillators, filters, and LFOs
- Ambient audio player with fade-in/fade-out capabilities and playback rate control
- Screen-specific audio profiles that pause/resume based on navigation context

**Design Rationale**: Real-time audio synthesis was chosen over pre-recorded samples to create dynamic, never-repeating soundscapes that maintain freshness across sessions and reduce file size dependencies.

## AI Integration

**Chat System**
- Backend Express server acts as a proxy to OpenAI API
- TRACE AI personality defined through carefully crafted system prompts emphasizing calm, grounded, emotionally intelligent responses
- Conversation history maintained client-side for context awareness
- Activity suggestion detection and auto-navigation to recommended exercises
- Fallback responses when OpenAI API is unavailable

**Design Rationale**: Server-side proxy protects API keys and allows for message filtering, rate limiting, and custom response formatting without exposing credentials to the client.

## Interactive Activities

**Maze Mini-Game**
- Procedural maze generation using recursive backtracking algorithm
- SVG-based rendering with touch and mouse input support
- Path validation with haptic-like feedback for off-path detection
- Forward-only progress enforcement with smooth orb following

**Breathing Exercise**
- Timed breathing cycles (4-count in, hold, 4-count out)
- Synchronized visual animations and audio cues
- Procedurally generated breath sounds using pink noise

**5-4-3-2-1 Grounding**
- Step-by-step guided sensory awareness exercise
- Progressive disclosure with smooth transitions between steps
- Calming ambient tones synchronized to user progression

**Other Activities**: Power Nap (5-minute timer with gentle wake alarm), Pearl Ripple (1-minute ocean wave immersion), Walking Reset

**Design Rationale**: Activities are designed to be short (45 seconds to 5 minutes) to reduce commitment anxiety and increase completion rates. Each activity auto-saves to the Entries system upon completion.

## Journal & Entries System

**Entry Data Model**
- Unified `Entry` interface supporting five types: `session`, `emotional_note`, `ai_reflection`, `check_in`, `pattern`
- Timestamped entries with metadata (source screen, activity duration, mood tags)
- Calendar-based visualization showing mood distribution across days
- AI-generated daily reflections summarizing user's activities and emotional state

**Storage Strategy**
- In-memory React context with localStorage persistence
- Entry CRUD operations exposed through `EntriesContext` hooks
- Automatic cleanup on account deletion (planned feature)

**Design Rationale**: A single unified entry model simplifies data management and enables cross-feature insights (e.g., correlating activities with mood patterns).

## Patterns Feature

**Pattern Recognition**
- Three primary pattern types: Peak Window (focus hours), Energy Tides (weekly rhythms), Stress Echoes (recurring triggers)
- Each pattern includes insights, time windows, suggested actions, and tags
- Visual rhythm map showing weekly emotional cadence
- Behavior signatures identifying recurring emotional/behavioral themes

**Implementation**: Currently uses static seed data. Future iterations will analyze actual user entries to generate personalized patterns.

## Authentication & Subscription Management

**User Accounts**
- Email/password authentication with Face ID placeholder
- Onboarding flow with plan selection (Light/Free, Premium, Studio)
- Account setup screen with plan display and change capabilities

**Subscription Plans**
- Three tiers with different feature access levels
- Plan selection persists through user profile in context
- Payment flow with Stripe-ready integration (currently mock implementation)
- Referral code system for promotional access

**Design Rationale**: Plan context is managed globally to ensure consistent display across all screens and enable feature gating for future premium capabilities.

## Design System

**Theme System**
- **Day Mode (Sage Palette)**: Soft sage greens with warm earth tones - `--day-bg: #F5F1EB`, subtle radial gradient overlays with light noise texture (1.5% opacity)
- **Night Mode (Luxury Desert Sand)**: Deep olive-charcoal backgrounds (`#0E0F0D`) with pearlescent desert sand undertones, moving grain shimmer animation (90s duration), and sand-drift animation (60s duration) for subtle movement
- Theme applied at App root level via `.day-texture` and `.night-texture` classes with pseudo-element overlays using negative z-index (-2, -1) with `isolation: isolate`
- Individual screens use transparent backgrounds to inherit from root theme container
- Toggle accessible in Profile screen settings

**Visual Language**
- Soft, organic gradients using sage, pearl, cream, and muted earth tones
- Subtle grain textures and vignette overlays for depth
- Rounded corners (16px-32px) and soft shadows throughout
- Liquid light animations using SVG paths for ethereal, calming effects

**Typography**
- SF Pro Text and SF Pro Display for iOS-native feel
- Hierarchical type scale with careful weight and spacing
- Minimal text density to reduce cognitive load

**Interaction Patterns**
- Gentle spring-based animations for state transitions
- Touch-friendly hit targets (minimum 44x44px)
- Clear visual feedback for all interactive elements
- Progressive disclosure to avoid overwhelming users

# External Dependencies

## Third-Party Services

**OpenAI API**
- Used for TRACE AI chat completions
- Accessed via backend Express server proxy
- Environment variables: `AI_INTEGRATIONS_OPENAI_API_KEY`, `AI_INTEGRATIONS_OPENAI_BASE_URL`
- Fallback behavior when API unavailable

**Planned Integrations**
- **Supabase**: Backend database for user data persistence, authentication, and real-time sync (currently mocked with localStorage)
- **Stripe**: Payment processing for subscription management (currently mocked)

## UI Component Libraries

- **Radix UI**: Comprehensive set of unstyled, accessible component primitives (accordion, dialog, dropdown, popover, select, tabs, etc.)
- **Lucide React**: Icon system for consistent, minimalist iconography
- **class-variance-authority**: Type-safe component variant management
- **cmdk**: Command palette component
- **embla-carousel-react**: Carousel/slider functionality
- **react-day-picker**: Calendar date selection
- **react-hook-form**: Form state management and validation
- **recharts**: Data visualization for patterns and insights

## Development Tools

- **Drizzle ORM**: Type-safe database queries (currently unused, planned for backend integration)
- **Express**: Node.js server for AI proxy and future API endpoints
- **Passport**: Authentication middleware (planned for Supabase integration)
- **express-session** + **connect-pg-simple**: Session management with PostgreSQL store

## Audio & Media

- **Web Audio API**: Browser-native audio synthesis (no external dependencies)
- **Custom audio generation**: Procedural tone synthesis using oscillators, filters, and gain nodes

## Storage

- **localStorage**: Client-side persistence for entries and user preferences
- **PostgreSQL** (planned): Server-side relational database via Drizzle ORM
- **pg**: PostgreSQL client library for Node.js