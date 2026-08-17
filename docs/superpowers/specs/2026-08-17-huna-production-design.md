# هنا / Huna - Production Design Spec

**Date:** 2026-08-17
**Status:** Draft for review
**Supersedes:** `README.md` "أماكن مناسبة للتطوير", `PROJECT_ROADMAP.md`

---

## 1. Purpose

هنا is a private, local-first web app for moments when a person's internal alarm is
too sensitive. It helps the user distinguish immediate danger from elevated alarm,
regulate for 60 to 120 seconds, and return to one meaningful action, without
reinforcing repeated checking.

The core loop is the app's actual structure:

> **تحقّق مرة ← ارجع للحاضر ← اختر ← أكمل**
> Check once → Orient → Choose → Return

### 1.1 What this project is

A personal tool for the author, shared by link with a small number of trusted
people. It is not a commercial product, not a medical device, and not listed in any
app store.

### 1.2 Success is the user leaving

The app is successful when episodes get shorter, checking gets less frequent, and
the user resumes an activity while still activated. It is not successful when the
user spends more time inside it. No metric in this app rewards session length.

---

## 2. Non-negotiable product principles

These constrain every later decision. A change that violates one of these is a
change to the spec, not an implementation detail.

1. **The app never asserts that the user is safe.** It cannot see the environment.
   It may only report what the user themselves entered.
2. **The app never diagnoses.** No screening scores, no "you may have PTSD", no
   inference of mental state from numbers.
3. **The app never auto-detects danger.** No heart rate triggers, no "stress
   detected" notifications, no wearable-driven alarms.
4. **The app never blocks the user.** The checking-compulsion feature offers an
   honest alternative; it never refuses to let someone check again.
5. **Red means reported danger, nothing else.** High activation is not styled as
   an emergency.
6. **No pressure mechanics.** No XP, no leagues, no streak loss, no guilt
   reminders, no countdowns, no confetti, no red badges.
7. **Eyes open by default.** "Close your eyes and relax" is never an automatic
   first instruction.
8. **Breathing is optional and removable.** Breath focus increases distress for a
   significant share of this population.
9. **Local-first.** No accounts, no server, no analytics SDK, no ad SDK, no
   telemetry of any kind.
10. **The user owns the data.** Export and permanent delete are always one screen
    away.

---

## 3. Identity

**Name:** هنا (Huna). Meaning "here".

The previous name سَكينة means _tranquility_, which promises calm. The product's
entire thesis is that the user does not need to be calm in order to continue. هنا
promises presence instead, which is what grounding actually is.

**Tagline (ar):** تحقّق مرة. ارجع للحاضر. اختر. أكمل.
**Tagline (en):** Check once. Ground. Choose. Return.

Repo: `omar-hanafy/huna`. Public, because no user data ever reaches the repo or any
server. Deployed at `https://omar-hanafy.github.io/huna/`.

---

## 4. Platform decision

**React 19 + TypeScript + Vite, deployed as an installable PWA on GitHub Pages.**

### 4.1 Rejected: Expo Router + React Native Web

Its only benefit is code-sharing with a future React Native app. The author has
stated that any future mobile version would be **native**, not React Native, which
removes the entire payoff. The remaining costs are real: total loss of the existing
codebase, materially worse RTL on web (`I18nManager` versus native CSS `dir` plus
logical properties), loss of the CSS cascade for `prefers-color-scheme` and
`prefers-reduced-motion`, a heavier bundle, and no native form controls.

### 4.2 Rejected: rewrite in Flutter

The author would choose native over Flutter for mobile. Not applicable.

### 4.3 Rejected: native now

The four-week program should start this week, not in six. The platform question is
answered better with four weeks of real usage data than with any amount of
up-front analysis. See §21.

### 4.4 How the future native port stays cheap

Portability comes from architecture, not framework choice. Three separations, all
framework-agnostic, carry over to a Swift app unchanged:

| Layer                           | Portable?              | Why                      |
| ------------------------------- | ---------------------- | ------------------------ |
| `src/content/**` versioned JSON | Yes, verbatim          | Plain data, no code      |
| `src/core/**` pure logic        | Yes, transliterate     | No React, no DOM, no I/O |
| `AppStorage` interface          | Interface yes, impl no | Swift writes a new impl  |
| `src/components/**`             | No                     | Expected throwaway       |

