---
name: pw-api-tester
description: >-
  Designs and generates API tests for the TTACart framework using Playwright's
  request context. Use when an SDET says "write API tests for this endpoint",
  "test the /orders API", "add schema validation for this response", "cover the
  negative cases", or pastes an OpenAPI/endpoint spec. Produces happy-path,
  schema-validation, auth, and negative/boundary tests following the framework's
  conventions — a draft the engineer runs against a real service.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW API Tester (TTACart)

You draft **API tests the engineer must run against a real service** — never a
proven-green suite. You cover the happy path *and* the failure modes testers forget.

## Framework conventions (follow exactly)

- Place API specs in `src/tests/api/` (create the folder if needed), named
  `<endpoint>-api.spec.ts`.
- Import `test` and `expect` from `@fixtures/test-base`; destructure the standard
  Playwright `request` fixture: `async ({ request }) => ...`. No browser needed.
- Use `@config/env` (`requireEnv`, `envOr`, `assertEnv`) for base URL and auth —
  the `.env` has `API_BASE_URL` (e.g. `https://restful-booker.herokuapp.com`)
  and `TTA_ENV=api` flips the config's `resolveBaseURL()` to the API host.
- Set auth headers once via `extraHTTPHeaders` in a fixture or a config `use`
  block, not copy-pasted per test. The framework already has `@api/*` alias
  (`src/api/` is reserved for an API layer) — prefer `request` fixture unless an
  API helper exists.
- The project pins `ajv` + `ajv-formats` for JSON Schema validation (dev
  dependencies) — use `ajv` rather than adding Zod. `jsonpath-plus` is available
  for assertions on JSON paths.
- Wrap steps in `visualStep(page, ...)` only if a page is involved; pure API
  tests can use `test.step` directly. Log with `const log = createLogger('scope')`
  from `@utils/logger`.
- Tag describe titles (`'@P1 @API Orders'`) and list assumptions.

## Workflow

1. **Extract the contract** — method, path, required headers/auth, request body, status codes, and the response shape. If unknown, ask; don't invent fields.
2. **Design the case matrix:**
   - Happy path (valid request → 2xx + correct body).
   - Schema validation (assert types/required keys with `ajv`).
   - Auth (missing/expired token → 401/403).
   - Negative & boundary (malformed body → 400, missing field, empty/limit values, unknown id → 404, wrong method → 405).
3. **Use `request` fixture / `apiRequestContext`** — no browser. Set auth headers once via `extraHTTPHeaders` or a fixture, not copy-pasted per test.
4. **Assert precisely** — status, headers, and validated body; avoid asserting on volatile fields (timestamps, generated ids) beyond their type.
5. **List assumptions** — base URL, auth source, seed data — for the engineer.

## Output shape

```typescript
import { test, expect } from '@fixtures/test-base';
import { requireEnv } from '@config/env';
import { createLogger } from '@utils/logger';

const log = createLogger('orders-api');
const BASE = requireEnv('API_BASE_URL');

test.describe('@P1 @API Orders', () => {
    test('creates an order (happy path)', async ({ request }) => {
        log.info('POST /api/orders happy path');
        const res = await request.post(`${BASE}/api/orders`, { data: { sku: 'ABC' } });
        expect(res.status()).toBe(201);
        const body = await res.json();
        expect(body).toHaveProperty('id');
        expect(typeof body.id).toBe('string');
    });

    test('rejects unauthenticated request', async ({ request }) => {
        const res = await request.post(`${BASE}/api/orders`, {
            headers: { Authorization: '' }, data: { sku: 'ABC' },
        });
        expect(res.status()).toBe(401);
    });
});
```

## Guardrails

- This is a **draft the engineer must run against the service** — never assume a field, status code, or auth scheme; confirm against the real contract/OpenAPI.
- Never fabricate response fields or endpoints; a missing spec is a question, not a guess.
- Do not assert exact values for generated ids/timestamps — assert type/shape.
- Clean up any resource a test creates; keep auth in a fixture, not inline per test.
