---
name: pw-ci-configurator
description: >-
  Generates CI configuration (GitHub Actions) for the TTACart Playwright suite.
  Use when an SDET says "set up Playwright in CI", "add a GitHub Actions
  workflow", "shard my tests across jobs", "upload traces and the HTML report",
  or "run browsers in a matrix". Produces a workflow with install, sharding,
  blob/HTML reporting, and artifacts matching the repo's existing setup — a draft
  the engineer commits and runs on their pipeline.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW CI Configurator (TTACart)

You draft a **CI workflow the engineer must commit and run on their runner** —
never a guaranteed-green pipeline. You wire in sharding, reporting, and artifacts.

## Framework conventions (follow exactly)

- The repo already has `.github/workflows/playwright.yml` (ubuntu-latest, Node
  LTS, `npm ci`, `npx playwright install --with-deps`, `npx playwright test`,
  upload `playwright-report/`). Extend that file — don't create a second workflow.
- The framework runs via `npx playwright test` (no npm scripts). Config already
  sets `retries: process.env.CI ? 2 : 0`, `workers: process.env.CI ? 1`, and
  `forbidOnly: !!process.env.CI`, so CI runs are already serial with retries.
- Only Chromium is active (other projects are commented out) — install just
  `chromium`, not all browsers.
- The config's `baseURL` is env-driven via `resolveBaseURL()` (`.env` not
  committed; CI must set `TTA_ENV` / `QA_BASE_URL` / `API_BASE_URL` as repo
  secrets or workflow env). Never hardcode credentials.
- The custom TTA reporter writes `tta-report/`; the HTML report goes to
  `playwright-report/`. Both are gitignored artifacts — upload them with
  `actions/upload-artifact`.
- The `.env` file is gitignored. In CI, feed env via `env:` on the test step or
  `secrets.*` — reference names like `TTA_SECRET`, `STANDARD_USER`, `CHECKOUT_*`.

## Workflow

1. **Confirm the runtime** — Node version, package manager, and which projects/browsers must run. Don't assume; ask if unstated.
2. **Install correctly** — cache deps (`actions/setup-node` with `cache: npm`), then `npx playwright install --with-deps chromium` (only the active browser).
3. **Shard for speed** — a matrix of `shardIndex/shardTotal`, each job running `--shard=${{ matrix.shardIndex }}/${{ matrix.shardTotal }}` with the **blob** reporter, then a final `merge-reports` job to produce one HTML report.
4. **Persist evidence** — the config already sets `trace: 'on'` + `video: 'on'`; upload the blob reports, merged HTML report, `test-results/` traces/videos, and `tta-report/` with `if: always()`.
5. **Set CI ergonomics** — keep the existing `retries`/`workers` from config, and use `fail-fast: false` so one shard's failure doesn't cancel the others.

## Output shape

```yaml
name: playwright
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 60
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: lts/*, cache: npm }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --shard=${{ matrix.shard }}/4 --reporter=blob
        env:
          TTA_ENV: qa
          QA_BASE_URL: ${{ secrets.QA_BASE_URL }}
      - uses: actions/upload-artifact@v4
        if: always()
        with: { name: blob-${{ matrix.shard }}, path: blob-report, retention-days: 7 }
```

## Guardrails

- This is a **draft the engineer must commit and run** — never assume the Node version, package manager, browser set, or secret names; confirm them.
- Never hardcode credentials; reference `secrets.*` or workflow `env:`, don't invent values.
- Shards emit **blob** reports merged in a follow-up job — don't upload conflicting HTML reports per shard.
- Upload artifacts with `if: always()` or you lose evidence on the runs that matter.
