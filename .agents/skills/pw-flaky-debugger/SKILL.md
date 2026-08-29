---
name: pw-flaky-debugger
description: >-
  Diagnoses a flaky Playwright test and proposes web-first fixes for the TTACart
  framework. Use when an SDET says "this test is flaky", "passes locally fails in
  CI", "intermittent timeout", "why does this test flake", or pastes a test that
  fails ~1 in N runs. Root-causes races/timing/hard-waits/shared state,
  recommends deterministic fixes, and suggests trace/retry settings — a diagnosis
  the engineer confirms.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW Flaky Debugger (TTACart)

You produce a **root-cause hypothesis and fix the engineer must reproduce and
verify** — flakiness is confirmed by running, not by reading. You hunt the race.

## Framework conventions (follow exactly)

- The framework's config already sets `retries: CI ? 2 : 0`, `workers: CI ? 1`,
  `trace: 'on'`, `video: 'on'`, and `expect.timeout: 10_000`. Don't propose
  changing these as the fix.
- The custom TTA reporter (`src/utils/CustomReporter.ts`) depends on
  `visualStep` attachment names (`step-<index>-<slug>`); keep steps wrapped in
  `visualStep(page, 'Title', ...)`.
- Reproduce with `npx playwright test <spec> --repeat-each=20` (and `--workers=1`
  vs parallel) — the framework runs via `npx playwright test` (no npm scripts).
- Watch for the framework's own pitfalls: `problem_user` auto-clears `firstName`
  on continue; `networkidle` wait in `UtilElementLocator.waitForPageLoad` is
  swallowed (don't rely on it as a signal); `headless: false` locally makes
  timing differ from CI.
- Hard waits (`waitForTimeout`) and non-web-first assertions are the top causes.

## Workflow

1. **Reproduce, don't guess.** Recommend `--repeat-each=20` (and `--workers=1` vs parallel) to surface the flake and isolate whether it's ordering or timing.
2. **Scan for the usual root causes:**
   - Hard waits (`waitForTimeout`) and `networkidle` masking a real race.
   - Non-web-first assertions (`expect(await locator.count())`) that don't retry.
   - Shared/mutated state across tests or workers (same user, same DB row, shared cart).
   - Auto-waiting bypassed by `ElementHandle`, or racing an animation/toast.
   - Strict-mode multi-match, or asserting before navigation settles.
   - App quirks: `problem_user` clearing form fields on submit.
3. **Prescribe the deterministic fix** — replace waits with web-first assertions, isolate state per test, await the right signal (response, URL, visibility).
4. **Tune the safety net** — keep the existing CI retries/`trace: 'on'` as-is, and keep the fix, not the retry, as the real remedy.
5. **State confidence** and what to run to confirm the flake is gone.

## Output shape

```
Flake diagnosis
  Symptom : timeout on getByTestId('continue').click() — ~2/20 runs
  Root cause: click races a modal fade-in; button is attached but not stable
  Fix     : assert dialog visible first; drop the waitForTimeout
  Confirm : npx playwright test src/tests/e2e/e2e-checkout.spec.ts --repeat-each=20  → expect 20/20
```
```typescript
// before — racy
await page.waitForTimeout(500);
await page.getByTestId('continue').click();
// after — web-first, deterministic
await expect(page.getByTestId('checkout-dialog')).toBeVisible();
await page.getByTestId('continue').click();
```

## Guardrails

- The diagnosis is a **hypothesis the engineer must reproduce** — never declare a flake fixed without a repeat-run; never assume a selector or timing.
- Retries and `trace: 'on'` are a safety net, **not** the fix — always address the root race.
- Never "fix" flake by adding `waitForTimeout` or `networkidle` — that hides it.
- Don't fabricate the cause; if the trace/logs weren't shown, ask for them.
