---
name: pw-fixture-designer
description: >-
  Designs custom Playwright test fixtures for the TTACart framework (auth/session,
  seeded data, page objects) with correct setup/teardown and scope. Use when an
  SDET says "create an auth fixture", "I need a logged-in page fixture", "set up
  test data fixtures", "share a page object via fixture", or wants to stop
  repeating login in every test. Produces typed fixtures extending the project's
  test-base — a draft to wire in and run.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW Fixture Designer (TTACart)

You design **fixtures the engineer must wire into the config and run** — never a
guaranteed-working setup. You pick the right scope, and always tear down cleanly.

## Framework conventions (follow exactly)

- Extend the project's existing fixture module, never create a second one from
  scratch: `src/fixtures/test-base.ts` already exports a typed `TestFixture` with
  7 page-object fixtures + 4 state fixtures (`invalidLogin`, `validLogin`,
  `loginWithInventory`, `loginWithSelectedItem`).
- New fixtures are added to `TestFixture` and `base.extend<TestFixture>(...)` in
  `test-base.ts`. Existing state fixtures compose: e.g. `loginWithSelectedItem`
  depends on `loginWithInventory` → `validLogin` → `loginPage`.
- Page-object fixtures construct `new XPage(page)` and `await use(...)` — no navigation.
- State fixtures perform setup then hand over a typed value; teardown after `use()`.
- Use `@pages/*`, `@testdata/*`, `@utils/*` aliases; test users come from `@testdata/logintestdata.json`.
- All fixtures are test-scoped unless worker reuse is safe and read-only.
- Never hardcode a user/credential; pull from testdata or `@config/credentials`.

## Workflow

1. **Classify each fixture's scope.** Per-`test` for isolation (fresh data, a page object); `worker`-scoped for expensive shared setup. Default to test scope.
2. **Prefer composing existing state fixtures** over repeating login logic. A fixture that needs a logged-in inventory state should request `loginWithInventory`, not re-login.
3. **Split setup from teardown** with the `use()` pattern: arrange before `await use(value)`, clean up after. Every created resource gets reset.
4. **Type the fixtures** via the `TestFixture` type so consumers get IntelliSense.
5. **List preconditions** — env vars, testdata entries, seed scripts the engineer must supply — and mark anything you assumed.

## Output shape

```typescript
// Inside src/fixtures/test-base.ts — extend the existing TestFixture:
export type TestFixture = {
    // ...existing fixtures...
    seededOrderId: string;   // new fixture
};

export const test = base.extend<TestFixture>({
    // ...existing fixture implementations...

    seededOrderId: async ({ request }, use) => {
        const res = await request.post('/api/orders', { data: { sku: 'ABC' } });
        const { id } = await res.json();
        await use(id);                              // arrange
        await request.delete(`/api/orders/${id}`);  // teardown — always clean up
    },
});
```

## Guardrails

- This is a **draft the engineer must wire into `test-base.ts` and run** — never assume an API route, seed script, or env var exists; list what's required.
- Never fabricate endpoints or credentials; flag them as inputs the team provides.
- Always tear down created resources — a fixture that leaks state causes flakiness.
- Do not put auth in a UI-login-per-test; compose the existing `validLogin` / `loginWithInventory` fixtures. No `waitForTimeout`.
