# هنا / Huna Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement task-by-task.
> Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the existing سَكينة v0.1 React app to a production-ready, offline-capable,
Arabic-first PWA named هنا, deployed on GitHub Pages, with the alert-flow intervention
as its core.

**Architecture:** React 19 + TS + Vite, hash routing. Three portable layers isolated from
React so a future native port is cheap: versioned content JSON, pure `src/core` logic, and
an `AppStorage` interface over Dexie/IndexedDB. UI is the only expected-throwaway layer.

**Tech Stack:** React 19, TypeScript, Vite, react-router (HashRouter), Zustand, Dexie,
Zod, i18next, Lucide, vite-plugin-pwa, Vitest, Testing Library, Playwright, ESLint,
Prettier.

**Spec:** `docs/superpowers/specs/2026-08-17-huna-production-design.md`

## Global Constraints

- Node 20+. All dependencies pinned to exact versions, lockfile committed.
- Arabic is the source of truth for tone; English is a translation. RTL default.
- No `—` character anywhere in source or content (project convention).
- `--danger` token consumed by exactly one component (`DangerAction`). Enforced by test.
- No content string may assert the user is safe. Enforced by denylist test.
- Crisis resources: **Egypt only**. Each carries `lastVerified`; build fails past 365 days.
- Safety lockout window: default **15 minutes**, options 5/10/15/30, disableable.
- No analytics, telemetry, ads, accounts, or network calls at runtime.
- Every `src/core` module is pure: no React, no DOM, no I/O, no `Date.now()` reads
  (time is injected as a parameter so tests are deterministic).
- Minimum tap target 48px for primary controls, 24px absolute floor.
- Text contrast minimum 4.5:1.

---

## Phase 0 — Foundation

**Deliverable:** reproducible build, green CI, error boundary. Defects 1, 2, 3, 14, 22.

### Task 0.1: Repository baseline

**Files:** `.gitignore` (modify), git repo (create)

- [ ] `git init`, verify `.gitignore` covers `node_modules`, `dist`, `.DS_Store`, `*.local`
- [ ] Add `coverage`, `playwright-report`, `test-results`, `.env*` to `.gitignore`
- [ ] Commit the untouched v0.1 tree as the baseline, before any change

### Task 0.2: Pin dependencies

**Files:** `package.json`

- [ ] Move `vite`, `@vitejs/plugin-react`, `typescript` to `devDependencies` (defect 2)
- [ ] Pin every dependency to an exact resolved version, no `latest`, no `^` (defect 1)
- [ ] Runtime deps: `react`, `react-dom`, `react-router`, `zustand`, `dexie`,
      `dexie-react-hooks`, `zod`, `i18next`, `react-i18next`, `lucide-react`
- [ ] Dev deps: `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`,
      `@types/react-dom`, `vitest`, `@vitest/coverage-v8`, `jsdom`,
      `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`,
      `@playwright/test`, `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`,
      `eslint-plugin-react-refresh`, `prettier`, `vite-plugin-pwa`, `fake-indexeddb`
- [ ] Scripts: `dev`, `build`, `preview`, `typecheck`, `lint`, `format`, `test`,
      `test:watch`, `test:coverage`, `e2e`
- [ ] `npm install`, commit `package-lock.json`
- [ ] Verify: `npm run build` succeeds

### Task 0.3: Lint and format

**Files:** `eslint.config.js`, `.prettierrc.json`, `.prettierignore`

- [ ] Flat ESLint config: typescript-eslint recommended, react-hooks, react-refresh
- [ ] Custom rule config banning the `—` character via `no-restricted-syntax` on literals
- [ ] Prettier: single quotes, 110 print width, no trailing comma conflicts with ESLint
- [ ] Verify: `npm run lint` and `npm run format` both clean on the existing tree

### Task 0.4: Test harness

**Files:** `vitest.config.ts`, `src/test/setup.ts`, `playwright.config.ts`

- [ ] Vitest with `jsdom`, globals, `src/test/setup.ts` importing `@testing-library/jest-dom`
      and `fake-indexeddb/auto`
