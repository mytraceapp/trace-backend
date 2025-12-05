# Beta - Mental Wellness App

## Overview
Beta is a mental wellness and self-care mobile app prototype designed to provide calming activities and tools for emotional well-being. Built with React and Vite, it aims to offer a beautiful and functional prototype experience, incorporating various features like an AI companion, guided exercises, interactive mindfulness activities, journaling, and emotional pattern tracking. The project envisions a future with robust backend integration for user profiles, subscriptions, and AI services.

## User Preferences
(To be updated based on user feedback)

## System Architecture

### Tech Stack
- React 18 with TypeScript
- Vite for bundling
- Tailwind CSS v4
- Radix UI components
- Lucide React icons
- Motion for animations

### Core Features
- **Patterns Feature**: Tracks emotional patterns across categories like "peakWindow", "energyTides", and "stressEchoes". It includes a data model for patterns with insights and actions, and implements a plan tier gating system (`"free"`, `"light"`, `"deep"`) to manage access to content.
- **Entries System**: A centralized store for all user-generated content, including `session` (activity completions), `emotional_note`, `ai_reflection`, `check_in`, and `pattern`-linked entries. Entries are persistent via `localStorage`.
- **User State Management**: Utilizes a global context (`UserProvider`) to manage `UserProfile` information (name, email, plan, `hasPaid`, referral code). It supports `PlanTier` types ('light', 'premium', 'studio') and handles plan selection, account setup, and payment status.
- **Interactive Maze**: A dynamically generated maze mini-game using a recursive backtracking algorithm. Features an interactive orb that follows user input, enforces forward-only progress, and provides off-path feedback.
- **Journal Calendar**: An interactive calendar for the Journal screen that displays entries and allows month navigation. Features a comprehensive AI daily reflection that observes user's activities, journal moods, and patterns to generate a supportive paragraph with friendly encouragement. Auto-generates on screen mount with refresh capability. Supports adding new entries with mood selection (Calm, Okay, Heavy, Overwhelmed).
- **Plan Management Popups**: Includes features for managing subscriptions (upgrade/cancel), applying referral codes (granting premium access), and generating unique referral codes for shared benefits.

### UI/UX Decisions
- Design follows an iPhone 15 Pro-style aesthetic.
- Interactive elements like the glowing orb in the maze and pulsing dots in the calendar enhance user engagement.
- Modals for "About TRACE" and "Safety Commitment" provide essential information and maintain a consistent design.

## External Dependencies
The current prototype does not explicitly integrate with external services beyond the front-end development tools. Future plans anticipate integration with:
- **Supabase**: For backend user data and plan management.
- **Stripe**: For handling subscriptions and payments.