# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `mobile/` directory:

```bash
npx expo start          # Start dev server (scan QR to open on device)
npx expo start --ios    # Run on iOS simulator
npx expo start --android # Run on Android emulator
npx expo lint           # Lint with ESLint
```

There are no automated tests configured in this project.

## Architecture

**Lumen** is a React Native (Expo) mobile learning app for PT/EN/ES markets. Core loop: Lesson → Cards → Quiz → Summary (5–15 min sessions). Premium tier unlocks AI-generated content.

### Stack
- **React Native 0.81.5 + Expo 54** with Expo Router (file-based routing)
- **Firebase**: anonymous auth, Firestore, Storage (content packs), Cloud Functions
- **NativeWind 4** (Tailwind CSS for RN) + Gluestack UI component library
- **i18next** for PT/EN/ES internationalization

### Layer Structure

```
services/       Firebase SDK wrappers (auth, firestore, storage, functions)
repositories/   Data access layer — combines services + local cache, no React
hooks/          React wrappers around repositories (useAuth, usePack, useUser, etc.)
app/            Expo Router routes — UI only, consumes hooks
components/     Reusable UI; components/ui/lumen/ for custom Lumen primitives
models/         TypeScript types (Pack, UserProfile, DailySessionMeta, etc.)
```

UI components must not import from `services/` or `repositories/` directly — only through hooks.

### Routing Groups

- `app/(onboarding)/` — linear onboarding: welcome → language → goals → daily-time
- `app/(tabs)/` — main tab nav: home, tracks, library, profile
- `app/(session)/` — session flow: lesson → cards → quiz → summary

### Content Loading Flow

1. `usePack(contentId, version, lang)` is called from session screens
2. `packs.repo.ts` checks local file-system cache (`expo-file-system`, key: `pack:{id}:v{version}:{lang}`)
3. On cache miss, downloads from Firebase Storage at `packs/{contentId}/v{version}/{lang}.json`
4. Cached for offline access

### Firestore Structure

Public: `tracks`, `lessons`, `daily_sessions`
Private per user: `users/{uid}`, `users/{uid}/progress_*`, `users/{uid}/daily_sessions/{date}`

Anonymous auth is created on first boot via `ensureAnonymousAuth()` in `auth.service.ts`.

### Styling

Uses NativeWind (Tailwind) with a custom design token system. Colors follow the pattern `primary-*`, `secondary-*`, `tertiary-*`, etc., defined in `tailwind.config.js` and `constants/theme.ts`. Use `cn()` from `lib/cn.ts` to merge class names.

### i18n

Translation keys follow dot-notation: `"tabs.home.title"`, `"onboarding.welcome.start"`. Locale files are in `i18n/locales/{en,es,pt}.json`.