- [ ] Coverage thresholds: 100% for `src/core/**`, 90% for `src/storage/**`
- [ ] Playwright against `npm run preview`, chromium + webkit, base URL honoring the Vite base
- [ ] Write one smoke test per runner to prove wiring
- [ ] Verify: `npm test` and `npm run e2e` both pass

### Task 0.5: Vite config

**Files:** `vite.config.ts`

- [ ] `base: '/huna/'`
- [ ] `build.sourcemap: false` for production (defect 14); keep for dev
- [ ] Verify: `npm run build` emits asset URLs prefixed `/huna/`

### Task 0.6: Error boundary

**Files:** `src/components/ErrorBoundary.tsx`, `src/main.tsx`, test

**Interfaces:**
- Produces: `<ErrorBoundary onExport={() => void}>` class component

- [ ] Test: renders children normally; on a thrown child, renders recovery UI with a
      working "تصدير بياناتي" button and a reload button (defect 11)
- [ ] Implement, wrap `<App/>` in `main.tsx`
- [ ] Verify: test passes; manually throwing in a view shows recovery, not white screen

### Task 0.7: CI

**Files:** `.github/workflows/ci.yml`

- [ ] On PR and push: `npm ci`, typecheck, lint, test, build, e2e
- [ ] Verify: workflow file is valid YAML and the same commands pass locally

---

## Phase 1 — Storage and content

**Deliverable:** existing app on the new foundation with data intact. Defects 4, 8, 9, 10.

### Task 1.1: Content schemas

**Files:** `src/content/schema.ts`, test

**Interfaces:**
- Produces: `uiSchema`, `sequenceSchema`, `sequencesSchema`, `programSchema`,
  `crisisSchema`, and inferred types `Sequence`, `SequenceStep`, `ProgramWeek`,
  `CrisisResource`

```ts
type SequenceStep = {
  id: string;
  text: string;
  kind: 'orient' | 'sense' | 'body' | 'breath' | 'move' | 'thought' | 'action';
  seconds: number;
  substituteFor?: string;   // step id this replaces when breathing is disabled
};
type Sequence = { id: StateId; title: string; steps: SequenceStep[] };
```

- [ ] Tests: valid content parses; missing key fails; a `breath` step without a declared
      substitute fails validation
- [ ] Implement schemas

### Task 1.2: Arabic content

**Files:** `src/content/ar/{ui,sequences,program,crisis}.json`

- [ ] `sequences.json`: all seven states from spec §6.3, each with a substitute for every
      `breath` step
- [ ] `program.json`: the four weeks, ported from `src/data/plan.ts`, tone unchanged
- [ ] `ui.json`: every string currently hardcoded in TSX
- [ ] `crisis.json`: **Egypt only**, each entry with `number`, `source`, `lastVerified`.
      Numbers verified against official sources at authoring time, never written from memory
- [ ] Test: all four files parse against their schemas

### Task 1.3: English content

**Files:** `src/content/en/{ui,sequences,program,crisis}.json`

- [ ] Translate all four files
- [ ] Test: ar/en key parity — every key in one exists in the other, recursively

### Task 1.4: Content guard tests

**Files:** `src/content/content.guard.test.ts`

- [ ] Denylist test: no content string asserts safety (`أنت آمن`, `المكان آمن`,
      `you are safe`, `you're safe`, `it is safe`)
- [ ] Freshness test: no crisis resource `lastVerified` older than 365 days
- [ ] No `—` character in any content file

### Task 1.5: Storage interface and types

**Files:** `src/storage/types.ts`, `src/storage/AppStorage.ts`

**Interfaces:**
- Produces: `AppStorage` interface per spec §16.2, plus record types `DayRecord`,
  `AlertSession`, `SafetyCheck`, `JournalEntry`, `LadderItem`, `LadderSession`,
  `ValueCommitment`, `CopingCard`, `UserPreferences`, `Meta`, `ExportBundle`

```ts
type AlertSession = {
  id: string; startedAt: string; endedAt: string | null;
  safetyAnswer: 'yes' | 'no' | 'unsure';
  stateId: StateId | null; sequenceId: string | null;
  activationBefore: number | null; activationAfter: number | null;
  chosenAction: string | null; actionCompleted: boolean | null;
  whatHelped: string | null; followUpMissed: boolean;
};
```

