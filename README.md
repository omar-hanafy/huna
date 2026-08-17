# هنا / Huna

**تحقّق مرة. ارجع للحاضر. اختر. أكمل.**
_Check once. Ground. Choose. Return._

A private, local-first companion for moments when your internal alarm is too
sensitive. It helps you tell immediate danger apart from elevated alarm,
regulate for 60 to 120 seconds, and return to one meaningful action, without
reinforcing repeated checking.

> **هنا أداة مساعدة ذاتية، وليست تشخيصًا أو علاجًا طبيًا.** لا تستطيع أن تعرف إن كنت في
> خطر. عند استمرار الأعراض أو تأثيرها على نومك أو عملك أو علاقاتك، اطلب تقييمًا من مختص
> نفسي أو طبي مؤهل. إذا كنت في خطر مباشر، أو ظهرت أفكار بإيذاء النفس، تواصل فورًا مع
> خدمات الطوارئ المحلية أو شخص موثوق، ولا تبقَ وحدك.

## Your data never leaves your device

Everything you write lives in this browser's IndexedDB. There is no account, no
server, no analytics, no telemetry, and no network request at runtime. This
repository contains the app, never anyone's entries: a visitor to the deployed
URL gets an empty app.

Export and permanent delete are both one tap away in settings.

## What it does

- **The alert flow.** One safety check with three honest answers, a check-once
  seal, a short grounding sequence chosen by what you are actually feeling, and
  a closing question about what small thing you want to return to.
- **Seven grounding routes**, one per reported state, rather than a library of
  exercises to choose between while your concentration is poor.
- **Breathing is optional.** Say at setup that breath focus makes things worse
  and every breathing step in the app is replaced by a tactile or movement
  alternative.
- **A four-week program**, suggested and never locked.
- **A coping card** you can print, including what does _not_ help you.
- **Practice tools**: paced breathing, 5-4-3-2-1 senses, muscle release.
- **Discreet mode** that makes the interface read as an ordinary timer.
- Arabic and English, RTL and LTR.

## Running it

Requires Node 20 or newer.

```bash
npm ci
npm run dev
```

```bash
npm run verify   # typecheck, lint, unit tests, build
npm run e2e      # Playwright; first run needs: npx playwright install
```

## Quick access on iPhone

iOS ignores a web app manifest's `shortcuts`, so the one-tap route into the
alert flow is a Shortcut you make yourself. It is worth the two minutes, because
the whole point is reaching the flow without hunting for an app.

1. Install the app: open the site in Safari, then **Share → Add to Home Screen**.
2. Open **Shortcuts** and create a new shortcut with a single **Open URL** action
   pointing at `https://omar-hanafy.github.io/huna/#/alert`.
3. Name it something you would actually say, then bind it:
   - **Settings → Accessibility → Touch → Back Tap → Double Tap** → your
     shortcut. Two taps on the back of the phone, from anywhere.
   - Or, on iPhone 15 Pro and newer, **Settings → Action Button → Shortcut**.

On Android, long-pressing the installed icon shows the same shortcut from the
manifest, with nothing to set up.

## Architecture

Three layers are deliberately free of React, so a future native app would be a
port rather than a rewrite:

| Path                               | What it is                                                 | Portable?              |
| ---------------------------------- | ---------------------------------------------------------- | ---------------------- |
| `src/content/**`                   | Versioned JSON: sequences, program, copy, crisis resources | Yes, verbatim          |
| `src/core/**`                      | Pure logic. No React, no DOM, no I/O, time as a parameter  | Yes, transliterate     |
| `src/storage/AppStorage.ts`        | The single boundary to persistence                         | Interface yes, impl no |
| `src/routes/**`, `src/features/**` | The UI                                                     | Expected throwaway     |

`src/core` holds the safety-critical behaviour and is covered at 100%, so a
redesign can move every pixel without being able to change what happens when
someone answers "there may be danger".

### Guard tests

Some rules decay if they are only written down, so they are enforced instead:

- `src/design-system/danger.guard.test.ts` fails if any module other than
  `DangerAction` touches `--danger`, or hard-codes a red. Red means a danger the
  user reported, never a high activation score.
- `src/content/content.guard.test.ts` fails if any string asserts the user is
  safe, if a crisis number has not been verified within 365 days, or if the two
  locales drift apart in keys or interpolation placeholders.
- `src/test/conventions.test.ts` fails on an em-dash anywhere, or on any module
  outside the storage layer reaching for `localStorage`.

## Crisis resources

Numbers are verified against published sources at authoring time, never written
from memory, and each carries the date it was checked and a link to its source.
A country with no verified entries shows written guidance rather than a number,
because a wrong number here is worse than none. Currently verified: **Egypt**.

To re-verify, open the sources listed in `src/content/*/crisis.json` and update
`lastVerified`. The suite fails once an entry passes a year old.

## Documentation

- [Production design spec](docs/superpowers/specs/2026-08-17-huna-production-design.md)
- [Implementation plan](docs/superpowers/plans/2026-08-17-huna-implementation.md)
- [Decision log](docs/superpowers/plans/DECISIONS.md)

## Licence

Personal project. No licence granted.
