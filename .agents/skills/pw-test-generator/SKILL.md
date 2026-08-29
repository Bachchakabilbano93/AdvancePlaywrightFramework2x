---
name: pw-test-generator
description: >-
  Generates a Playwright (TypeScript) test spec for the TTACart framework from a
  described user flow or scenario. Use when an SDET says "write a Playwright test
  for login", "generate a spec for the checkout flow", "turn this scenario into a
  test", or pastes acceptance criteria that need automating. Produces a runnable
  draft using data-test locators, web-first assertions, visualStep, and the
  framework's fixtures — the engineer still runs it.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW Test Generator (TTACart)

You draft a **Playwright spec the engineer must still run and review** — never a
"finished" test. Translate a flow into resilient, framework-convention code.

## Framework conventions (follow exactly)

- Import `test` and `expect` from `@fixtures/test-base` (the project's custom
  test, pre-wired with TTACart Page Object fixtures). Never `@playwright/test`.
- Place specs in `src/tests/<suite>/`, named `<suite>-<scenario>.spec.ts` (e.g. `src/tests/e2e/e2e-checkout.spec.ts`).
- Destructure page objects directly from test args: `async ({ loginPage, inventoryPage, cartPage }) =>`.
- Use the provided state fixtures instead of hand-rolled setup:
  `invalidLogin`, `validLogin`, `loginWithInventory`, `loginWithSelectedItem`.
- Wrap every step in `visualStep(page, 'Human readable title', async () => { ... })`
  (from `@utils/visualStep`) and log with a scoped logger:
  `const log = createLogger('my-spec')` from `@utils/logger`, then `log.info(...)`.
- Use `data-test` locators (`page.getByTestId('...')` or `page.locator('[data-test="..."]')`), never XPath/CSS-class/nth-child.
- Use web-first, auto-retrying assertions (`await expect(locator).toBeVisible()`, `toHaveText`, `toHaveURL`). No `waitForTimeout`, no `networkidle`.
- Tag the describe title with the reporter's tags, e.g. `test.describe('@P0 @Regression E2E @Checkout Checkout Feature', ...)`. Test titles read as behavior sentences (`'should complete checkout successfully'`).
- Use `@config/credentials` (`credentials.standardUser`, `credentials.password`) or `@testdata/logintestdata.json` for users; `@utils/DataGenerator` for generated data.
- Env-driven specs call `assertEnv(...)` / `requireEnv(...)` from `@config/env` at module load.

## Workflow

1. **Restate the flow** as ordered steps (arrange → act → assert). Confirm the entry URL, the user role, and the observable success signal.
2. **Map each step to a locator strategy.** Prefer `getByRole` (with accessible name), then `getByLabel`, then `getByTestId`. Flag any step where you had to guess a selector — mark it `// TODO: confirm selector`.
3. **Choose the fixture** — page-object fixtures for direct interaction, state fixtures for pre-authenticated flows.
4. **Draft the spec** with a clear `test.describe`, one `test` per scenario, `visualStep` wrappers, and logging.
5. **List assumptions** — selectors guessed, data needed, preconditions — so the engineer can verify before running.

## Output shape

```typescript
import { test, expect } from '@fixtures/test-base';
import { credentials } from '@config/credentials';
import { createLogger } from '@utils/logger';
import { visualStep } from '@utils/visualStep';

const log = createLogger('e2e-checkout');

test.describe('@P0 @Regression E2E @Checkout Checkout Feature', () => {
    test('should complete checkout successfully', async ({ loginPage, inventoryPage, cartPage }) => {
        await visualStep(page, 'Log in with standard user', async () => {
            log.info('Logging in with standard user');
            await loginPage.open();
            await loginPage.loginAs(credentials.standardUser, credentials.password);
        });

        await visualStep(page, 'Add item to cart', async () => {
            await inventoryPage.addToCart('tta-bike-light');
        });

        await visualStep(page, 'Open cart', async () => {
            await cartPage.open();
            expect(await cartPage.rowCount()).toBe(1);
        });
    });
});
```

> **Note:** `page` is not a fixture in this framework — use the page object's
> methods (they hold `page` internally). If you need a raw `Page`, add it via the
> standard Playwright `page` fixture: `async ({ page, loginPage }) =>`.

## Guardrails

- This is a **draft the engineer must run and review** — never assume a selector exists; mark every guessed locator with `// TODO: confirm`.
- Never fabricate a `data-test`, route, or accessible name you weren't shown.
- No `waitForTimeout`, no `networkidle`, no manual sleeps — use web-first waits.
- No XPath, no `nth-child`, no CSS-class selectors; role/testid/label only.
- Assert observable state, not implementation details.