- [ ] Zod schemas for every record type, exported alongside

### Task 1.6: Dexie implementation

**Files:** `src/storage/indexeddb/db.ts`, `src/storage/indexeddb/IndexedDbStorage.ts`, tests

- [ ] Dexie schema version 1 with the ten tables from spec §16.3
- [ ] Implement every `AppStorage` method
- [ ] **Quota errors surface** rather than being swallowed (defect 4): failed writes reject
      with a typed `StorageQuotaError` the UI renders as a banner
- [ ] Tests against `fake-indexeddb`: round-trip each record type, `deleteAll`,
      `exportAll`/`importAll`, quota error propagation

### Task 1.7: Legacy migration

**Files:** `src/storage/migrations/fromSakinaV1.ts`, test

**Interfaces:**
- Produces: `migrateFromSakinaV1(raw: string | null, storage: AppStorage): Promise<MigrationResult>`

- [ ] Zod schema for the legacy `sakina.app-state.v1` shape
- [ ] Map the six `CoreTaskId` values directly; `journal` entries map field for field
- [ ] **Never delete the legacy key**; record `meta.migratedFrom` so it runs once
- [ ] Tests: realistic blob, empty blob, corrupt blob, already-migrated (no-op)

### Task 1.8: Storage React binding

**Files:** `src/storage/StorageProvider.tsx`, `src/storage/useStorage.ts`, `src/storage/hooks.ts`

- [ ] Context providing the `AppStorage` instance so tests can inject a fake
- [ ] `useLiveQuery`-based hooks for reactive reads; this also fixes cross-tab clobbering
      (defect 9) since IndexedDB writes are observed, not overwritten
- [ ] Debounced write helper for free-text fields (defect 10), 400ms trailing

### Task 1.9: i18n

**Files:** `src/i18n/index.ts`, `src/i18n/useDirection.ts`

- [ ] i18next with `ar` default, `en` fallback, resources from `src/content`
- [ ] `useDirection()` sets `document.documentElement.lang` and `dir`
- [ ] Test: switching locale flips `dir` and resolves a known key in both

### Task 1.10: Import validation

**Files:** `src/storage/importBundle.ts`, test

- [ ] Replace the shallow `version === 1` check (defect 8) with full Zod validation of the
      export bundle, returning a typed result with per-table counts and per-record errors
- [ ] Tests: valid bundle, wrong version, malformed table, partially valid bundle

---

## Phase 2 — The alert flow

**Deliverable:** the core intervention is usable. Defects 5, 6. **Program can start here.**

### Task 2.1: `src/core/safety-window.ts`

**Interfaces:**
- Produces: `isWithinLockout(lastCheck: SafetyCheck | null, now: Date, windowMinutes: number): boolean`,
  `minutesSince(check: SafetyCheck, now: Date): number`

- [ ] Tests: no prior check, inside window, exactly at boundary, outside window,
      window disabled (0), DST transition, midnight crossing
- [ ] Implement. Time is a parameter, never read from the clock inside.

### Task 2.2: `src/core/alert-flow.ts`

**Interfaces:**
- Produces: `type AlertStep`, `type AlertFlowState`, `alertFlowReducer(state, event)`,
  `initialAlertFlow()`, `nextRoute(state): string`, `resumeFrom(session): AlertFlowState`

- [ ] Tests: every transition in spec §6; `yes` and `unsure` both route to danger;
      `no` writes a seal and advances; refresh-mid-flow resumes at the correct step;
      back navigation never loses the safety answer; a session can be abandoned and a new
      one started cleanly
- [ ] Implement as a pure reducer

### Task 2.3: `src/core/exercise-selector.ts`

**Interfaces:**
- Produces: `selectSequence(stateId: StateId, sequences: Sequence[], prefs: UserPreferences): Sequence`

- [ ] Tests: each of the seven states returns its sequence; with `breathingEnabled: false`
      every `breath` step is replaced by its declared substitute across **all seven**
      sequences; `detached` never contains a breath step even when breathing is enabled
- [ ] Implement

### Task 2.4: `src/core/recovery-metrics.ts`