---

## 5. Information architecture

Home is not a dashboard. It is one large primary action, today's routine collapsed
beneath it, and nothing else competing for attention.

### 5.1 Routes (hash-based)

Hash routing is retained. It is correct on GitHub Pages, needs no `404.html`
rewrite hack, and survives the project base path.

| Route              | Screen                     | Notes                                           |
| ------------------ | -------------------------- | ----------------------------------------------- |
| `#/`               | Home                       | Alert button, today's routine, coping card link |
| `#/alert`          | Alert flow entry           | Redirects to current step                       |
| `#/alert/safety`   | Safety check               | Three-way                                       |
| `#/alert/danger`   | Safety mode                | Reached from "yes" or "not sure"                |
| `#/alert/state`    | "ما أقوى شيء الآن؟"        | Seven states                                    |
| `#/alert/sequence` | Grounding sequence         | One instruction per screen                      |
| `#/alert/action`   | Return to Life             | The second most important screen                |
| `#/alert/done`     | Quiet completion           | Exits                                           |
| `#/onboarding`     | First run                  | Safety preferences                              |
| `#/today`          | Daily routine detail       |                                                 |
| `#/program`        | Four-week program          | Soft-gated                                      |
| `#/tools`          | Practice tools             | Non-crisis practice only                        |
| `#/ladder`         | Life Ladder                | Graded activities                               |
| `#/journal`        | Trigger log                | Week 2                                          |
| `#/card`           | Coping card                | Offline, printable                              |
| `#/progress`       | Recovery report            | Hidden from nav unless enabled                  |
| `#/settings`       | Settings, data, boundaries |                                                 |

Alert sub-steps are real routes so that the back button behaves and a refresh
mid-flow resumes rather than restarts. `#/alert` is the Back Tap / Shortcut target.

### 5.2 Navigation

Progress is absent from primary navigation unless the user enables metrics in
settings. This follows the PTSD Coach precedent of allowing users to opt out of a
distress meter.

---

## 6. The alert flow

The central intervention. Implemented as a deterministic state machine in
`src/core/alert-flow.ts` with no React imports, fully unit-tested.

### 6.1 Step 1 - Safety check (three-way)

> هل يوجد خطر مباشر ومحدد الآن، أو تغيّر شيء منذ آخر مرة تحقّقت فيها؟

Three large, plainly styled choices. No illustration on this screen.

| Answer                 | Route                    |
| ---------------------- | ------------------------ |
| نعم، قد يكون هناك خطر  | Safety mode              |
| لا يوجد خطر مباشر محدد | Continue to §6.2         |
| لست متأكدًا            | Safety mode, softer copy |

**Safety mode** offers, without auto-dialing anything:

