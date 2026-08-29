---
name: pw-page-object-builder
description: >-
  Builds a Playwright Page Object Model class for the TTACart framework. Use when
  an SDET says "make a page object for the login page", "build a POM for the
  dashboard", "extract locators into a page class", or wants to refactor inline
  selectors into a reusable class. Produces a POM extending BasePage with
  data-test locators, action methods, and a static PATH following the framework
  conventions — a draft to review.
license: MIT
metadata:
  author: TheTestingAcademy
  pack: playwright
  version: 2.0.0
---

# PW Page Object Builder (TTACart)

You draft a **Page Object class the engineer must wire up and verify** — never a
finished, guaranteed-correct class. You encode resilient `data-test` locators,
thin `el`-wrapped actions, and clear state assertions that match the framework.

## Framework conventions (follow exactly)

- Extend `BasePage` (`src/pages/BasePage.ts`); call `super(page, 'ClassName')`.
- Declare `static readonly PATH` as the page route (e.g. `'/playwright/ttacart/checkout-step-one.html'`).
- Declare `private readonly` `Locator` fields, built from `page.locator('[data-test="..."]')` in the constructor. Never CSS classes, XPath, `nth-child`.
- Action methods are thin wrappers over `this.el.*` (`UtilElementLocator`):
  `click`, `fill`, `getText`, `getValue`, `waitForVisible`, `waitForHidden`, `selectByText`, `count`, `getAllTexts`.
- State/assertion methods live **inside** the POM (import `expect` from `@playwright/test` directly) and are named `assertLoaded()` / `assertOrderComplete()` etc. They use web-first `await expect(locator)...`.
- Every method logs via `this.log.info(...)` / `this.log.debug(...)` (Winston scoped logger).
- Use path alias imports inside the class (`@utils/...`), and `import { BasePage } from './BasePage'` for the base (relative, matching existing pages).
- Keep assertions in the POM, but never auto-navigate in an assertion method; navigate in `open()`.
- If the class exceeds ~50 locators, split into sub-page classes and say so.

## Workflow

1. **Identify the page's role** and its stable entry path → `static readonly PATH`.
2. **Inventory the elements** tests interact with (form fields, buttons, error box). Map each to its `data-test` attribute.
3. **Add action methods** with explicit return types (`Promise<void>` / typed returns), orchestrated via `this.el.*`.
4. **Add state assertions** (`assertLoaded()`) using web-first `expect`.
5. **Flag guessed selectors** with `// TODO: confirm` and list them for review.

## Output shape

```typescript
// src/pages/MyPage.ts — always extend BasePage
import { expect, Locator, Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class MyPage extends BasePage {
    static readonly PATH = '/playwright/ttacart/my-page.html';

    private readonly title: Locator;
    private readonly saveButton: Locator;

    constructor(page: Page) {
        super(page, 'MyPage');
        this.title = page.locator('[data-test="title"]');
        this.saveButton = page.locator('[data-test="save-button"]');
    }

    async open(): Promise<void> {
        await this.goto(MyPage.PATH);
        await this.assertLoaded();
    }

    async assertLoaded(): Promise<void> {
        await expect(this.title).toHaveText('My Page');
        await expect(this.saveButton).toBeVisible();
    }

    async save(): Promise<void> {
        this.log.info('Save');
        await this.el.click(this.saveButton);
    }
}
```

## Guardrails

- This is a **draft the engineer must run and review** — never assume a selector, `data-test`, or PATH exists; mark guesses with `// TODO: confirm`.
- Never fabricate accessible names or `data-test` attributes you weren't shown.
- Locators are `private readonly` fields (lazy re-query) — never store resolved elements or `ElementHandle`.
- No XPath / `nth-child` / CSS-class selectors. No `waitForTimeout`.
- Cap at ~50 locators per class; split into sub-pages when larger.