**Interfaces:**
- Produces: `returnToLifeRate(sessions): { rate: number | null; answered: number }`,
  `medianRecoveryMinutes(sessions)`, `repeatCheckTrend(checks, days)`,
  `sessionsUnderTwoMinutes(sessions)`

- [ ] Tests: empty set returns null; missed follow-ups excluded from the denominator, not
      counted as failures; fewer than five answered sessions returns `null` rate;
      median with even and odd counts; single record
- [ ] Implement

### Task 2.5: `src/core/program.ts`

**Interfaces:**
- Produces: `suggestedWeek(startedAt: string, now: Date): 1|2|3|4`, `isOverridden(prefs)`

- [ ] Tests: day 1 → week 1; day 7 → week 1; day 8 → week 2; day 29+ → week 4;
      manual override wins; future `startedAt` clamps to week 1
- [ ] Implement

### Task 2.6: Routing shell

**Files:** `src/routes/index.tsx`, `src/App.tsx` (rewrite)

- [ ] HashRouter with every route from spec §5.1
- [ ] Fixes defect 18: routing owns the hash, no effect writes it on mount
- [ ] Test: each route renders its screen; unknown hash falls back to Home

### Task 2.7: ID and date utilities

**Files:** `src/lib/id.ts`, `src/lib/date.ts`, tests

- [ ] `createId()` uses `crypto.randomUUID` when available and falls back to a
      `getRandomValues` implementation otherwise (defect 5)
- [ ] `useToday()` hook re-computes across midnight via a timer to the next local midnight
      (defect 6)
- [ ] Tests: id uniqueness and fallback path; midnight rollover with faked timers

### Task 2.8: Alert screens

**Files:** `src/routes/alert/{Safety,Danger,State,Sequence,Action,Done}.tsx`

- [ ] Safety: three-way, no illustration, plain and serious
- [ ] Danger: the five options from spec §6.1, tap-to-call, **never auto-dial**, crisis
      resources, coping card link
- [ ] State: seven cards with level-2 illustrations
- [ ] Sequence: one instruction per screen, "الخطوة 2 من 5", no decoration
- [ ] Action: presets, custom field, optional timer, "لا شيء الآن" allowed
- [ ] Done: quiet completion, exits
- [ ] Tests: full keyboard operation; seal shown on re-entry inside the lockout with both
      choices; refresh mid-flow resumes

### Task 2.9: Follow-up prompt

**Files:** `src/features/followUp/FollowUpPrompt.tsx`, `src/core/followUp.ts`, tests

**Interfaces:**
- Produces: `pendingFollowUp(sessions, now): AlertSession | null`

- [ ] Tests: shown on next open between 5 and 60 minutes after session end; not shown
      before 5; marked `followUpMissed` and never shown after 60; never shown twice

### Task 2.10: Onboarding

**Files:** `src/routes/Onboarding.tsx`, tests

- [ ] All preferences from spec §7, skippable and resumable
- [ ] `reducedMotion` pre-filled from `prefers-reduced-motion` (defect 19)
- [ ] Breathing question drives the substitution in Task 2.3
- [ ] Test: choosing "breathing makes it worse" hides the breathing tool everywhere

---

## Phase 3 — Design system

**Deliverable:** visual identity complete. Defects 15, 16, 17, 19, 20.

### Task 3.1: Tokens

**Files:** `src/design-system/tokens.css`, `typography.css`, `motion.css`, contrast test

- [ ] Both palettes from spec §15.1 as custom properties
- [ ] Light default on `:root`; dark under `@media (prefers-color-scheme: dark)` guarded
      by `:root:not([data-theme='light'])`, and again under `:root[data-theme='dark']`
- [ ] Test: computed contrast for every documented token pair meets its stated ratio

### Task 3.2: Danger token isolation

**Files:** `src/components/DangerAction.tsx`, `src/design-system/danger.guard.test.ts`

- [ ] Test greps `src/**` and asserts `--danger` appears only in `tokens.css` and
      `DangerAction.tsx`
- [ ] Migrate any existing danger styling into the component

### Task 3.3: Icon layers

**Files:** `src/components/icons/*`, delete `src/components/Icon.tsx`

