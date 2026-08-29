---
name: pw-trace-analyzer
description: >-
  Analyzes a Playwright trace.zip or test failure to pinpoint the root cause for
  the TTACart framework. Use when an SDET says "read this trace", "why did this
  test fail", "analyze the trace.zip", "my CI run failed — what broke", or pastes
  an error + trace. Reads the timeline, isolates the failing action/assertion,
  and recommends the fix — a diagnosis the engineer confirms by re-running.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW Trace Analyzer (TTACart)

You turn a trace or failure into a **root-cause diagnosis the engineer must
confirm by re-running** — a trace shows what happened, not always why it's wrong.

## Framework conventions (follow exactly)

- The framework captures `trace: 'on'` and `video: 'on'` on every run, so every
  spec leaves a `trace.zip` in `test-results/`. The custom TTA reporter
  (`src/utils/CustomReporter.ts`) links traces per test; the HTML report also
  exposes them.
- Open a trace with `npx playwright show-trace <path-to-trace.zip>`.
- Specs wrap steps in `visualStep(page, 'Title', ...)`, and the reporter matches
  `step-<index>-<slug>` attachments — use the failing step's index to cross-check
  the timeline.
- The framework's CI (`workers: 1`) and local (`headless: false`) runs can behave
  differently — note which environment the trace came from.
- Reproduce with `npx playwright test <spec> --repeat-each=10` (traces already on).

## Workflow

1. **Open the trace** — recommend `npx playwright show-trace trace.zip` (or the CI report's trace link). If only an error string is provided, work from that and ask for the trace to go deeper.
2. **Locate the failing step** on the timeline — the last action/assertion before the error, its call log, and the DOM snapshot at that moment.
3. **Read the snapshot + call log** to classify the cause: element not found / not visible, strict-mode multi-match, navigation not settled, wrong assertion, backend error (check the Network tab), or a race with an animation/async render.
4. **Correlate signals** — console errors, failed requests, and the before/after snapshots — to separate a test bug from a genuine product bug.
5. **Recommend the fix** with confidence level, and the exact command to reproduce.

## Output shape

```
Trace analysis
  Failing step : expect(getByTestId('total')).toHaveText('$120') @ 00:07.3
  Snapshot     : element shows '$0' — cart total not yet updated
  Network      : PATCH /api/cart → 200 fired AFTER the assertion (race)
  Root cause   : assertion ran before the cart-update response settled
  Fix          : await the response, then assert (web-first already retries text)
  Reproduce    : npx playwright test src/tests/e2e/e2e-checkout.spec.ts --repeat-each=10
```
```typescript
// await the signal the UI depends on, then let the web-first assertion retry
await page.getByTestId('add-to-cart-tta-bike-light').click();
await page.waitForResponse((r) => r.url().includes('/api/cart') && r.ok());
await expect(page.getByTestId('shopping-cart-badge')).toHaveText('1');
```

## Guardrails

- The diagnosis is a **hypothesis the engineer must confirm by re-running** — never declare it solved without a trace-backed reproduce step.
- Read the trace evidence; **never fabricate** timeline steps, snapshots, or network calls you weren't shown. If the trace wasn't provided, say what you'd need.
- Distinguish test bug vs. product bug — don't "fix" a real regression by loosening the test. Never recommend `waitForTimeout` as the remedy.
