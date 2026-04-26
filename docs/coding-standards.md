# Playwright Framework — Coding Standards

These rules are enforced automatically via pre-commit hooks (ESLint, Prettier, standards-checker, AI review).
All contributors must follow these standards. Violations block commits.

---

## Rule 1 — Test ID Format

Every `test()` title must follow this exact format: `[TC_XXX] — description`

Rules:
- Title must **start** with `[` (opening bracket)
- ID must use the prefix `TC_` immediately after `[`
- ID must **end** with `]` (closing bracket)
- Full pattern: `[TC_XXX]` where `XXX` is an alphanumeric identifier (e.g. `001`, `AI_001`)

**Why:** Enables traceability between test cases and requirements. IDs are referenced in reports, CI output, and audit trails. Malformed IDs break report parsers and test filters.

```ts
// CORRECT
test("[TC_005] — Valid login with correct credentials", async () => { ... });
test("[TC_AI_001] — Account info page loads for logged-in user", async () => { ... });

// WRONG — no opening bracket
test("TC_005 — Valid login with correct credentials", async () => { ... });

// WRONG — missing TC_ prefix inside brackets
test("[005] — Valid login with correct credentials", async () => { ... });

// WRONG — bracket not closed
test("[TC_005 — Valid login with correct credentials", async () => { ... });

// WRONG — no ID at all
test("Valid login with correct credentials", async () => { ... });
```

---

## Rule 2 — Fixture Imports

Spec files must import `test` and `expect` from `../../fixtures/base.fixture`, never directly from `@playwright/test`.

**Why:** The base fixture wires up `captureOnFailure`, logger, page objects, and all helpers automatically. Importing directly from `@playwright/test` bypasses all of these.

```ts
// CORRECT
import { test, expect } from "../../fixtures/base.fixture";

// WRONG
import { test, expect } from "@playwright/test";
```

---

## Rule 3 — Logger Over Console

All logging in `helpers/`, `page-objects/`, `utils/`, and `e2e/` must use the injected `logger` instance.
`console.log`, `console.warn`, `console.error`, and `console.info` are forbidden.

**Why:** The Winston logger masks sensitive fields (passwords, tokens), writes to daily log files, and attaches structured output to the Playwright HTML report. `console.*` bypasses all of this.

```ts
// CORRECT
this.logger.info("Navigating to login page");
this.logger.error("Login failed", { status, errors });

// WRONG
console.log("Navigating to login page");
console.error("Login failed");
```

---

## Rule 4 — Page Object Contract

Every class in `page-objects/` must:
- Extend `BasePage`
- Implement the abstract method `waitForPageLoad(): Promise<void>`

**Why:** `BasePage` provides shared locators, screenshot utilities, and navigation methods. `waitForPageLoad()` ensures tests wait for the correct DOM state before interacting.

```ts
// CORRECT
export class AccountPage extends BasePage {
  async waitForPageLoad(): Promise<void> {
    await this.waitForElement(this.someLocator);
  }
}

// WRONG — missing extends and waitForPageLoad
export class AccountPage {
  async doSomething() { ... }
}
```

---

## Rule 5 — Test Tags Required

Every `test.describe()` block must declare at least one tag.

**Allowed tags:** `@ui`, `@api`, `@security`, `@xss`, `@session`, `@a11y`, `@performance`

**Why:** Tags are used by CI to run targeted test subsets (`npm run test:ui`, `npm run test:a11y`, etc.). Untagged tests are excluded from all CI runs and will never execute in the pipeline.

```ts
// CORRECT
test.describe("Login — UI Tests", { tag: "@ui" }, () => { ... });

// WRONG — no tag
test.describe("Login — UI Tests", () => { ... });
```

---

## Rule 6 — No Hardcoded Credentials

Test files must never hardcode email addresses or passwords as string literals.
Always use the `testUser` fixture provided by `base.fixture.ts`.

**Why:** Hardcoded credentials end up in git history, are exposed in logs, and break when the test account changes.

```ts
// CORRECT
test("...", async ({ testUser }) => {
  await loginPage.login(testUser.email, testUser.password);
});

// WRONG
await loginPage.login("user@example.com", "Password123");
```

---

## Rule 7 — No Hardcoded Base URLs

Never hardcode the application URL as a string literal in tests or helpers.
Use `envConfig.baseUrl` from `utils/env.loader.ts` or Playwright's `baseURL` config.

**Why:** The framework targets different environments (local, staging, production) via the `BASE_URL` env variable. Hardcoded URLs make environment switching impossible.

```ts
// CORRECT
await page.goto(envConfig.baseUrl + "/customer/info");

// WRONG
await page.goto("https://demowebshop.tricentis.com/customer/info");
```

---

## Rule 8 — Evidence Capture on Failure Tests

Any `test()` whose title contains the words `invalid`, `error`, `fail`, or `wrong` must call
`captureEvidence()` and attach the result to the test report.

**Why:** Negative test cases document security and validation boundaries. Screenshot evidence is required for audit trails and bug reports.

```ts
// CORRECT
test("[TC_006] — Invalid password shows error message", async ({ loginPage }) => {
  await loginPage.login(email, wrongPassword);
  const screenshot = await loginPage.captureEvidence("tc006-invalid-password");
  await test.info().attach("auth-failure-screenshot", {
    body: screenshot,
    contentType: "image/png",
  });
  expect(await loginPage.isErrorVisible()).toBeTruthy();
});

// WRONG — no evidence capture
test("[TC_006] — Invalid password shows error message", async ({ loginPage }) => {
  await loginPage.login(email, wrongPassword);
  expect(await loginPage.isErrorVisible()).toBeTruthy();
});
```

---

## Summary Table

| # | Rule | Scope | Severity |
|---|------|-------|----------|
| 1 | Test ID format `[TC_XXX]` required | `e2e/**/*.spec.ts` | Error |
| 2 | Import from `fixtures/base.fixture` | `e2e/**/*.spec.ts` | Error |
| 3 | No `console.*` — use `logger` | All `.ts` files | Error |
| 4 | Page objects extend `BasePage` + implement `waitForPageLoad` | `page-objects/**/*.ts` | Error |
| 5 | Test tags required on `describe` blocks | `e2e/**/*.spec.ts` | Error |
| 6 | No hardcoded credentials | `e2e/**/*.spec.ts` | Error |
| 7 | No hardcoded base URLs | All `.ts` files | Warning |
| 8 | Evidence capture on negative tests | `e2e/**/*.spec.ts` | Warning |

Errors block commits. Warnings are shown as feedback but do not block.
