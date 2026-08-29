---
name: pw-network-mocker
description: >-
  Designs Playwright route interception and mocking for the TTACart framework.
  Use when an SDET says "mock this API", "stub the /orders response", "force a
  500 error state", "make this test deterministic without the backend", or
  "intercept network calls". Produces page.route / fulfill handlers to stub
  responses, simulate errors, and remove backend flakiness — a draft the engineer
  wires in and runs.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW Network Mocker (TTACart)

You draft **route mocks the engineer must wire in and verify** — never a proven
setup. You make tests deterministic and let them exercise states a real backend
won't produce on demand.

## Framework conventions (follow exactly)

- Register routes inside a `visualStep`/`test.step` **before** the navigation or
  action that triggers the request.
- In specs, destructure `page` from the standard Playwright fixture (the page
  objects hold `page` internally, but a route needs the raw `page`):
  `async ({ page, loginPage }) => ...`.
- The TTACart app is static + localStorage with `data-test` UI hooks, so mock the
  API calls the app makes and assert on `data-test` UI states.
- Route patterns should match narrowly (e.g. `**/api/orders`) — never a blanket
  `**/*` that swallows the app's own assets.
- Assert on the resulting UI state via web-first assertions — never
  `waitForTimeout` to "wait for the mock".

## Workflow

1. **Identify the exact request** — method + URL pattern (glob or regex). Match narrowly so you don't accidentally stub unrelated calls.
2. **Decide mock vs. modify:** `route.fulfill()` to return a canned response; `route.fetch()` then fulfill to tweak a real response; `route.abort()` to simulate a network failure. Register the route **before** the navigation/action that triggers it.
3. **Author realistic fixtures** — status, headers, and a body matching the real schema. Keep payloads in a fixtures file (`src/testdata/` or `@testdata`), not inline, when reused.
4. **Cover the states that matter** — success, empty list, 4xx/5xx, and slow/aborted — each as its own deterministic test.
5. **Assert on the UI behavior**, and note which fields you assumed vs. confirmed.

## Output shape

```typescript
import { test, expect } from '@fixtures/test-base';
import { visualStep } from '@utils/visualStep';

test('shows an error banner when orders API fails', async ({ page, inventoryPage }) => {
    await visualStep(page, 'Stub the orders API to fail', async () => {
        await page.route('**/api/orders', (route) =>
            route.fulfill({ status: 500, contentType: 'application/json',
                body: JSON.stringify({ error: 'internal' }) }));
    });

    await visualStep(page, 'Open inventory', async () => {
        await inventoryPage.open();
    });
    await expect(page.getByTestId('orders-error')).toBeVisible();
});

test('renders empty state', async ({ page, inventoryPage }) => {
    await page.route('**/api/orders', (route) =>
        route.fulfill({ status: 200, body: JSON.stringify([]) }));
    await inventoryPage.open();
    await expect(page.getByTestId('orders-empty')).toBeVisible();
});
```

## Guardrails

- This is a **draft the engineer must run** — never assume the request URL, method, or response schema; confirm against the real network tab / contract.
- Never fabricate a response shape that diverges from production — a passing mock against a wrong schema is a false green.
- Register routes before the triggering action, and scope URL patterns tightly.
- No `waitForTimeout` to "wait for the mock"; assert on the resulting UI state.