- [ ] Lucide for all level-1 functional icons, 24px, 1.75px stroke, rounded caps/joins
- [ ] Keep only the brand mark as bespoke SVG
- [ ] Level-2 Jot illustrations for the seven state cards, as inline SVG components
      accepting `size`, `stroke`, `accent`
- [ ] Test: no component imports both Lucide and a bespoke functional icon

### Task 3.4: Split the stylesheet

**Files:** `src/styles.css` → per-view files

- [ ] Split 3,594 lines by view; each component imports its own
- [ ] Convert physical properties to logical (`margin-inline-start` etc.) so LTR is a
      `dir` flip, not a second stylesheet
- [ ] Verify: visual parity by Playwright screenshot comparison before and after

### Task 3.5: Motion and reduced motion

- [ ] Remove pulsing, floating, parallax per spec §15.3
- [ ] Under reduced motion the breathing orb becomes numeric plus a linear bar
- [ ] Test: with `prefers-reduced-motion: reduce`, no element has a transition over 0ms

### Task 3.6: Discreet mode

**Files:** `src/features/discreet/*`

- [ ] Text only, neutral surface, no accents, no illustrations, no audio, one-tap exit
- [ ] Larger targets
- [ ] Test: in discreet mode no level-2 or level-3 illustration renders

### Task 3.7: Remaining UI defects

- [ ] Streak reframed (defect 15) per spec §11
- [ ] Charts paired with an accessible data table (defect 16)
- [ ] Nav drawer focus trap and Escape (defect 17)
- [ ] Single date-parsing helper used everywhere (defect 20)
- [ ] Export revokes the object URL after the download settles (defect 21)
- [ ] 48px minimum on all primary controls
- [ ] Tests for each

---

## Phase 4 — PWA and deployment

**Deliverable:** installed on the phone, works offline. Defects 12, 13.

### Task 4.1: Icons

**Files:** `public/icons/*`

- [ ] Generate PNG 192, 512, a dedicated maskable variant with correct safe area, and
      `apple-touch-icon.png` 180 (defect 13)
- [ ] Update `index.html` and the manifest

### Task 4.2: Manifest

**Files:** `public/manifest.webmanifest`

- [ ] Rename to هنا, add `id` and `scope`, base-relative `start_url`
- [ ] `shortcuts` entry pointing at `#/alert` (honored on Android, ignored on iOS)

### Task 4.3: Service worker

**Files:** `vite.config.ts`

- [ ] `vite-plugin-pwa` precaching the shell and **all content JSON**, so the alert flow
      works with no signal (defect 12)
- [ ] Update prompt rather than silent reload
- [ ] E2E: load offline with the network disabled, complete a full alert flow

### Task 4.4: Deploy

**Files:** `.github/workflows/deploy.yml`

- [ ] `configure-pages`, `upload-pages-artifact`, `deploy-pages` on main
- [ ] Create the public GitHub repo `omar-hanafy/huna`, push, enable Pages
- [ ] Verify the deployed URL serves correctly under `/huna/`

### Task 4.5: Quick access documentation

**Files:** `README.md`

- [ ] Document the iOS Shortcut bound to Back Tap or the Action Button opening `#/alert`

---

## Phase 5 — Program features

**Deliverable:** feature-complete.

### Task 5.1: Life Ladder — items and sessions
### Task 5.2: Life Ladder — SUDs capture at 0/5/10/15/20 and the habituation chart
### Task 5.3: Coping card, including "ما الذي لا يساعدني", printable
### Task 5.4: Journal rewritten to neutral language, plus the safety-behavior counter
### Task 5.5: Busy-day mode
### Task 5.6: Values and daily micro-commitments
### Task 5.7: Progress screen, opt-in, with the insight rules and their guard test

Each carries its own tests. Detailed steps written at the start of Phase 5, once
Phases 1 and 2 have settled the storage and content shapes.

---

## Phase 6 — Polish

### Task 6.1: Accessibility audit against spec §19
### Task 6.2: Full E2E suite per spec §20
### Task 6.3: README and `PROJECT_ROADMAP.md` rewritten for هنا
### Task 6.4: Rename the working directory to `huna`
### Task 6.5: Performance pass, bundle budget

---

## Progress log

Decisions and deviations are appended to `docs/superpowers/plans/DECISIONS.md`
as work proceeds.
