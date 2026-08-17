# Decision log

Non-trivial decisions and assumptions made while implementing
`2026-08-17-huna-implementation.md`. Newest last.

---

## D1 - Lockout window default: 15 minutes, configurable

**Context:** Spec §23 Q2 left open; user delegated the call.
**Decision:** Default 15 minutes. Options 5 / 10 / 15 / 30. Disableable entirely.
**Why:** Urge waves typically peak and subside inside 10 to 20 minutes, so 15 sits in the
middle of the useful range. Configurable because checking rhythm varies per person, and
disableable because principle §2.4 forbids the app blocking the user.

## D2 - Crisis resources: Egypt only

**Context:** Spec §23 Q1, answered by user.
**Decision:** Egypt only. `crisis.json` carries one country block. The country selector in
onboarding still exists but offers Egypt plus "أخرى", where "أخرى" shows generic guidance.
**Why:** Numbers must be verified, and only Egypt was requested. The selector stays so
adding a country later is content, not code.

## D3 - Plan granularity deviates from the writing-plans skill

**Context:** Skill requires literal code in every step.
**Decision:** Task-level plans with exact paths, exact interface signatures, and exact test
cases, but not full implementation bodies.
**Why:** A literal-code plan for a seven-phase rebuild would exceed the size of the
codebase and would be invalidated as earlier phases settle the shapes. Interfaces and test
cases are the parts that actually need pinning down in advance.

## D4 - Inline execution, not subagent-driven

**Context:** Skill recommends dispatching a subagent per task.
**Decision:** Execute inline in this session.
**Why:** Session instructions prohibit calling the Agent tool unless the user requests it.
The user requested autonomous work, not delegated work.

## D5 - TypeScript 6.0.3 rather than 7.0.2

**Context:** TS 7 is the current `latest`, but typescript-eslint 8.67 peer-caps at `<6.1.0`.
**Decision:** Pin TypeScript 6.0.3.
**Why:** Type-aware linting catches a class of bug the compiler alone does not, and running the
newest compiler with a lint toolchain that cannot parse it is a downgrade, not an upgrade.
Revisit when typescript-eslint ships TS 7 support.

## D6 - Breath substitutes are declared inline in content, not resolved at runtime

**Context:** The plan sketched a `substituteFor` pointer between steps.
**Decision:** Each breath step carries a nested `substitute` object, and the schema refuses a
breath step that lacks one.
**Why:** The guarantee becomes structural. There is no lookup that can fail and no step that can
be silently dropped, so "breathing makes it worse" cannot degrade into a shorter sequence.

## D7 - Return-to-life rate counts full completion only

**Context:** The follow-up records yes / partly / no.
**Decision:** The headline rate counts `yes`. `partly` is reported alongside it, not folded in.
**Why:** A single number should mean one thing. Partial completion is still reported, so nothing
is hidden, but blending it would make the rate uninterpretable.

## D8 - Missed follow-ups and declined actions leave the denominator

**Context:** Both could plausibly count as failures.
**Decision:** A missed follow-up is excluded as missing data. "Nothing right now" is excluded as
an honest answer. Both are reported as their own counts.
**Why:** Counting either as failure would turn ordinary life, or an honest response, into evidence
of getting worse. That is exactly the guilt mechanic the product forbids.

## D9 - Reads never write; initialisation is explicit

**Context:** `getPreferences`, `getMeta` and `getCopingCard` originally persisted their defaults on
first read. Under `useLive` this threw `ReadOnlyError: Readwrite transaction in liveQuery context`.
**Decision:** Getters are pure reads returning defaults. `AppStorage.initialise()` writes the
first-run singletons once, at boot, and is idempotent.
**Why:** A real bug, not a test artifact: it would have thrown in the browser the moment any
component subscribed. Regression tests assert the getters leave the store untouched.

## D10 - localStorage is polyfilled in the test setup

**Context:** Node 26 exposes an experimental `localStorage` global that shadows jsdom's and is
unavailable without `--localstorage-file`.
**Decision:** Install a small in-memory `Storage` on `window` in `src/test/setup.ts`.
**Why:** Keeps tests deterministic and independent of a node flag. Browsers are unaffected.

## D11 - noUncheckedIndexedAccess is on

**Context:** Enabling it surfaced unsafe date destructuring in `utils.ts` and unguarded array
lookups in `TodayView` and `GroundingTool`.
**Decision:** Keep it on and fix the call sites.
**Why:** This codebase is full of keyed lookups (`days[date]`, `PLAN_WEEKS[week - 1]`). The flag
turns a class of runtime crash into a compile error, which matters more here than convenience.

## D12 - The سَكينة view layer was deleted, not migrated

**Context:** The plan kept the old views working while the new ones were built.
**Decision:** Delete `App.tsx`, `styles.css` (3,594 lines), `types.ts`, `utils.ts`,
`usePersistentState` and all thirteen legacy view components once their replacements landed.
**Why:** Keeping them would have meant maintaining two design systems and two data paths, and
`styles.css` was the last consumer of the danger token outside `DangerAction`. Both
self-cleaning guard tests fired on the deletion, which is what they were for.

## D13 - Tab bar instead of a drawer

**Context:** Defect 17 was a nav drawer with no focus trap and no Escape handling.
**Decision:** Replace the drawer with a tab bar.
**Why:** Removing the overlay removes the whole class of problem rather than patching two
symptoms, and a tab bar is better for one-handed use, which is the actual usage posture here.

## D14 - Time is never read during render

**Context:** React's purity rule flagged one `Date.now()` in Progress.
**Decision:** Introduce `useNow`, and route every render-time clock read through it.
**Why:** The lint was the symptom. The real defect was that "you checked N minutes ago" and the
follow-up window were frozen at whatever moment the component last happened to re-render.
`useNow` also re-reads on focus, since a phone waking from sleep will not have run the interval.

## D15 - Settings controls update optimistically

**Context:** Controls read through a Dexie liveQuery, so a toggle sat still until the write
round-tripped.
**Decision:** Overlay the pending change during render, and let each key stop overriding once the
stored value agrees with it.
**Why:** A switch that does not move when pressed reads as broken. Deriving the overlay rather
than clearing it in an effect avoids a cascading render, and lets a change made in another tab
still show through instead of being masked.

## D16 - WebKit keyboard tests are skipped, not weakened

**Context:** Safari only tabs between form fields unless full keyboard access is enabled.
**Decision:** Assert the focus ring on a text field in every engine, and check the button case on
Chromium only, with an explicit skip reason.
**Why:** Loosening the assertion to make it pass everywhere would have tested nothing. The skip
records a real platform behaviour rather than hiding a gap.

## D17 - A check stamped slightly ahead of the render clock counts as just now

**Context:** `useNow` samples the clock on a tick, so a check recorded a second ago can carry a
timestamp later than the snapshot it is compared against. `lockoutState` rejected any check dated
after `now`, so the seal stayed hidden for up to a full tick immediately after the user checked.
**Decision:** Treat a check up to five minutes ahead as having just happened; beyond that, keep
the original guard and stay inactive.
**Why:** The guard was written for a clock or timezone change producing a wildly future
timestamp, and that case still behaves as before. A check two seconds ahead is not that. Found by
an e2e test that first looked flaky and turned out to be reporting a real gap.
