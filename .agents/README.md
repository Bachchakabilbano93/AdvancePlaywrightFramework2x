# Playwright Skills Pack — AdvancePlaywrightFramework2x

The [Playwright framework pack](https://github.com/PramodDutta/skillmasterclass/tree/main/skillmasterclass/skills/framework-packs/playwright-pack)
from the Skill Masterclass repo, adapted to this framework's conventions.

## Skills

| Skill | What it does |
| --- | --- |
| `pw-accessibility-auditor` | axe-core a11y checks (WCAG mapping, severity triage) |
| `pw-api-tester` | API tests via `request` fixture + AJV schema validation |
| `pw-ci-configurator` | GitHub Actions workflow (sharding, blob/HTML reports, artifacts) |
| `pw-fixture-designer` | Extend `src/fixtures/test-base.ts` with typed fixtures |
| `pw-flaky-debugger` | Root-cause flaky tests, web-first fixes |
| `pw-locator-fixer` | Rewrite brittle locators to `data-test`/role-based |
| `pw-network-mocker` | `page.route` stubs / error states |
| `pw-page-object-builder` | Build POMs extending `BasePage` |
| `pw-test-generator` | Generate specs using `@fixtures/test-base` + `visualStep` |
| `pw-trace-analyzer` | Read `trace.zip` and pinpoint root cause |
| `pw-visual-regression` | `toHaveScreenshot` with masking + baselines |

## How the skills are adapted

Every skill follows the framework's real conventions:

- **Fixtures:** `test`/`expect` come from `@fixtures/test-base` (never `@playwright/test`), with the 7 page-object fixtures + 4 state fixtures (`validLogin`, `loginWithInventory`, ...).
- **POMs:** extend `src/pages/BasePage.ts`, `data-test` locators, `this.el.*` action wrappers, in-POM `assertLoaded()` assertions, Winston logging.
- **Steps:** every action wrapped in `visualStep(page, 'Title', ...)` — the custom TTA reporter (`src/utils/CustomReporter.ts`) matches `step-<index>-<slug>` attachments.
- **Selectors:** `data-test` / role / label first; never XPath, `nth-child`, CSS classes.
- **Assertions:** web-first, auto-retrying; no `waitForTimeout` / `networkidle`.
- **Env/config:** `.env` is the single source; `@config/env` helpers (`requireEnv`, `envOr`, `assertEnv`); `@config/credentials` for login.
- **Tags:** `@P0 @Regression ...` in describe titles; `@p0` suffix in test titles.
- **Run:** `npx playwright test` (no npm scripts).

## Availability

The pack lives in `.agents/skills/`, which is auto-discovered by:

- **Command Code** — project skills from `.agents/skills/` (shows a `[.agents]` badge in `/skills`). Verify with `cmd skills list`.
- **GitHub Copilot** — project skills from `.github/skills`, `.claude/skills`, or `.agents/skills`.

`.commandcode/skills/` is the other Command Code location, but this repo gitignores
`.commandcode/`, so `.agents/skills/` keeps the pack version-controlled and shared
with the team (and with Copilot).
