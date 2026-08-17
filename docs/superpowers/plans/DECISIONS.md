# Decision log

Non-trivial decisions and assumptions made while implementing
`2026-08-17-huna-implementation.md`. Newest last.

---

## D1 — Lockout window default: 15 minutes, configurable

**Context:** Spec §23 Q2 left open; user delegated the call.
**Decision:** Default 15 minutes. Options 5 / 10 / 15 / 30. Disableable entirely.
**Why:** Urge waves typically peak and subside inside 10 to 20 minutes, so 15 sits in the
middle of the useful range. Configurable because checking rhythm varies per person, and
disableable because principle §2.4 forbids the app blocking the user.

## D2 — Crisis resources: Egypt only

**Context:** Spec §23 Q1, answered by user.
**Decision:** Egypt only. `crisis.json` carries one country block. The country selector in
onboarding still exists but offers Egypt plus "أخرى", where "أخرى" shows generic guidance.
**Why:** Numbers must be verified, and only Egypt was requested. The selector stays so
adding a country later is content, not code.

## D3 — Plan granularity deviates from the writing-plans skill

**Context:** Skill requires literal code in every step.
**Decision:** Task-level plans with exact paths, exact interface signatures, and exact test
cases, but not full implementation bodies.
**Why:** A literal-code plan for a seven-phase rebuild would exceed the size of the
codebase and would be invalidated as earlier phases settle the shapes. Interfaces and test
cases are the parts that actually need pinning down in advance.

## D4 — Inline execution, not subagent-driven

**Context:** Skill recommends dispatching a subagent per task.
**Decision:** Execute inline in this session.
**Why:** Session instructions prohibit calling the Agent tool unless the user requests it.
The user requested autonomous work, not delegated work.
