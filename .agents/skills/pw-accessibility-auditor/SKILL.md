---
name: pw-accessibility-auditor
description: >-
  Integrates automated accessibility checks into TTACart Playwright tests using
  axe-core. Use when an SDET says "add a11y checks", "run axe on this page",
  "audit accessibility", "check WCAG compliance", or "triage these accessibility
  violations". Produces @axe-core/playwright-based tests, severity triage, and
  WCAG mapping following the framework's conventions — a draft the engineer runs,
  knowing axe catches only ~30-40%.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW Accessibility Auditor (TTACart)

You wire in **automated a11y checks the engineer must run and supplement with
manual testing** — axe catches only a fraction of issues, never all of them.

## Framework conventions (follow exactly)

- Install the dependency as a devDependency (framework convention):
  `npm install -D @axe-core/playwright`.
- Import `test`, `expect` from `@fixtures/test-base`; destructure the standard
  `page` fixture alongside page objects: `async ({ page, inventoryPage }) =>`.
- Run `AxeBuilder` **after** the page reaches a stable state — use the POM's
  `assertLoaded()` or a web-first assertion first, then scan the real rendered DOM.
- Wrap the flow in `visualStep(page, 'Title', ...)` to keep the TTA reporter's
  step/attachment contract intact. Assert on the `results.violations` array.
- The TTACart app uses `data-test` hooks; axe works on the rendered DOM regardless
  — no special selectors needed. `.include()`/`.exclude()` target the component
  under test and skip known third-party widgets.
- Gate the build on `critical` + `serious`; log the rest as tracked debt.

## Workflow

1. **Integrate `@axe-core/playwright`** — run `AxeBuilder` after the page reaches a stable state (web-first assertion first), scanning the real rendered DOM.
2. **Scope the scan** — `.include()`/`.exclude()` to target the component under test and skip known third-party widgets; tag rules (`wcag2a`, `wcag2aa`) to the standard you're holding the product to.
3. **Triage violations by impact** — `critical` / `serious` / `moderate` / `minor`. Gate the build on critical+serious; log the rest as debt, don't silently pass.
4. **Map each violation to WCAG** — axe returns `tags` and `helpUrl`; surface the success criterion (e.g. 1.4.3 contrast, 4.1.2 name/role/value) so it's actionable.
5. **Flag the coverage gap** — remind that keyboard, focus order, screen-reader, and cognitive checks need a human; automation is the floor, not the ceiling.

## Output shape

```typescript
import { test, expect } from '@fixtures/test-base';
import AxeBuilder from '@axe-core/playwright';
import { visualStep } from '@utils/visualStep';

test('checkout page has no critical a11y violations', async ({ page, checkoutStepOnePage }) => {
    await visualStep(page, 'Open checkout', async () => {
        await checkoutStepOnePage.open();
        await checkoutStepOnePage.assertLoaded();
    });

    const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .exclude('[data-test="footer"]')   // third-party widget, skip
        .analyze();

    const blocking = results.violations.filter(
        (v) => v.impact === 'critical' || v.impact === 'serious');
    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
});
```

## Guardrails

- Automated axe checks are the **floor** — this is a draft the engineer must run and back with manual keyboard/screen-reader testing; never claim "fully accessible".
- Never assume a selector/testid exists; scan the real rendered DOM after it settles.
- Don't fabricate WCAG criteria — use the `tags`/`helpUrl` axe actually returns.
- Gate on critical/serious; record the rest as tracked debt, don't drop it.
