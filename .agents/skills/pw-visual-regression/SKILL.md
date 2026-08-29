---
name: pw-visual-regression
description: >-
  Sets up Playwright visual/screenshot regression testing for the TTACart
  framework. Use when an SDET says "add visual regression", "snapshot this
  component", "set up toHaveScreenshot", "mask the dynamic parts of this page",
  or "manage baselines". Produces snapshot tests with masking, thresholds, and a
  baseline strategy following the framework's conventions — a draft the engineer
  runs to generate and review the first baselines.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW Visual Regression (TTACart)

You set up **snapshot tests whose first baselines the engineer must generate and
eyeball** — never trust an auto-approved baseline. You make snapshots deterministic.

## Framework conventions (follow exactly)

- Import `test`, `expect` from `@fixtures/test-base`; `expect` is re-exported so
  `toHaveScreenshot` works out of the box (Playwright 1.62).
- The framework's `use` config sets `headless: false`, `viewport: 1920x1080`,
  `video: 'on'`, `trace: 'on'`. For visual stability, add a screenshot-specific
  project or override in the test: pin the viewport, disable animations, and mask
  dynamic regions. Note `headless: false` locally differs from CI — baselines
  must be generated in the CI-like environment.
- The TTACart app is SauceDemo-style: dynamic bits are the cart badge,
  timestamps, and (for `problem_user`) the auto-cleared form fields. Mask these.
- `toHaveScreenshot` options: `animations: 'disabled'`, `mask: [...]`,
  `maxDiffPixelRatio` / `threshold`. Keep tolerances in the call or config, not
  sprinkled ad hoc.
- Generate/refresh baselines with `npx playwright test --update-snapshots`, then
  review each PNG by eye before committing (baselines land in
  `src/tests/**/__screenshots__/`).
- Wrap the flow in `visualStep(page, 'Title', ...)` to keep the TTA reporter's
  step/attachment contract intact.

## Workflow

1. **Pick the smallest stable target** — prefer a component locator over a full page; less surface means fewer false diffs.
2. **Neutralize non-determinism before snapping:** `mask` dynamic regions (cart badge, timestamps, ads), disable animations (`animations: 'disabled'`), freeze data, and pin viewport + a consistent font/rendering environment (ideally Docker in CI).
3. **Configure tolerances** deliberately — `maxDiffPixelRatio` / `threshold` in config, not sprinkled ad hoc. Tight enough to catch real regressions.
4. **Establish baselines** via `--update-snapshots`, then **review each PNG by eye** before committing — a wrong baseline locks in the bug.
5. **Document the update flow** so baselines are refreshed intentionally, per platform.

## Output shape

```typescript
import { test, expect } from '@fixtures/test-base';
import { visualStep } from '@utils/visualStep';

test('inventory header matches baseline', async ({ page, inventoryPage }) => {
    await visualStep(page, 'Open inventory', async () => {
        await inventoryPage.open();
    });
    await expect(page.getByTestId('title')).toBeVisible();   // web-first: wait for render
    await expect(page.getByTestId('inventory-container')).toHaveScreenshot('inventory.png', {
        animations: 'disabled',
        mask: [page.getByTestId('shopping-cart-badge')],     // hide volatile badge
        maxDiffPixelRatio: 0.01,
    });
});
```
```
# generate/refresh baselines, then review the PNGs before committing
npx playwright test --update-snapshots
```

## Guardrails

- Baselines are **generated then human-reviewed** — never auto-approve; a bad baseline turns a bug green forever. Never assume a locator/testid exists.
- Mask every dynamic region and disable animations, or diffs will be flaky.
- Pin viewport, OS, and fonts; snapshots taken on different platforms won't match — generate per-project baselines in the CI environment, not just locally.
- No `waitForTimeout` before snapping; wait on a web-first assertion instead.
