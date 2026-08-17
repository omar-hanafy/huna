# Sakina — Suggested Product Roadmap

## Phase 1 — Local-first MVP

- Keep all records on-device.
- Add IndexedDB and schema migrations.
- Add PWA installation and offline support.
- Add unit tests for statistics, streaks, and migrations.
- Add E2E coverage for the three interactive exercises.

## Phase 2 — Personalization

- Custom routines and exercise durations.
- User-defined values and graded activity ladder.
- Optional caffeine, sleep-quality, and context tags.
- Weekly reflection generated from deterministic rules, not medical diagnosis.
- Arabic and English i18n dictionaries.

## Phase 3 — Consent-based sync

- End-to-end encrypted sync.
- Passkey or privacy-preserving authentication.
- Fine-grained export and deletion controls.
- Explicit opt-in sharing with a therapist or coach.
- Audit log showing when data was viewed or changed.

## Phase 4 — Professional companion mode

- Therapist-created plans with user approval.
- Session notes kept separate from self-tracking records.
- Crisis resources configured by country and verified regularly.
- Clinical and legal review before any health-related recommendation engine.

## Suggested technical stack

- React + TypeScript + Vite.
- TanStack Router when real routes are needed.
- Zustand or Redux Toolkit if state complexity grows.
- Dexie for IndexedDB and migrations.
- Zod for import/API validation.
- React Hook Form for larger forms.
- Vitest + Testing Library + Playwright.
- i18next for localization.

## Important product principle

Optimize for agency, privacy, and gentle consistency. Do not optimize for streak anxiety, endless engagement, or diagnostic certainty.
