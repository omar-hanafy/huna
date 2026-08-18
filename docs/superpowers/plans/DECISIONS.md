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

## D18 - A refresh resumes from the exercise, not from the safety answer

**Context:** `resumeFrom` checked the stored safety answer before the chosen state, so someone who
answered "not sure", pressed "I'm safe now", and started an exercise was thrown back onto the red
danger screen by a refresh, losing their place in the sequence.
**Decision:** Order the derivation by how far the session got: a chosen state means grounding
began, and grounding is where the refresh lands whatever the safety answer was. Persist
`stepIndex` on the session so it resumes on the same step rather than at step one.
**Why:** The session record is the evidence of what actually happened. Reading the earliest field
first meant reading the least recent fact first, which is precisely backwards for a resume.

## D19 - An abandoned session stops being resumable after six hours

**Context:** Any session left open resumed on the next launch, however old.
**Decision:** `isResumable` accepts an open session younger than `RESUME_WINDOW_HOURS` (6);
anything older starts fresh. The stale record keeps its null `endedAt`.
**Why:** An episode is minutes long, but the danger screen tells the user to leave and reach
safety, which can legitimately take a while, so the window is generous rather than tight. Beyond
it, resuming would restore a stale activation reading and stretch one recorded session across
days. Writing an `endedAt` the app never witnessed would be inventing data instead of admitting
the session was abandoned.

## D20 - "Try a different exercise" returns to the picker

**Context:** The button dispatched `CHOOSE_STATE 'unsure'`, which from inside the generic sequence
was a no-op: a dead button, mid-episode.
**Decision:** Add a `CHANGE_EXERCISE` event that clears the chosen state and returns to the state
picker.
**Why:** The honest answer to "this one is not comfortable" is to offer the choice again rather
than to substitute one fixed alternative. Clearing the state also keeps a reload honest: it
resumes at the picker rather than back inside the exercise the user just rejected.

## D21 - Debounced writes are keyed by field

**Context:** `useDebouncedWrite` held a single pending mutation. Typing sleep hours and then a note
within the debounce window discarded the sleep write entirely. Reproduced live: the day record
kept the note and lost both numbers.
**Decision:** Key the pending map by field, flush all of it on the trailing edge, and flush on
`pagehide`, on `visibilitychange` to hidden, and on unmount.
**Why:** This was silent data loss in the one screen that promises "saved automatically". Keying
by field is the smallest change that makes the promise true; the extra flush points cover closing
the PWA and fast navigations.

## D22 - Day patches can be functions of the stored record

**Context:** Toggling a task built the new `tasks` map from the copy React rendered, so two taps in
quick succession, or a second tab, could write a stale map back.
**Decision:** `updateDay(date, patch)` also accepts `(current) => patch`, applied inside the same
transaction as the write. Auto-created day records now carry the week the program is actually on
rather than defaulting to week one.
**Why:** Read-modify-write belongs inside the transaction. The alternative, threading fresh reads
through every caller, is the same work done less reliably in more places.

## D23 - Erasing keeps the migration marker, and the legacy key is never deleted

**Context:** `deleteAll` cleared the meta table. The سَكينة v1 localStorage key is deliberately
never deleted, so the next launch re-imported the journal the user had just asked to destroy.
**Decision:** `deleteAll` re-writes the meta record with its `migratedFrom` marker intact.
**Why:** The marker is the only thing standing between "erase everything" and a resurrection. The
alternative, deleting the legacy key, destroys the copy that lets a user recover if the migration
went wrong.

## D24 - A backup with out-of-range numbers is repaired, not rejected

**Context:** Builds before the input clamps could store 900 hours of sleep. The strict export
schema then refused the user's own backup, so an erase became unrecoverable.
**Decision:** On a failed parse, clamp the known numeric fields on a copy and try once more; a raw
سَكينة v1 blob is recognised and merged rather than replacing the store. Structural corruption
still fails.
**Why:** Refusing a file for a number that the app itself wrote is the worst possible moment to be
strict. Clamping repairs the fields that a person cannot repair by hand, and merging the legacy
blob avoids trading real data for a partial restore.

## D25 - One follow-up answer closes the cluster

**Context:** Two episodes inside an hour produced two prompts back to back, and the second one
opened over whatever the user had moved on to.
**Decision:** Answering marks every other unanswered, ended session missed, and the component
tracks what it has closed so nothing re-opens while the writes land. The prompt on screen is also
exempt from the expiry sweep, so its window closing cannot discard what the user is typing.
**Why:** A check-in that repeats becomes an interrogation. Missed is the correct bucket: those
sessions leave the return-to-life denominator rather than counting as failures the user never had
a chance to answer for.

## D26 - The service worker registers at boot, and only the accepting tab reloads

**Context:** Registration lived inside the update banner, which mounts only in the app shell, so a
user who stayed on onboarding or entered at `#/alert` never registered a worker. The library's
prompt mode also reloads every open tab once the waiting worker takes over.
**Decision:** Move registration into `updateWatcher`, mounted above the router, and supply
`onNeedReload` so only the tab whose user pressed "update now" reloads. The banner never appears
on an alert route.
**Why:** Offline support is a safety feature here, so it cannot depend on which screen someone
happened to open. And a background tab reloading mid-episode is exactly the interruption the
no-skip-waiting policy exists to prevent.

## D27 - Onboarding runs once, and cannot be re-entered

**Context:** `#/onboarding` was registered outside the gate, and finishing it wrote fresh defaults
over everything. One tap on skip from a stale tab wiped the trusted contacts, the breathing
answer, the country, and the program start date.
**Decision:** Redirect to home when `onboardingCompletedAt` is set, and preserve an existing
`programStartedAt` when finishing.
**Why:** There is nothing to redo, so there is nothing to show. Preserving the start date stops a
re-entry from silently moving someone back to week one.

## D28 - The alert flow is never gated, and unreadable storage says so

**Context:** The gate waited for preferences, which never arrive when IndexedDB is blocked, so the
app sat on a blank busy screen forever.
**Decision:** Let `/alert` through the gate whether or not onboarding is done, run the alert flow
on default preferences when storage reports a problem, and show the storage notice instead of the
spinner.
**Why:** Someone whose first contact with the app is an episode should reach the sequences, not a
setup wizard. And a browser with storage disabled should be told, while the part of the app that
does not need storage keeps working.

## D29 - Arabic plurals are real plural families

**Context:** "منذ 10 دقيقة" and "مارست 1 مرات" were coming out of single-form strings with a number
interpolated.
**Decision:** Give every counted string the six Arabic categories (`_zero` through `_other`) and
the English ones, pass `count` rather than a bare number, and teach the locale-parity guard to
compare base keys with their placeholder unions.
**Why:** The app speaks Arabic first. A grammatical mistake in every seal and every progress line
is not a rounding error, it is the app sounding like a machine at the moment it is trying to sound
like a person.

## D30 - The week tabs on the program screen stay an override

**Context:** Tapping a week tab writes `weekOverride`, so browsing week 3 changes which week the
program is on.
**Decision:** Keep it. The behaviour is deliberate and documented in the component.
**Why:** Weeks are suggested, never enforced, and someone who opens week 3 and starts using it has
in fact moved to week 3. The alternative, a preview mode that forgets, would make the tabs lie
about what they do.
