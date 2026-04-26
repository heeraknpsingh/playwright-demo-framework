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
- [CI/CD](#cicd)
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
| [axe-core / @axe-core/playwright](https://github.com/dequelabs/axe-core-npm) | WCAG 2.1 AA accessibility scanning |
| [lighthouse](https://github.com/GoogleChrome/lighthouse) | Client-side performance auditing via Chrome DevTools Protocol |
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
│   │   ├── login.spec.ts              # Login UI tests           (TC-005–TC-009)
│   │   ├── defensive-security.spec.ts # Security detection tests (TC-010–TC-014)
│   │   ├── xss-input-validation.spec.ts # XSS / input tests     (TC-015–TC-023)
│   │   ├── session-management.spec.ts # Session security tests   (TC-024–TC-028)
│   │   ├── accessibility.spec.ts      # WCAG 2.1 AA a11y tests  (TC-029–TC-037)
│   │   └── performance.spec.ts        # Lighthouse perf audits  (TC-PERF_001–004)
│   └── api/
│       └── login-api.spec.ts          # Login API tests          (TC-001–TC-004)
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
│   ├── xss.helper.ts                  # XSS observation & reporting
│   ├── accessibility.helper.ts        # axe-core wrapper, violation formatting
│   └── lighthouse.helper.ts           # Lighthouse audit runner, threshold assertion, report attachment
│
├── utils/                             # Framework utilities
│   ├── logger.ts                      # Winston logger (file + console)
│   ├── env.loader.ts                  # .env loader & validator
│   └── date.utils.ts                  # Date/timestamp helpers
│
├── test-data/                         # Test data
│   ├── login.data.ts                  # Typed login test data
│   ├── xss-payloads.data.ts           # 40+ categorised XSS payloads
│   ├── performance.data.ts            # Lighthouse budget thresholds and page configs
│   └── users.json                     # Static config
│
├── .github/
│   └── workflows/
│       └── performance.yml            # GitHub Actions — Lighthouse CI job
│
└── reports/                           # Auto-generated output
    ├── html/                          # Playwright HTML report (all projects merged)
    ├── lighthouse/                    # Lighthouse HTML + JSON reports per page per run
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
npm run test:ui        # @ui       — Login UI tests
npm run test:api       # @api      — Login API tests
npm run test:security  # @security — Defensive security detection
npm run test:xss       # @xss      — XSS input validation
npm run test:session   # @session  — Session management
npm run test:a11y        # @a11y        — Accessibility (WCAG 2.1 AA)
npm run test:performance # @performance — Lighthouse client-side performance audits

# Run everything (all tags, all projects) in a single Playwright process
npm run test:all

# Run with browser visible
npm run test:headed

# Debug mode (Playwright Inspector)
npm run test:debug

# Run a specific file
npx playwright test e2e/ui/session-management.spec.ts

# Run a specific test case by ID
npx playwright test --grep "TC-024"

# View the HTML report after a run
npm run report
```

---

## Test Coverage

### API Tests — `@api` (TC-001–TC-004)

| ID | Test |
|---|---|
| TC-001 | Valid credentials return a successful login response |
| TC-002 | Invalid password returns an authentication error |
| TC-003 | Accessing the account endpoint without auth redirects to login |
| TC-004 | Non-existent email returns an authentication error |

### Login UI Tests — `@ui` (TC-005–TC-009)

| ID | Test |
|---|---|
| TC-005 | Valid login with correct credentials |
| TC-006 | Invalid password shows an error message |
| TC-007 | Unregistered email shows an error message |
| TC-008 | Empty credentials show validation errors |
| TC-009 | Logout after successful login |

### Defensive Security Detection — `@security` (TC-010–TC-014)

These tests **observe and document** the presence or absence of security mechanisms. They do not attempt to bypass them.

| ID | Test |
|---|---|
| TC-010 | Detect CAPTCHA or bot-protection on the login page |
| TC-011 | Detect MFA challenge after a valid login attempt |
| TC-012 | Detect rate-limiting after 6 repeated failed attempts |
| TC-013 | Detect account lockout after 5 invalid-password attempts |
| TC-014 | Detect bot-protection response headers from rapid API login requests |

### XSS Input Validation — `@xss` (TC-015–TC-023)

Tests submit 40+ payloads across 6 categories (script injection, HTML injection, event handlers, special characters, long input, and malformed input) and verify no XSS executes in the browser.

| ID | Test |
|---|---|
| TC-015 | Script injection payloads are blocked |
| TC-016 | HTML injection payloads are blocked |
| TC-017 | Event handler and JS URI payloads are blocked |
| TC-018 | Special characters are handled safely |
| TC-019 | SQL injection payloads do not grant access |
| TC-020 | Long input (1,000 chars) is handled without crash |
| TC-021 | Long input (10,000 chars) does not destabilise the server |
| TC-022 | Malformed and control-character inputs are handled safely |
| TC-023 | Browser-side XSS observation — critical payloads (dialogs, DOM, console, network) |

### Performance — `@performance` (TC-PERF_001–TC-PERF_004)

Lighthouse audits run via the `lighthouse` npm package connected directly to Playwright's Chromium instance over the Chrome DevTools Protocol (CDP). Each test navigates to the target page, runs a full Lighthouse audit, and enforces the score budgets below. Budget violations fail the test and block CI.

**Score budgets**

| Category | Threshold | What it measures |
|---|---|---|
| Performance | ≥ 50 | Core Web Vitals: FCP, LCP, TBT, CLS, Speed Index, TTI |
| Accessibility | ≥ 70 | Missing labels, heading order, ARIA attributes, colour contrast |
| Best Practices | ≥ 80 | Vulnerable JS libraries, HTTPS, browser errors |
| SEO | ≥ 40 | Meta descriptions, crawlable links, indexing directives |

**Tests**

| ID | Page | Auth required |
|---|---|---|
| TC-PERF_001 | Home (`/`) | No |
| TC-PERF_002 | Login (`/login`) | No |
| TC-PERF_003 | Account / profile (`/customer/info`) | Yes — logs in via `LoginPage` fixture |
| TC-PERF_004 | Order history (`/customer/orders`) | Yes — logs in via `LoginPage` fixture |

Each test attaches the full Lighthouse HTML report to the Playwright HTML report (visible per-test under the **Attachments** tab) and saves both `.html` and `.json` files to `reports/lighthouse/`.

**How it works under the hood**

Lighthouse connects to Chrome via CDP on port `9222`. The `performance` Playwright project launches Chromium with `--remote-debugging-port=9222`. The `LighthouseHelper.runAudit()` method:

1. Calls `lighthouse(url, { port: 9222, disableStorageReset: true, ... })` — `disableStorageReset` preserves the session so authenticated pages stay accessible during the audit.
2. Saves `report[0]` (HTML) and `report[1]` (JSON) to `reports/lighthouse/<name>-<timestamp>.*`.
3. Reads each category's `score` (0–1 scale, multiplied by 100) and throws if any falls below the configured threshold.

---

### Accessibility — `@a11y` (TC-029–TC-037)

Tests use **axe-core** (`@axe-core/playwright`) for automated WCAG 2.1 AA scanning, supplemented by targeted keyboard, focus, and structural checks. Critical and serious violations fail the test; moderate and minor violations are documented as warnings in the attached report.

| ID | Test |
|---|---|
| TC-029 | Login page — full WCAG 2.1 AA axe-core scan (unauthenticated) |
| TC-030 | Home page — full WCAG 2.1 AA axe-core scan (unauthenticated) |
| TC-031 | Home page — full WCAG 2.1 AA axe-core scan (authenticated, dynamic content included) |
| TC-032 | Login form — keyboard Tab order reaches Email → Password → Login button in sequence |
| TC-033 | Login error message — present in DOM and announced via `role="alert"` or `aria-live`; error state page has no new critical/serious violations |
| TC-034 | Login form — every interactive element displays a visible focus indicator when focused via keyboard |
| TC-035 | All images on login and home pages have an `alt` attribute; decorative images use `alt=""` |
| TC-036 | Heading hierarchy is logical (no skipped levels, exactly one `h1` per page) |
| TC-037 | Text colour contrast meets WCAG 2.1 AA requirements (axe `color-contrast` rule) |

Each test attaches to the Playwright HTML report:
- Plain-text violation summary (failures / warnings split)
- Full axe-core JSON output for integration with dashboards or CI tooling
- Page screenshot at scan time

### Session Management — `@session` (TC-024–TC-028)

| ID | Test | Approach |
|---|---|---|
| TC-024 | Cookie replay observation after logout | Captures cookies pre-logout, injects them into a fresh browser context, documents whether the server invalidates the session |
| TC-025 | Protected pages are inaccessible after logout | Verifies `/customer/info`, `/order/history`, and `/customer/addresses` deny access after logout |
| TC-026 | Storage state replay observation after logout | Saves a full `storageState` snapshot (cookies + localStorage + sessionStorage), restores it post-logout, documents server behaviour |
| TC-027 | Multiple simultaneous sessions are isolated | Opens two separate `browser.newContext()` sessions with the same credentials, verifies isolation, and confirms logout from one context does not affect the other |
| TC-028 | Re-authentication restores protected access | Full lifecycle: login → access protected page → logout → verify blocked → re-authenticate → verify access restored |

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
| **Lighthouse HTML** | `reports/lighthouse/<name>-<ts>.html` | Full Lighthouse report for each audited page — open in any browser |
| **Lighthouse JSON** | `reports/lighthouse/<name>-<ts>.json` | Raw Lighthouse result object — category scores, all audit details |

Tests attach additional evidence to the HTML report:

- **Security reports** — plain-text verdict files (TC-010–TC-014, TC-024–TC-026)
- **XSS observation reports** — per-payload and batch summaries
- **Session reports** — cookie lists, storage snapshots, access control tables
- **Screenshots** — captured at key steps and always on failure
- **Page HTML source** — attached on failure for DOM inspection
- **Videos / traces** — retained on failure for step-by-step replay

Lighthouse reports are also attached directly to the Playwright HTML report under the **Attachments** tab of each `TC-PERF_*` test.

---

## CI/CD

The framework ships with a GitHub Actions workflow at [`.github/workflows/performance.yml`](.github/workflows/performance.yml) that runs the Lighthouse performance suite on every push and pull request to `main`.

### Workflow steps

1. **Checkout** — checks out the repository
2. **Setup Node 20** — with `npm` cache
3. **`npm ci`** — clean dependency install
4. **`npx playwright install chromium --with-deps`** — installs the browser and OS-level dependencies
5. **`npm run test:performance`** — runs all `@performance` tests under the `performance` Playwright project
6. **Upload artifacts** — Lighthouse reports (`reports/lighthouse/`) and Playwright HTML report (`reports/html/`) are retained for 30 days

### Required GitHub secrets

| Secret | Description |
|---|---|
| `USER_EMAIL` | Login email for the test user account |
| `USER_PASSWORD` | Login password for the test user account |

`BASE_URL` is hardcoded to `https://demowebshop.tricentis.com` in the workflow (public URL, not a secret). Add secrets at **Settings → Secrets and variables → Actions**.

### Trigger conditions

```yaml
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
```

Performance budgets are enforced as hard gates — if any Lighthouse score drops below the threshold, the job fails and the PR cannot be merged until the regression is fixed or the budget is adjusted in [`test-data/performance.data.ts`](test-data/performance.data.ts).

---

## Logging

Every test automatically receives a named logger via `base.fixture.ts`. Logs are written to:

- **Console** — colourised, human-readable
- **File** — `reports/logs/YYYY-MM-DD.log` (one file per day, append)

Example output:

```
[2026-04-22 14:03:12] [INFO ] [TC-024 — Cookie replay] Step 1: user authenticated
[2026-04-22 14:03:13] [INFO ] [TC-024 — Cookie replay] Step 2: captured 9 cookies pre-logout
[2026-04-22 14:03:14] [WARN ] [TC-024 — Cookie replay] SECURITY FINDING: server did not invalidate session — cookie replay succeeded
[2026-04-22 14:03:15] [INFO ] [TC-024 — Cookie replay] Test PASSED: "[TC-024] — ..."
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
  test('[TC-030] — Add item to cart', async ({ loginPage, testUser, logger }) => {
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
    ├── lighthouseHelper  ← LighthouseHelper instance (performance project only)
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

2. **Single shared test account.** All tests (including the multi-context session tests in TC-027) log in with the same credentials. The application allows the same account to hold multiple concurrent sessions.

3. **Application availability.** The target app (`demowebshop.tricentis.com`) is publicly reachable and responsive. It is a shared, third-party demo instance not under this framework's control.

4. **Stable selectors.** DOM selectors (IDs, class names, `href` values) match the application as observed at the time of authoring. The app's HTML structure is assumed to be stable across runs.

5. **English locale.** All text-based assertions (error messages, page titles, keyword detection) assume the application responds in English.

6. **No e-commerce side effects.** Tests do not place real orders or modify account data beyond what logging in and out requires. The wishlist and cart are not asserted upon.

### Test Environment

7. **Sequential execution.** Tests run with a single Playwright worker (`workers: 1`) to prevent concurrent sessions from one test interfering with another's login state.

8. **Chromium only.** All tests target the `chromium` project. Cross-browser compatibility is not in scope for this iteration.

9. **No CI-managed state.** There is no `storageState` file shared between tests. Each test performs a fresh login where authentication is required.

10. **Network conditions are normal.** Tests do not simulate slow networks, offline mode, or packet loss.

### Performance Tests (TC-PERF_001–TC-PERF_004)

19. **Budgets reflect the demo app's measured baseline.** Thresholds are set ~5 points below the observed scores for `demowebshop.tricentis.com`. Their purpose is catching regressions, not enforcing absolute quality bars on a third-party demo app.

20. **Single-worker execution prevents CDP port conflicts.** Lighthouse connects to Chrome on port `9222`. Because `workers: 1` is enforced globally, only one browser instance is active at a time, ensuring the port is always free.

21. **`disableStorageReset: true` is required for authenticated audits.** Without this flag, Lighthouse clears all cookies before running its audit, logging the user out before the page is measured. The flag preserves the Playwright-established session.

22. **Lighthouse scores are non-deterministic across runs.** Network conditions, server response times, and CPU throttling simulation mean scores can vary by ±5 points between runs on the same page. Thresholds are set with enough headroom to absorb this variance.

### Accessibility Tests (TC-029–TC-037)

14. **WCAG 2.1 AA is the target standard.** axe-core is configured with the `wcag2a`, `wcag2aa`, and `wcag21aa` tag sets. WCAG 2.2 and AAA criteria are out of scope.

15. **Critical and serious violations fail; moderate and minor are documented.** This threshold is intentional — it surfaces must-fix issues without blocking on warnings that may require design decisions. The `failOn` level can be tightened to `"moderate"` for stricter enforcement.

16. **Third-party widgets are excluded.** reCAPTCHA, hCaptcha, Doubleclick, and Google iframes are excluded from axe scans because they are outside the application's control and frequently contain known violations.

17. **axe-core is not an exhaustive audit.** Automated scanning catches approximately 30–40 % of WCAG issues. The targeted tests (TC-032–TC-036) supplement automation with checks that axe cannot perform reliably (keyboard focus order, focus ring visibility, actual tab behaviour). A full accessibility audit would also require manual testing with a screen reader (e.g. VoiceOver, NVDA).

18. **Focus ring detection is CSS-computed.** TC-034 reads `outline-style` and `outline-width` from the computed style at focus time. Browsers that implement `:focus-visible` differently may report `outline: none` even when a ring is visible via `box-shadow`. The test currently checks `outline` only; `box-shadow`-based rings are not counted as passing.

### Security Tests (TC-010–TC-014, TC-024–TC-028)

11. **Defensive-testing philosophy.** Security detection tests (TC-010–TC-014) and session observation tests (TC-024, TC-026) observe and document the application's security posture rather than asserting it must pass or fail. A finding is reported through attached reports and log warnings, not a hard test failure. This approach prevents false CI failures when testing against a demo application with known limitations.

12. **Protected paths are stable.** The paths tested for access control (`/customer/info`, `/order/history`, `/customer/addresses`) are known to require authentication. Their redirect or denial behaviour is asserted accordingly.

13. **`isLoggedIn()` is a reliable session indicator.** The presence of the account link (`.header-links .account`) is taken as the ground truth for whether a session is active on a given page.

---

## Known Limitations

### Application-Level Limitations (demowebshop.tricentis.com)

1. **No server-side session invalidation on logout.**
   The application performs a client-side-only logout — it clears the session cookie from the browser but does not invalidate the token on the server. As a result, pre-logout cookies or a full `storageState` snapshot injected into a new browser context can still authenticate against the server. TC-024 and TC-026 observe and document this behaviour rather than hard-asserting, because the limitation belongs to the target app, not the framework. In a production target these tests should assert `expect(sessionStillActive).toBeFalsy()`.

2. **Inconsistent redirect behaviour on protected pages.**
   `/customer/info` redirects explicitly to `/login` after logout. Other protected paths (`/order/history`, `/customer/addresses`) return a "page not found" response without changing the URL to `/login`. TC-025 handles this with a two-condition access-denial check: URL contains `/login` **or** the header login link is visible (confirming the user is unauthenticated).

3. **No server-side session cross-invalidation.**
   Logging out in one browser context does not invalidate sessions held by other contexts for the same account. TC-027 documents this behaviour — concurrent sessions for the same user remain independent. This is common in demo apps but would be a security concern in production.

4. **CAPTCHA may block repeated login attempts.**
   Rapid or repeated login attempts (particularly in the brute-force and rate-limit tests) may trigger CAPTCHA challenges. The framework detects and documents CAPTCHA presence (TC-010) but cannot solve it. If triggered, affected tests will log a security challenge finding and continue with a documented observation rather than failing.

5. **Shared public demo instance.**
   The target is a publicly hosted, shared demo application. It may be slow, temporarily unavailable, or exhibit non-deterministic behaviour (e.g., a different user's activity affecting shared state). The framework does not control the environment.

6. **Rate-limiting and account lockout are non-deterministic.**
   Whether the application triggers rate-limiting (TC-012) or account lockout (TC-013) depends on recent activity from all users of the shared instance, not only the test run. These tests document the outcome of detection, not a guaranteed trigger.

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

14. **Accessibility tests target the live demo app — violations reflect its actual posture.** demowebshop.tricentis.com may have pre-existing colour contrast or landmark violations that are outside this framework's control. Failing tests document real issues in the target application.

15. **axe-core automated coverage is partial.** Automated rules cover approximately 30–40 % of WCAG 2.1 AA criteria. Screen-reader testing (VoiceOver, NVDA) and manual keyboard walkthroughs are required for a comprehensive audit.

16. **Lighthouse scores are not stable enough for pixel-perfect budget enforcement.** Score variance of ±5 points is normal across runs due to CPU simulation, network jitter, and server response variability. Budgets in `test-data/performance.data.ts` should sit at least 5 points below the observed baseline to avoid flaky failures.

17. **Lighthouse audits add ~15 seconds per page.** Each `playAudit` call opens a new CDP session and runs a full trace. The performance suite adds approximately 1 minute to the total CI run time. This is expected and acceptable for a left-shift approach.

18. **`reports/lighthouse/` accumulates files across runs.** HTML and JSON report files are named with a timestamp and never overwritten. Old reports should be cleaned up periodically or the directory should be excluded from long-term storage.

13. **Session tests require the `browser` fixture — not available in API-only contexts.**
    TC-024, TC-026, and TC-027 use `browser.newContext()` to create isolated browser sessions. This requires a full browser process and cannot be run in Playwright's API-only (`request`) mode.
