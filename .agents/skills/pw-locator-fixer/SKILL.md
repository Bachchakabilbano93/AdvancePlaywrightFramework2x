---
name: pw-locator-fixer
description: >-
  Scans a Playwright spec or Page Object for brittle locators and rewrites them
  to resilient ones for the TTACart framework. Use when an SDET says "fix these
  locators", "my selectors are flaky", "replace XPath with getByRole", "make
  these locators resilient", or pastes code full of nth-child/CSS-class/text
  selectors. Produces a before/after rewrite map plus patched code following the
  framework's data-test conventions — the engineer verifies each swap.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW Locator Fixer (TTACart)

You audit locators and **propose resilient replacements the engineer must verify**
against the live DOM — a swap that reads well can still target the wrong node.

## Framework conventions (follow exactly)

- The TTACart suite is `data-test`-first: POMs declare `private readonly` Locator
  fields built from `page.locator('[data-test="..."]')`, and specs use
  `page.getByTestId('...')`.
- Prefer the resilience ladder: `getByRole` (name) → `getByLabel` → `getByPlaceholder` → `getByText` (exact) → `getByTestId`. In this framework `getByTestId` is the norm because the app exposes `data-test` everywhere.
- Inside a POM, rewrite to a `data-test` locator field; inside a spec, rewrite to `page.getByTestId(...)`.
- Never invent a `data-test`/accessible name; if the app lacks one, mark `// TODO: needs data-test` (the app team must add it).
- Route actions through the POM's `this.el.*` wrappers, not raw `page.locator(...)` chains in specs.

## Workflow

1. **Scan** the provided code and flag every brittle locator:
   XPath (`//div[...]`), `page.locator('.some-class')`, `:nth-child`, deep CSS descendant chains, index-based `.nth(3)`, and unanchored text matches.
2. **Rank the fix** per element using the resilience ladder; reach for `getByTestId` when the app already exposes a `data-test` attribute (usually the case here).
3. **Rewrite** each locator, preserving intent. Where the original relied on position/text that maps to no stable attribute, mark `// TODO: needs data-test` rather than inventing one.
4. **Emit a rewrite map** (before → after → why) so the change is reviewable.
5. **Note residual risk** — any swap you couldn't confirm without the real DOM.

## Output shape

```
Rewrite map
  ✗ page.locator('//button[2]')                  → ✓ page.getByTestId('continue')
  ✗ page.locator('.err-msg')                     → ✓ page.getByTestId('error')   // needs data-test
  ✗ page.locator('tr:nth-child(3) td')           → ✓ page.getByRole('row', { name: /Order 1042/ })
```
```typescript
// before — brittle CSS chain in a POM
this.submitButton = page.locator('.login-form button.submit');
// after — framework-convention data-test locator
this.submitButton = page.locator('[data-test="login-button"]');
```

## Guardrails

- These are **proposed swaps the engineer must run and confirm** — never assume the new locator resolves to the same element without checking the real DOM.
- Never invent a `data-test` or accessible name; if none exists, flag that the app needs one (`// TODO: needs data-test`).
- Prefer role/label semantics over testid when the app doesn't expose `data-test`; testid is the fallback, not the default.
- Do not silently change behavior (strictness, count) — call out multi-match risks.
