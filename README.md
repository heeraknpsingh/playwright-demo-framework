# Playwright Demo Framework

A production-grade UI + API automation framework for [demowebshop.tricentis.com](https://demowebshop.tricentis.com), built with Playwright, TypeScript, and the Page Object Model.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [OOP Concepts](#oop-concepts)
- [Setup](#setup)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Reporting](#reporting)
- [Logging](#logging)
- [Writing New Tests](#writing-new-tests)
- [Framework Architecture](#framework-architecture)
- [Assumptions](#assumptions)
- [Known Limitations](#known-limitations)

---

## Tech Stack

| Tool | Purpose |
|---|---|
| [Playwright](https://playwright.dev) | Browser automation & API testing |
| [TypeScript](https://www.typescriptlang.org) | Type-safe test code |
| [Winston](https://github.com/winstonjs/winston) | Structured logging |
| [dotenv](https://github.com/motdotla/dotenv) | Environment variable management |

---

## Project Structure

```
playwright-demo-framework/
├── .env                               # Local credentials (not committed)
├── .env.example                       # Template — copy to .env to get started
├── .gitignore
├── package.json
├── playwright.config.ts               # Playwright configuration
├── tsconfig.json
│
├── e2e/                               # Test specs
│   ├── ui/
│   │   ├── login.spec.ts              # Login UI tests           (TC_005–TC_009)
│   │   ├── defensive-security.spec.ts # Security detection tests (TC_010–TC_014)
│   │   ├── xss-input-validation.spec.ts # XSS / input tests     (TC_015–TC_023)
│   │   └── session-management.spec.ts # Session security tests   (TC_024–TC_028)
│   └── api/
│       └── login-api.spec.ts          # Login API tests          (TC_001–TC_004)
│
├── page-objects/                      # Page Object Model classes
│   ├── base/
│   │   └── BasePage.ts                # Abstract base class
│   ├── LoginPage.ts
│   └── HomePage.ts
│
├── fixtures/                          # Custom Playwright fixtures
│   ├── base.fixture.ts                # Main merged fixture (used in all tests)
│   ├── page.fixture.ts                # Page object fixtures
│   └── api.fixture.ts                 # API context fixture
│
├── helpers/                           # Playwright-aware helpers
│   ├── api.helper.ts                  # API request wrapper with auth management
│   ├── security.helper.ts             # CAPTCHA / MFA / rate-limit detection
│   ├── wait.helper.ts                 # Custom wait strategies
│   └── xss.helper.ts                  # XSS observation & reporting
│
├── utils/                             # Framework utilities
│   ├── logger.ts                      # Winston logger (file + console)
│   ├── env.loader.ts                  # .env loader & validator
│   └── date.utils.ts                  # Date/timestamp helpers
│
├── test-data/                         # Test data
│   ├── login.data.ts                  # Typed login test data
│   ├── xss-payloads.data.ts           # 40+ categorised XSS payloads
│   └── users.json                     # Static config
│
└── reports/                           # Auto-generated output
    ├── html/                          # Playwright HTML report
    ├── logs/                          # Winston log files (one per day)
    ├── screenshots/                   # Evidence screenshots
    └── results.json                   # JSON results for CI integration
```

---

## OOP Concepts

| Concept | Implementation |
|---|---|
| **Abstraction** | `BasePage` is an abstract class — concrete pages must implement `waitForPageLoad()` |
| **Inheritance** | `LoginPage` and `HomePage` both extend `BasePage` and inherit all shared helpers |
| **Encapsulation** | All locators are `private` inside page classes; tests interact only via public methods |
| **Polymorphism** | Each page overrides `waitForPageLoad()` with its own page-specific logic |
| **Interfaces** | `IUser`, `ILoginTestData`, `EnvConfig`, `ApiLoginResult`, `SecurityChallenge`, `XssObservation` define strict data contracts |

---

## Setup

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
# 1. Clone the repository
git clone <repo-url>
cd playwright-demo-framework

# 2. Install dependencies
npm install

# 3. Install Playwright browsers
npx playwright install

# 4. Configure environment
cp .env.example .env
# Edit .env with your credentials
```

---

## Configuration

All sensitive config lives in `.env` (never committed to version control):

```env
BASE_URL=https://demowebshop.tricentis.com
USER_EMAIL=your@email.com
USER_PASSWORD=YourPassword123@
HEADLESS=true
LOG_LEVEL=debug
SLOW_MO=0
```

| Variable | Description | Default |
|---|---|---|
| `BASE_URL` | Target application URL | `https://demowebshop.tricentis.com` |
| `USER_EMAIL` | Login email for the test user account | — |
| `USER_PASSWORD` | Login password for the test user account | — |
| `HEADLESS` | Run browsers headlessly | `true` |
| `LOG_LEVEL` | Winston log level (`debug`, `info`, `warn`, `error`) | `debug` |
| `SLOW_MO` | Milliseconds to slow down each browser action (useful for debugging) | `0` |

---

## Running Tests

```bash
# Run all tests
npm test

# Run by tag
npm run test:ui        # @ui  — Login UI tests
npm run test:api       # @api — Login API tests
npm run test:security  # @security — Defensive security detection
npm run test:xss       # @xss — XSS input validation
npm run test:session   # @session — Session management

# Run with browser visible
npm run test:headed

# Debug mode (Playwright Inspector)
npm run test:debug

# Run a specific file
npx playwright test e2e/ui/session-management.spec.ts

# Run a specific test case by ID
npx playwright test --grep "TC_024"

# View the HTML report after a run
npm run report
```

---

## Test Coverage

### API Tests — `@api` (TC_001–TC_004)

| ID | Test |
|---|---|
| TC_001 | Valid credentials return a successful login response |
| TC_002 | Invalid password returns an authentication error |
| TC_003 | Accessing the account endpoint without auth redirects to login |
| TC_004 | Non-existent email returns an authentication error |

### Login UI Tests — `@ui` (TC_005–TC_009)

| ID | Test |
|---|---|
| TC_005 | Valid login with correct credentials |
| TC_006 | Invalid password shows an error message |
| TC_007 | Unregistered email shows an error message |
| TC_008 | Empty credentials show validation errors |
| TC_009 | Logout after successful login |

### Defensive Security Detection — `@security` (TC_010–TC_014)

These tests **observe and document** the presence or absence of security mechanisms. They do not attempt to bypass them.

| ID | Test |
|---|---|
| TC_010 | Detect CAPTCHA or bot-protection on the login page |
| TC_011 | Detect MFA challenge after a valid login attempt |
| TC_012 | Detect rate-limiting after 6 repeated failed attempts |
| TC_013 | Detect account lockout after 5 invalid-password attempts |
| TC_014 | Detect bot-protection response headers from rapid API login requests |

### XSS Input Validation — `@xss` (TC_015–TC_023)

Tests submit 40+ payloads across 6 categories (script injection, HTML injection, event handlers, special characters, long input, and malformed input) and verify no XSS executes in the browser.

| ID | Test |
|---|---|
| TC_015 | Script injection payloads are blocked |
| TC_016 | HTML injection payloads are blocked |
| TC_017 | Event handler and JS URI payloads are blocked |
| TC_018 | Special characters are handled safely |
| TC_019 | SQL injection payloads do not grant access |
| TC_020 | Long input (1,000 chars) is handled without crash |
| TC_021 | Long input (10,000 chars) does not destabilise the server |
| TC_022 | Malformed and control-character inputs are handled safely |
| TC_023 | Browser-side XSS observation — critical payloads (dialogs, DOM, console, network) |

### Session Management — `@session` (TC_024–TC_028)

| ID | Test | Approach |
|---|---|---|
| TC_024 | Cookie replay observation after logout | Captures cookies pre-logout, injects them into a fresh browser context, documents whether the server invalidates the session |
| TC_025 | Protected pages are inaccessible after logout | Verifies `/customer/info`, `/order/history`, and `/customer/addresses` deny access after logout |
| TC_026 | Storage state replay observation after logout | Saves a full `storageState` snapshot (cookies + localStorage + sessionStorage), restores it post-logout, documents server behaviour |
| TC_027 | Multiple simultaneous sessions are isolated | Opens two separate `browser.newContext()` sessions with the same credentials, verifies isolation, and confirms logout from one context does not affect the other |
| TC_028 | Re-authentication restores protected access | Full lifecycle: login → access protected page → logout → verify blocked → re-authenticate → verify access restored |

---

## Reporting

After any test run, three report artefacts are generated automatically:

```bash
# Open the interactive HTML report
npm run report
```

| Report | Location | Contents |
|---|---|---|
| **HTML** | `reports/html/` | Interactive pass/fail view with screenshots, videos, traces, and all test attachments |
| **JSON** | `reports/results.json` | Machine-readable results for CI integration |
| **Winston logs** | `reports/logs/YYYY-MM-DD.log` | Structured per-test logs with timestamps and metadata |

Tests attach additional evidence to the HTML report:

- **Security reports** — plain-text verdict files (TC_010–TC_014, TC_024–TC_026)
- **XSS observation reports** — per-payload and batch summaries
- **Session reports** — cookie lists, storage snapshots, access control tables
- **Screenshots** — captured at key steps and always on failure
- **Page HTML source** — attached on failure for DOM inspection
- **Videos / traces** — retained on failure for step-by-step replay

---

## Logging

Every test automatically receives a named logger via `base.fixture.ts`. Logs are written to:

- **Console** — colourised, human-readable
- **File** — `reports/logs/YYYY-MM-DD.log` (one file per day, append)

Example output:

```
[2026-04-22 14:03:12] [INFO ] [TC_024 — Cookie replay] Step 1: user authenticated
[2026-04-22 14:03:13] [INFO ] [TC_024 — Cookie replay] Step 2: captured 9 cookies pre-logout
[2026-04-22 14:03:14] [WARN ] [TC_024 — Cookie replay] SECURITY FINDING: server did not invalidate session — cookie replay succeeded
[2026-04-22 14:03:15] [INFO ] [TC_024 — Cookie replay] Test PASSED: "[TC_024] — ..."
```

---

## Writing New Tests

### 1. Create a Page Object

```typescript
// page-objects/ProductPage.ts
import { Page, Locator } from '@playwright/test';
import { BasePage } from './base/BasePage';
import { Logger } from '../utils/logger';

export class ProductPage extends BasePage {
  private readonly addToCartButton: Locator;

  constructor(page: Page, logger: Logger) {
    super(page, logger);
    this.addToCartButton = page.locator('#add-to-cart-button');
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitForElement(this.addToCartButton);
  }

  async addToCart(): Promise<void> {
    await this.clickElement(this.addToCartButton, 'Add to cart');
  }
}
```

### 2. Register the fixture (optional — for frequent reuse)

```typescript
// fixtures/base.fixture.ts — add to BaseFixtures and test.extend
productPage: async ({ page, logger }, use) => {
  await use(new ProductPage(page, logger));
},
```

### 3. Write the test

```typescript
// e2e/ui/product.spec.ts
import { test, expect } from '../../fixtures/base.fixture';

test.describe('Product — UI Tests', { tag: '@ui' }, () => {
  test('[TC_030] — Add item to cart', async ({ loginPage, testUser, logger }) => {
    await loginPage.navigateToLogin();
    await loginPage.login(testUser.email, testUser.password);
    // ...
  });
});
```

### 4. Add test data

```typescript
// test-data/product.data.ts
export const productTestData = {
  book: { name: 'Computing and Internet', url: '/computing-and-internet' },
};
```

---

## Framework Architecture

```
Test File (e2e/)
    │
    ▼
base.fixture.ts          ← custom `test` object used by all specs
    │
    ├── logger            ← Winston logger scoped to test name
    ├── testUser          ← credentials from .env
    ├── env               ← full EnvConfig object
    ├── loginPage         ← LoginPage instance
    ├── homePage          ← HomePage instance
    ├── apiHelper         ← ApiHelper instance
    ├── securityHelper    ← SecurityHelper instance
    └── captureOnFailure  ← auto-fixture: screenshot + HTML on failure
            │
            ▼
    Page Objects (page-objects/)
            │
            ▼
    BasePage (abstract)   ← shared helpers: click, fill, wait, screenshot
```

### Data Flow

```
.env  ──►  env.loader.ts  ──►  base.fixture.ts  ──►  test
                                      │
                                      ├──►  page objects
                                      ├──►  api helper
                                      └──►  logger
```

---

## Assumptions

The following assumptions were made when designing and implementing this framework.

### Target Application

1. **Account pre-exists.** A registered user account is available at `USER_EMAIL` / `USER_PASSWORD`. The framework does not create or delete test accounts — it only uses the configured credentials.

2. **Single shared test account.** All tests (including the multi-context session tests in TC_027) log in with the same credentials. The application allows the same account to hold multiple concurrent sessions.

3. **Application availability.** The target app (`demowebshop.tricentis.com`) is publicly reachable and responsive. It is a shared, third-party demo instance not under this framework's control.

4. **Stable selectors.** DOM selectors (IDs, class names, `href` values) match the application as observed at the time of authoring. The app's HTML structure is assumed to be stable across runs.

5. **English locale.** All text-based assertions (error messages, page titles, keyword detection) assume the application responds in English.

6. **No e-commerce side effects.** Tests do not place real orders or modify account data beyond what logging in and out requires. The wishlist and cart are not asserted upon.

### Test Environment

7. **Sequential execution.** Tests run with a single Playwright worker (`workers: 1`) to prevent concurrent sessions from one test interfering with another's login state.

8. **Chromium only.** All tests target the `chromium` project. Cross-browser compatibility is not in scope for this iteration.

9. **No CI-managed state.** There is no `storageState` file shared between tests. Each test performs a fresh login where authentication is required.

10. **Network conditions are normal.** Tests do not simulate slow networks, offline mode, or packet loss.

### Security Tests (TC_010–TC_014, TC_024–TC_028)

11. **Defensive-testing philosophy.** Security detection tests (TC_010–TC_014) and session observation tests (TC_024, TC_026) observe and document the application's security posture rather than asserting it must pass or fail. A finding is reported through attached reports and log warnings, not a hard test failure. This approach prevents false CI failures when testing against a demo application with known limitations.

12. **Protected paths are stable.** The paths tested for access control (`/customer/info`, `/order/history`, `/customer/addresses`) are known to require authentication. Their redirect or denial behaviour is asserted accordingly.

13. **`isLoggedIn()` is a reliable session indicator.** The presence of the account link (`.header-links .account`) is taken as the ground truth for whether a session is active on a given page.

---

## Known Limitations

### Application-Level Limitations (demowebshop.tricentis.com)

1. **No server-side session invalidation on logout.**
   The application performs a client-side-only logout — it clears the session cookie from the browser but does not invalidate the token on the server. As a result, pre-logout cookies or a full `storageState` snapshot injected into a new browser context can still authenticate against the server. TC_024 and TC_026 observe and document this behaviour rather than hard-asserting, because the limitation belongs to the target app, not the framework. In a production target these tests should assert `expect(sessionStillActive).toBeFalsy()`.

2. **Inconsistent redirect behaviour on protected pages.**
   `/customer/info` redirects explicitly to `/login` after logout. Other protected paths (`/order/history`, `/customer/addresses`) return a "page not found" response without changing the URL to `/login`. TC_025 handles this with a two-condition access-denial check: URL contains `/login` **or** the header login link is visible (confirming the user is unauthenticated).

3. **No server-side session cross-invalidation.**
   Logging out in one browser context does not invalidate sessions held by other contexts for the same account. TC_027 documents this behaviour — concurrent sessions for the same user remain independent. This is common in demo apps but would be a security concern in production.

4. **CAPTCHA may block repeated login attempts.**
   Rapid or repeated login attempts (particularly in the brute-force and rate-limit tests) may trigger CAPTCHA challenges. The framework detects and documents CAPTCHA presence (TC_010) but cannot solve it. If triggered, affected tests will log a security challenge finding and continue with a documented observation rather than failing.

5. **Shared public demo instance.**
   The target is a publicly hosted, shared demo application. It may be slow, temporarily unavailable, or exhibit non-deterministic behaviour (e.g., a different user's activity affecting shared state). The framework does not control the environment.

6. **Rate-limiting and account lockout are non-deterministic.**
   Whether the application triggers rate-limiting (TC_012) or account lockout (TC_013) depends on recent activity from all users of the shared instance, not only the test run. These tests document the outcome of detection, not a guaranteed trigger.

### Framework-Level Limitations

7. **Single browser (Chromium only).**
   The Playwright project configuration targets Chromium exclusively. Firefox and WebKit are not covered. Browser-specific session handling or cookie behaviour differences are not tested.

8. **Single worker — no true parallel execution.**
   Tests run sequentially. This avoids session-state conflicts but increases total run time. Parallelism would require per-test isolated user accounts or a test isolation strategy not currently implemented.

9. **No visual regression testing.**
   Screenshots are captured as evidence and on failure, but there is no pixel-level or snapshot comparison against a baseline. Layout regressions will not be caught automatically.

10. **XSS tests are observation-based — not a WAF substitute.**
    XSS tests verify that specific payloads do not execute in the browser (no dialogs fire, no DOM mutation occurs, no unexpected network requests are made). They do not prove the application is free from all XSS vectors — only that the tested payloads are handled safely. A dedicated DAST scanner would be required for exhaustive coverage.

11. **API helper uses form-encoded POST — not JSON.**
    `ApiHelper` submits login requests as `application/x-www-form-urlencoded` (matching the application's form). APIs that expect `application/json` bodies would require a separate helper configuration.

12. **No mobile or responsive testing.**
    The viewport is fixed at 1280×720. Mobile viewports and responsive layout breakpoints are not tested.

13. **Session tests require the `browser` fixture — not available in API-only contexts.**
    TC_024, TC_026, and TC_027 use `browser.newContext()` to create isolated browser sessions. This requires a full browser process and cannot be run in Playwright's API-only (`request`) mode.