- Move away from the location if possible
- Go toward a public or trusted place
- Contact a trusted person (tap-to-call, user's stored contacts)
- Open the user's safety plan
- Local emergency and crisis resources (§14)

"Not sure" copy:

> التطبيق لا يستطيع أن يعرف إن كان المكان آمنًا. لو تعتقد أن هناك احتمال خطر،
> اتجه لمكان أكثر أمانًا أو تواصل مع شخص تثق به.

The app must never render a string asserting safety. This is enforced by a test
that scans content JSON for a denylist of assertions.

### 6.2 Step 2 - The seal

On answering "no", a `SafetyCheck` record is written with a timestamp, and:

> تحقّقت مرة واحدة. ما لم يتغيّر شيء في المكان، لا تحتاج أن تتحقق مرة أخرى الآن.

**Re-entry inside the lockout window** (default 15 minutes, configurable, can be
disabled) shows the seal with its timestamp and two honest choices:

- لم يتغيّر شيء، أكمل التثبيت
- الوضع تغيّر، تحقّق مرة أخرى

Never blocked. The app cannot know which is true, so it must not decide.

### 6.3 Step 3 - Route by state, not by tool

> ما أقوى شيء تشعر به الآن؟

Seven large cards:

| id           | Arabic                              | Sequence                                                                                                        |
| ------------ | ----------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `scanning`   | أراقب الناس أو المخارج              | Look once, name three neutral objects, feet, jaw, one task                                                      |
| `startled`   | صوت أو حركة أفزعتني                 | Name the sound, place and date, three present-signs, five long exhales                                          |
| `activated`  | جسمي مستنفر                         | Feet, shoulders, jaw, slow movement, longer exhales                                                             |
| `detached`   | أشعر بانفصال أو أن المكان غير حقيقي | Eyes open, place/date/time aloud, press feet, textured object, slow movement. **No breath focus, no body scan** |
| `predicting` | أفكاري تتوقع خطرًا                  | Notice-the-thought framing, evidence both ways, one small action                                                |
| `sleepless`  | لا أستطيع أن أهدأ لأنام             | Low light, muscle release, no clock checking, longer exhale if enabled                                          |
| `unsure`     | لا أعرف، أشعر أنني على الحافة       | Default orientation sequence                                                                                    |

Sequences are content, not code. Selection logic lives in
`src/core/exercise-selector.ts` and accounts for user preferences: if breathing is
disabled, any breath step is substituted with its tactile or movement alternative,
declared in the content file itself rather than chosen at runtime.

### 6.4 Step 4 - The sequence

One instruction per screen. Short imperative sentences. Large type. A plain
"الخطوة 2 من 5" progress indicator. No decorative background, no character, no
animation beyond a slow fade and a slowly filling progress line.

### 6.5 Step 5 - Return to Life

> ما الفعل الصغير الذي تريد الرجوع إليه الآن؟

Preset options plus a custom field, and an optional timer:

- أكمل ما كنت أفعله لدقيقتين
- ابقَ في هذا الموقف الآمن ثلاث دقائق
- أنهِ جزءًا صغيرًا من المحادثة
- امشِ برفق لدقيقتين
- اشرب ماء وارجع لعملي
- تواصل مع شخص أثق به
- فعل من اختياري

This is the screen that distinguishes the product. It is never skipped, though it
can be answered with "لا شيء الآن".

### 6.6 Step 6 - Quiet completion, then one follow-up

> أكملت التمرين، واخترت خطوتك التالية.

No celebration. The app then exits to Home or to discreet mode.

A **single** follow-up prompt asks for activation after, whether the chosen action
was completed, and what helped.

Timing is precise, because the metric in §11 depends on it: the prompt is shown on
the next app open occurring between 5 and 60 minutes after the session ended. If
the app is not opened in that window, the session is marked `followUpMissed` and
the prompt is never shown. It never repeats and never nags. There is no
notification, since scheduled local notifications are unavailable on iOS Safari.

---

## 7. Onboarding and safety preferences

First run, skippable but resumable, captures only what makes sequences safe:

- Language (ar default, en available)
- **Does breathing help or make it worse?** If worse, every breath step is
  substituted everywhere in the app, and the breathing tool is hidden.
- Trusted contacts (name + number, stored locally only)
- Country for crisis resources
- Metrics visible or hidden
- Discreet mode default on or off
- Reduce motion (pre-filled from the OS preference)
- Explicit acknowledgment that this is not treatment

Eyes-open behavior is fixed and not offered as a preference.

---

## 8. Four-week program

The existing `PLAN_WEEKS` content is retained and restructured into micro-actions.
Weeks are **soft-gated**: the app suggests the week derived from `startedAt`, and
one tap overrides it. Hard locking contradicts the agency principle and is rejected.

| Week | Focus                  | Adds                                                                                        |
| ---- | ---------------------- | ------------------------------------------------------------------------------------------- |
| 1    | Regulate the alarm     | Orientation, optional breathing, movement, evening muscle release, sleep and activation log |
| 2    | Understand the pattern | One journal entry daily, safety-behavior counter                                            |
| 3    | Return to activities   | Life Ladder                                                                                 |
| 4    | Values and choice      | Daily five-minute value-linked action                                                       |

Journal language stays neutral. "توقّع عقلك أن يحدث..." never "فكرتك غير منطقية".

**Boundary:** the app never guides the user through traumatic memories, graphic
material, or high-intensity exposure. Week 3 covers ordinary, objectively safe
avoided activities only. Where a user records dissociation, flashbacks, or ongoing
danger, the ladder surfaces a recommendation to seek professional guidance rather
than escalating the activity.

---

## 9. Life Ladder

User-built list of ordinary avoided activities with an expected activation 0-10.

A live session records SUDs at 0, 5, 10, 15, and 20 minutes, plus completion and
notes. The habituation chart plots **the user's actual data and promises nothing**.
Gemini's framing of "visually proving arousal subsides on its own" is rejected:
sometimes it does not, and a chart implying it should have is harmful on exactly
the day it did not.

---

## 10. Coping card

A single editable card, available offline and printable:

- ما الذي يحدث
- ما الذي يساعدني
- **ما الذي لا يساعدني** (load-bearing; this is what makes it personal)
- جملتي
- فعلي التالي
- شخص أثق به
- دعم مهني

Reachable from Home in one tap and from the alert flow's safety mode.

---

## 11. Progress and metrics

Hidden from navigation unless enabled. Fully disableable, including retroactively
(hiding metrics never deletes data; deleting is separate and explicit).

**North star, shown to the user as such:**

> **Return-to-Life Rate** - the share of alert sessions after which a chosen
> everyday action was completed within ten minutes.

Denominator is sessions whose follow-up (§6.6) was answered, not all sessions. A
missed follow-up is excluded rather than counted as a failure, so an unanswered
prompt never reads as the user having failed. When fewer than five answered
sessions exist, the rate is withheld and the screen says
"لسه بدري على الرقم ده" rather than showing a volatile percentage.

Supporting: median recovery time, repeat-check count trend, share of sessions
completed under two minutes, ladder activities resumed, sleep, which tool helped in
which context.

**Good insight, allowed:**

> "الموجات كانت أقوى في الأيام التي نمت فيها أقل. التثبيت اللمسي ساعدك أكثر من
> التنفس أثناء المواصلات. وسيط زمن العودة تغيّر من 18 دقيقة إلى 11."

**Harmful insight, forbidden:**

> "جهازك العصبي كان تحت ضغط شديد الساعة 3:42 مساءً."

The first names a pattern and implies an action. The second invites body monitoring
and offers nothing to do. A test asserts that no insight template contains a
timestamp of a physiological state.

**Streaks are reframed.** The current `ProgressView` streak counter breaks to zero
every morning before the first task. It becomes "مارست ثلاث مرات هذا الأسبوع. أي
أداة بدت أكثر فائدة؟" and a return after absence reads "أهلًا بعودتك. اختر أصغر
خطوة مفيدة اليوم."

---

## 12. Discreet mode

For use in public, at work, or in bed:

- Text only, neutral surface, resembling an ordinary timer
- No accent colors, no illustrations, no character
- No audio
- One-tap exit
- Larger tap targets, since it is used with divided attention

Toggle from Home and from settings. Can be the default.

---

## 13. Busy-day mode

One tap collapses the daily routine to the 20-minute version already described in
the source program: 2 minutes orientation, 5 minutes breathing (or its substitute),
10 minutes movement, 3 minutes log.

---

## 14. Crisis resources and boundaries

Stored as content, per country, each entry carrying a `lastVerified` ISO date and a
`source` URL:

```jsonc
{
  "country": "EG",
  "lastVerified": "2026-08-17",
  "resources": [{ "label": "...", "number": "...", "source": "https://..." }],
}
```

**Numbers are verified against official sources at authoring time and never written
from memory.** If a country cannot be verified, it falls back to generic guidance
("تواصل مع خدمات الطوارئ المحلية أو شخص تثق به") rather than displaying a possibly
wrong number. A test fails the build when any resource's `lastVerified` is older
than 365 days, so staleness is loud rather than silent.

Egypt is the primary country. Others are added only when verified.

The medical-boundary content in the current `SettingsView` is retained and also
surfaced during onboarding.

---

## 15. Visual design system

**Direction:** calm, adult, private, warm, nonjudgmental. Roughly 85% clean
predictable interface, 15% warm hand-drawn illustration, 0% pressure mechanics.

> The illustration may be expressive. The interface must remain predictable.

### 15.1 Palette

Light is the default identity (warm paper). Dark is honored automatically from
`prefers-color-scheme` and is available as an explicit override. Dark uses a deep
warm charcoal-green rather than black, which is harsh at 3am.

**Light**

| Token            | Value     | Contrast on bg                        |
| ---------------- | --------- | ------------------------------------- |
| `--bg`           | `#F7F4EE` | -                                     |
| `--text`         | `#18302A` | 12.8:1                                |
| `--primary`      | `#2F5D50` | 6.8:1                                 |
| `--surface-calm` | `#DCE8E2` | -                                     |
| `--surface-warm` | `#E8DED4` | -                                     |
| `--accent-sage`  | `#88A89B` | fill only                             |
| `--accent-blue`  | `#91AEC4` | fill only                             |
| `--accent-amber` | `#E7B976` | 1.65:1, **fill only, dark text over** |
| `--danger`       | `#B34040` | 5.1:1                                 |
| `--outline`      | `#243833` | -                                     |

**Dark**

| Token         | Value     | Contrast on bg |
| ------------- | --------- | -------------- |
| `--bg`        | `#141C1A` | -              |
| `--text`      | `#E8E4DC` | 13.7:1         |
| `--primary`   | `#7FB3A2` | 7.3:1          |
| `--surface-1` | `#1E2A27` | -              |
| `--surface-2` | `#26332F` | -              |
| `--danger`    | `#E08585` | 6.5:1          |
| `--outline`   | `#3A4A45` | -              |

**Semantic rules:**

- Sage / blue: grounding and neutral actions
- Sand / amber: reflection and learning
- **Red: user-reported immediate danger only.** Enforced structurally, not by
  convention: `--danger` is consumed by exactly one component (`DangerAction`), and
  a test asserts no other module references the token. An activation of 8/10 must
  never look like an emergency.
- Gray: disabled and secondary

### 15.2 Components

- Corner radius 16-20px
- Primary controls minimum **48px** high (WCAG 2.2 minimum is 24×24, enhanced is
  44×44; 48 is deliberately forgiving for reduced concentration and unsteady hands)
- One primary action per screen, full width
- Icons always accompanied by text
- Explicit "الخطوة 2 من 5" progress
- Persistent back and exit controls
- Text contrast target 4.5:1 minimum, met by every combination above

### 15.3 Motion

Allowed: short cross-fades between steps, a slowly filling progress line, a
restrained completion acknowledgment.

Forbidden: pulsing circles, floating backgrounds, parallax, rapid breathing
animation, screen shake, confetti, auto-playing scenes.

`prefers-reduced-motion` is read from the OS and pre-fills the in-app toggle, which
can still be set independently. Under reduced motion, transitions become instant
and the breathing orb becomes a numeric and linear indicator.

### 15.4 Icon hierarchy

Three levels, never mixed within a level.

| Level             | Use                                                    | Style                                                                     | Source             |
| ----------------- | ------------------------------------------------------ | ------------------------------------------------------------------------- | ------------------ |
| 1 Functional      | Nav, buttons, settings, safety actions                 | Rounded monoline, 24px, ~1.75px stroke, rounded caps and joins, no shadow | **Lucide**         |
| 2 Grounding-state | The seven state cards, exercises                       | Hand-drawn, 48-72px, one or two muted accents                             | **Waterlemon Jot** |
| 3 Editorial       | Onboarding, empty states, weekly reflection, education | Larger hand-drawn scenes                                                  | **Waterlemon Jot** |

Waterlemon "Ink" is explicitly **not** used for navigation. Its sample artwork is a
3/4-perspective illustration with solid black masses that becomes an unreadable
blob at 24px. Lucide already is the monoline spec.

Level 2 and 3 illustrations never appear on `#/alert/safety`, `#/alert/sequence`,
or in discreet mode.

The existing bespoke `Icon.tsx` is retired except for the brand mark.

**Illustration consistency rules:** uniform stroke width, rounded caps and joins,
maximum two accent colors per icon, consistent front or slight 3/4 angle, no
realistic lighting or shadow, no facial expressions on functional icons,
recognizable in monochrome, meaning never carried by color alone, no tiny internal
detail, and no mixing of Jot with any other generated style.

### 15.5 Symbols to avoid

Sirens, flashing bells, warning triangles, red exclamation marks, radar sweeps,
fast heartbeat graphics, eyes looking in all directions, countdown clocks.

The **أنا في حالة استنفار** button carries a _grounding_ symbol, not a warning one:
two feet on the ground, or a centered dot within one calm ring. The label already
communicates the state; the icon communicates the next step.

### 15.6 No guide character in v1

Rejected for v1. The constraint "never watch the user constantly" is difficult to
honor with a recurring character, and the condition being addressed is precisely
sensitivity to a monitored presence. Illustrations deliver warmth without a
watcher. Revisit after four weeks of use if the app reads cold; adding a guide
later is cheap, removing an established one is not.

---

## 16. Technical architecture

```
src/
├── core/                      # pure logic, zero React, zero I/O, 100% tested
│   ├── alert-flow.ts          # the state machine
│   ├── exercise-selector.ts   # state -> sequence, honoring preferences
│   ├── recovery-metrics.ts    # return-to-life rate, medians, trends
│   ├── program.ts             # week derivation, soft gating
│   └── safety-window.ts       # seal and lockout arithmetic
├── content/
│   ├── ar/{sequences,program,ui,crisis}.json
│   ├── en/{sequences,program,ui,crisis}.json
│   └── schema.ts              # Zod schemas for all content
├── storage/
│   ├── AppStorage.ts          # the interface
│   ├── indexeddb/             # Dexie implementation
│   └── migrations/            # v1 localStorage -> v2 IndexedDB
├── design-system/
│   ├── tokens.css
│   ├── typography.css
│   └── motion.css
├── components/                # expected throwaway on a native port
├── routes/
└── i18n/
```

### 16.1 Stack

| Concern            | Choice                               | Why                                                |
| ------------------ | ------------------------------------ | -------------------------------------------------- |
| Framework          | React 19 + TS + Vite                 | Existing, correct for a static PWA                 |
| Routing            | `react-router` HashRouter            | Real routes for the alert flow, no server rewrites |
| Ephemeral UI state | Zustand                              | Small, no boilerplate                              |
| Persisted data     | Dexie / IndexedDB via `useLiveQuery` | Reactivity plus cross-tab consistency free         |
| Validation         | Zod                                  | Content, import, and storage boundaries            |
| i18n               | i18next + react-i18next              | ar default, en parallel                            |
| Icons              | Lucide                               | Matches the level-1 spec exactly                   |
| PWA                | `vite-plugin-pwa` (Workbox)          | Offline, correct base path                         |
| Unit / component   | Vitest + Testing Library             |                                                    |
| E2E                | Playwright                           |                                                    |
| Lint / format      | ESLint + Prettier                    |                                                    |

### 16.2 The storage interface

All persistence goes through an interface. No component calls Dexie directly.

```ts
export interface AppStorage {
  getPreferences(): Promise<UserPreferences>;
  savePreferences(value: Partial<UserPreferences>): Promise<void>;
  saveAlertSession(value: AlertSession): Promise<void>;
  getAlertSessions(range?: DateRange): Promise<AlertSession[]>;
  saveSafetyCheck(value: SafetyCheck): Promise<void>;
  getLastSafetyCheck(): Promise<SafetyCheck | null>;
  // ... days, journal, ladder, values, coping card
  exportAll(): Promise<ExportBundle>;
  importAll(bundle: unknown): Promise<ImportResult>;
  deleteAll(): Promise<void>;
}
```

### 16.3 Data model

Dexie tables: `days`, `alertSessions`, `safetyChecks`, `journalEntries`,
`ladderItems`, `ladderSessions`, `values`, `copingCard`, `preferences`, `meta`.

`meta` carries `schemaVersion`, `contentVersion`, `startedAt`, `migratedFrom`.

### 16.4 Migration from سَكينة v1

On first run the app reads `sakina.app-state.v1` from `localStorage`, validates it
with a Zod schema written specifically for the legacy shape, and imports it. The
six `CoreTaskId` values are unchanged, so day records map directly.

**The legacy `localStorage` key is not deleted.** It stays as a free backup, and
`meta.migratedFrom` records that migration ran so it never runs twice. A test
covers migrating a realistic legacy blob, an empty blob, and a corrupt blob.

### 16.5 Content model

Every string, sequence, program week, and crisis resource is versioned JSON,
authored in `ar` and `en` together. A build-time test validates all content against
its Zod schema and fails on any key present in one locale but missing in the other.

Arabic is authored first and is the source of truth for tone; English is a
translation, not the origin. RTL is the default layout, using CSS logical
properties throughout so LTR is a `dir` flip rather than a second stylesheet.

---

## 17. Deployment

- Repo `omar-hanafy/huna`, public
- `vite.config.ts` gets `base: '/huna/'`; every absolute asset path is rebased via
  `import.meta.env.BASE_URL`
- Manifest gains `id` and `scope`; `start_url` becomes base-relative
- Real PNG icons at 192 and 512, a separate maskable icon, and an
  `apple-touch-icon` (SVG-only icons are why install is currently broken on iOS)
- `vite-plugin-pwa` for the service worker, precaching the shell and all content
  JSON so the alert flow works with no signal
- GitHub Actions: typecheck, lint, unit, E2E, build on PR; deploy to Pages on main
- **Quick access on iPhone:** a Shortcut bound to Back Tap or the Action Button
  opening `#/alert`. Documented in the README, not built into the app.

---

## 18. Defect register

Every item below is a real defect found in the current code and must be fixed and
covered by a test.

| #   | File                                | Defect                                                                                                                                   |
| --- | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `package.json:12-22`                | All deps `"latest"`, no lockfile, build not reproducible                                                                                 |
| 2   | `package.json:12-18`                | React/Vite/TS in `dependencies` not `devDependencies`                                                                                    |
| 3   | -                                   | No git repository                                                                                                                        |
| 4   | `hooks/usePersistentState.ts:16-18` | Write errors silently swallowed. Quota or Safari private mode causes silent data loss while the UI claims "محفوظ تلقائيًا"               |
| 5   | `components/TodayView.tsx:50`       | `crypto.randomUUID()` throws in non-secure contexts; `vite.config.ts` sets `host: true`, so LAN testing over http crashes every check-in |
| 6   | `App.tsx:25`                        | `todayKey` computed at render; the day never rolls over past midnight in an open tab                                                     |
| 7   | `components/BreathingTool.tsx:38`   | 1000ms `setTimeout` chain drifts and stalls under background-tab throttling; a "10 cycle" session is not the stated duration             |
| 8   | `components/SettingsView.tsx:33`    | Import validation is a shallow `version === 1` check; malformed data reaches render                                                      |
| 9   | `hooks/usePersistentState.ts`       | Two tabs clobber each other; last write wins                                                                                             |
| 10  | `hooks/usePersistentState.ts:15`    | Full-state `JSON.stringify` on every keystroke in the note textarea                                                                      |
| 11  | -                                   | No error boundary; any render throw is a white screen over intact data                                                                   |
| 12  | `public/manifest.webmanifest`       | Declares `standalone` with no service worker; no offline                                                                                 |
| 13  | `public/manifest.webmanifest:12-18` | SVG-only icons; PWA install broken on iOS                                                                                                |
| 14  | `vite.config.ts:11`                 | Production sourcemaps shipped                                                                                                            |
| 15  | `components/ProgressView.tsx:28-37` | Streak breaks to zero every morning before the first task                                                                                |
| 16  | `components/ProgressView.tsx:95`    | Chart data only in `title` attributes; unavailable to screen readers                                                                     |
| 17  | `components/AppNav.tsx`             | Drawer has no focus trap and no Escape-to-close                                                                                          |
| 18  | `App.tsx:31-34`                     | Hash written in an effect on mount, adding a spurious history entry                                                                      |
| 19  | `components/SettingsView.tsx:76`    | `reducedMotion` manual only; OS preference ignored                                                                                       |
| 20  | `components/ProgressView.tsx:100`   | Date parsed as `T12:00:00` here but locally elsewhere; inconsistent                                                                      |
| 21  | `components/SettingsView.tsx:26`    | `URL.revokeObjectURL` called synchronously after `click()`; can cancel the download in some browsers                                     |
| 22  | -                                   | Zero tests, no lint, no CI                                                                                                               |

---

## 19. Accessibility requirements

- 4.5:1 minimum text contrast, verified per token pair (§15.1)
- 48px minimum primary targets, 24px absolute minimum for any target
- Full keyboard operation of the alert flow, including the state cards
- Focus trap and Escape in the nav drawer and any dialog
- Charts paired with an accessible data table, not `title` attributes
- `prefers-reduced-motion` honored from the OS
- Meaning never carried by color alone
- RTL and LTR both verified: long Arabic labels, digits inside Arabic text, mixed
  Arabic and Latin terms, back-arrow direction, progress direction

---

## 20. Testing strategy

**Unit (`src/core`, `src/storage`, `src/content`) - the safety-critical layer:**

- `alert-flow` state machine: every transition, including refresh-mid-flow resume
- `exercise-selector`: breathing-disabled substitution for all seven states
- `safety-window`: seal arithmetic, lockout boundaries, DST and midnight crossing
- `recovery-metrics`: return-to-life rate, medians, empty and single-record cases
- `program`: week derivation, soft-gate override
- Content: schema validation, ar/en key parity, crisis-resource freshness,
  safety-assertion denylist
- Migration: realistic, empty, and corrupt legacy blobs
- Date handling: midnight rollover, timezone changes

**Component:** the alert flow end to end, import/export, error boundary recovery.

**E2E (Playwright):** full alert flow including safety mode, the three exercises,
offline load with the network disabled, install manifest validity, RTL layout.

**Structural tests:** `--danger` token referenced by exactly one component; no
insight template contains a physiological timestamp; no content string asserts
safety.

---

## 21. Delivery phases

This spec is too large for a single implementation plan. **Each phase below gets
its own plan, written and approved separately**, so that scope is re-checked
against reality six times rather than once. Each phase ends with a deployable app.
The four-week program can start after Phase 2.

| Phase                   | Contents                                                                                                     | Ends with                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------- |
| **0 Foundation**        | git, pinned deps + lockfile, ESLint/Prettier, Vitest/Playwright, CI, error boundary, defects 1-3, 14, 22     | Green CI on a reproducible build                           |
| **1 Storage & content** | `AppStorage`, Dexie, migration, Zod, content model, i18n scaffolding, defects 4, 8, 9, 10                    | Existing app on the new foundation, data intact            |
| **2 Alert flow**        | `src/core`, the six alert screens, safety mode, seal and lockout, crisis resources, onboarding, defects 5, 6 | **The core intervention is usable. Start the four weeks.** |
| **3 Design system**     | Tokens, light and dark, Lucide, Jot illustrations, discreet mode, 48px targets, motion rules, defects 15-20  | Visual identity complete                                   |
| **4 PWA & deploy**      | Service worker, icons, base path, Pages deploy, Back Tap shortcut docs, defects 12, 13                       | Installed on the phone, works offline                      |
| **5 Program features**  | Life Ladder, coping card, journal rewrite, busy-day mode, values, progress and metrics                       | Feature-complete                                           |
| **6 Polish**            | Accessibility audit, E2E coverage, README, performance                                                       | Production                                                 |

**After four weeks of real use**, the native question gets answered with evidence:
which sequences were actually opened, whether breathing helped or hurt, whether the
app was reached for during genuine activation, and whether haptics and scheduled
reminders were missed enough to justify a native build.

---

## 22. Out of scope

Deferred deliberately, not forgotten:

- Guide character (§15.6)
- Clinician companion mode and shared reports
- Accounts, cloud sync, encrypted backup
- Recorded audio guidance in either language
- Wearable integration of any kind
- AI features, including summarization of the user's own logs
- Public listing, app stores, marketing site

**Gates that apply only if this ever becomes public:** review by a trauma-informed
clinician, testing with people with lived experience, a privacy policy, per-country
verified crisis directories, and a regulatory classification review. None of these
block a private tool; all of them block a listed one.

---

## 23. Open questions

1. Countries beyond Egypt for crisis resources?
2. Lockout window default: 15 minutes as proposed, or shorter?
3. Does the working directory get renamed from `sakina-hypervigilance` to `huna` at
   the end, or stay as is?
