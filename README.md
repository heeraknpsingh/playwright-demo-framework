# Playwright Demo Framework

A production-grade UI + API automation framework for [demowebshop.tricentis.com](https://demowebshop.tricentis.com), built with Playwright, TypeScript, and the Page Object Model.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [OOP Concepts](#oop-concepts)
- [Setup](#setup)
- [Demo App — DB & UI Setup](#demo-app--db--ui-setup)
- [Configuration](#configuration)
- [Running Tests](#running-tests)
- [Test Coverage](#test-coverage)
- [Reporting](#reporting)
- [Logging](#logging)
- [Code Quality](#code-quality)
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
| [ESLint](https://eslint.org) + [@typescript-eslint](https://typescript-eslint.io) + [eslint-plugin-playwright](https://github.com/playwright-community/eslint-plugin-playwright) | Static analysis — TypeScript correctness and Playwright best practices |
| [Prettier](https://prettier.io) | Opinionated code formatting |
| [Husky](https://typicode.github.io/husky) + [lint-staged](https://github.com/okonet/lint-staged) | Git hooks — pre-commit and pre-push quality gates |
| [Claude](https://claude.ai) (`claude-sonnet-4-6`) | AI-powered code review on every commit and push |
| [MySQL 8](https://dev.mysql.com) | Database for the role-based demo app |
| [Express](https://expressjs.com) | Lightweight backend for the role-based demo app |
| [mysql2](https://github.com/sidorares/node-mysql2) | MySQL client used by Playwright tests to query the DB directly at test runtime |
| [Docker](https://www.docker.com) | Runs the MySQL container locally via `docker compose` |

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
├── demo-app/                          # Lightweight role-based demo application
│   ├── server.js                      # Express API + static file server
│   ├── init.sql                       # MySQL schema + seed users (admin / manager / user)
│   ├── docker-compose.yml             # MySQL 8 container definition
│   ├── Dockerfile                     # Node 20 Alpine image for the app
│   ├── package.json                   # demo-app dependencies (express, mysql2, cors)
│   ├── .env.example                   # DB connection defaults for the demo app
│   └── public/
│       └── index.html                 # Single-page login + role-based dashboard UI
│
├── e2e/                               # Test specs
│   ├── ui/
│   │   ├── login.spec.ts              # Login UI tests                (TC-005–TC-009)
│   │   ├── role-based-login.spec.ts   # DB-driven role-based login    (TC-020–TC-021)
│   │   ├── defensive-security.spec.ts # Security detection tests      (TC-010–TC-014)
│   │   ├── xss-input-validation.spec.ts # XSS / input tests           (TC-015–TC-023)
│   │   ├── session-management.spec.ts # Session security tests        (TC-024–TC-028)
│   │   ├── accessibility.spec.ts      # WCAG 2.1 AA a11y tests        (TC-029–TC-037)
│   │   └── performance.spec.ts        # Lighthouse perf audits        (TC-PERF_001–004)
│   └── api/
│       └── login-api.spec.ts          # Login API tests               (TC-001–TC-004)
│
├── page-objects/                      # Page Object Model classes
│   ├── base/
│   │   └── BasePage.ts                # Abstract base class
│   ├── LoginPage.ts
│   ├── HomePage.ts
│   ├── DemoAppLoginPage.ts            # Login page for the demo app
│   └── DemoAppDashboardPage.ts        # Role-specific dashboard assertions
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
│   ├── db.utils.ts                    # MySQL connection + getUsersFromDb() / getUsersByRole()
│   └── date.utils.ts                  # Date/timestamp helpers
│
├── test-data/                         # Test data
│   ├── login.data.ts                  # Typed login test data
│   ├── demo-app.data.ts               # Invalid-credential fixture for TC-021
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
- Git 2.9+ (required for Husky hooks)

### Install

```bash
# 1. Clone the repository
git clone <repo-url>
cd playwright-demo-framework

# 2. Install dependencies (also installs and activates Husky git hooks automatically)
npm install

# 3. Install Playwright browsers
npx playwright install

# 4. Configure environment
cp .env.example .env
# Edit .env with your credentials
```

> **Husky hooks are activated automatically by `npm install`** via the `"prepare": "husky"` script in `package.json`. No extra steps are needed. The hooks live in `.husky/` and are committed to the repository so every developer gets them on clone.

---

## Demo App — DB & UI Setup

The `demo-app/` directory contains a self-contained Express + MySQL application used by the role-based login tests (`TC-020`, `TC-021`). It seeds three users — `admin`, `manager`, and `user` — and serves a single-page dashboard that shows different navigation sections depending on who is logged in.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) running (for MySQL)
- Node.js 18+ (for the Express server)

### Step 1 — Start MySQL

```bash
cd demo-app
docker compose up mysql -d
```

MySQL 8 starts in the background. On first boot it initialises the database and runs `init.sql`, which creates the `users` table and inserts the three seed accounts. Wait ~20 seconds for the container to be healthy before proceeding.

Verify it is ready:

```bash
docker compose ps
# demo-mysql should show "Up" and "healthy"
```

> **If the container crashes with "No space left on device"**, Docker's VM disk is full. Run `docker system prune -f` to reclaim space, then retry.

### Step 2 — Install demo-app dependencies

```bash
# still inside demo-app/
npm install
```

### Step 3 — Start the Express server

```bash
node server.js
# Demo app running at http://localhost:3001
```

The server reads DB connection details from environment variables with sensible defaults that match the Docker Compose credentials:

| Variable | Default | Description |
|---|---|---|
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `demo_user` | DB user created by `init.sql` |
| `DB_PASSWORD` | `demo_password` | DB password |
| `DB_NAME` | `demo_app` | Database name |
| `PORT` | `3001` | Port the Express server listens on |

To override, copy `.env.example` to `.env` inside `demo-app/` and edit the values.

### Step 4 — Open the UI (optional)

Navigate to **http://localhost:3001** in your browser to interact with the app manually.

**Seed accounts:**

| Username | Password | Role | What the dashboard shows |
|---|---|---|---|
| `admin@demo.local` | `Admin123!` | admin | Admin Panel — Manage Users, System Settings, Audit Logs |
| `manager@demo.local` | `Manager123!` | manager | Manager Dashboard — Team Reports, Approve Requests, Team Members |
| `user@demo.local` | `User123!` | user | My Workspace — My Profile, My Orders, My Settings |

### Step 5 — Configure Playwright env vars

Add the following to your root `.env` (the framework's `.env`, not `demo-app/.env`):

```env
DEMO_APP_URL=http://localhost:3001
DEMO_DB_HOST=localhost
DEMO_DB_PORT=3306
DEMO_DB_USER=demo_user
DEMO_DB_PASSWORD=demo_password
DEMO_DB_NAME=demo_app
```

These are already present in `.env.example` — copy them across if you haven't already.

### Stopping the demo app

```bash
# Stop MySQL (keep data)
cd demo-app && docker compose stop mysql

# Stop MySQL and remove the volume (fresh start next time)
cd demo-app && docker compose down -v
```

---

## Configuration

All sensitive config lives in `.env` (never committed to version control):

```env
# demowebshop target
BASE_URL=https://demowebshop.tricentis.com
USER_EMAIL=your@email.com
USER_PASSWORD=YourPassword123@
HEADLESS=true
LOG_LEVEL=debug
SLOW_MO=0
ANTHROPIC_API_KEY=your-anthropic-api-key   # optional — see Code Quality section

# Demo app (role-based login tests)
DEMO_APP_URL=http://localhost:3001
DEMO_DB_HOST=localhost
DEMO_DB_PORT=3306
DEMO_DB_USER=demo_user
DEMO_DB_PASSWORD=demo_password
DEMO_DB_NAME=demo_app
```

**demowebshop variables**

| Variable | Description | Default |
|---|---|---|
| `BASE_URL` | Target application URL | `https://demowebshop.tricentis.com` |
| `USER_EMAIL` | Login email for the test user account | — |
| `USER_PASSWORD` | Login password for the test user account | — |
| `HEADLESS` | Run browsers headlessly | `true` |
| `LOG_LEVEL` | Winston log level (`debug`, `info`, `warn`, `error`) | `debug` |
| `SLOW_MO` | Milliseconds to slow down each browser action (useful for debugging) | `0` |
| `ANTHROPIC_API_KEY` | Anthropic API key for AI code review — if omitted and Claude Code CLI is installed, the CLI session is used instead | — |

**Demo app variables** (required for `@role-based` tests only)

| Variable | Description | Default |
|---|---|---|
| `DEMO_APP_URL` | Base URL of the running demo app | `http://localhost:3001` |
| `DEMO_DB_HOST` | MySQL host reachable from the Playwright process | `localhost` |
| `DEMO_DB_PORT` | MySQL port | `3306` |
| `DEMO_DB_USER` | MySQL user | `demo_user` |
| `DEMO_DB_PASSWORD` | MySQL password | `demo_password` |
| `DEMO_DB_NAME` | MySQL database name | `demo_app` |

---

## Running Tests

```bash
# Run all tests
npm test

# Run by tag
npm run test:ui        # @ui         — Login UI + role-based login tests
npm run test:api       # @api        — Login API tests
npm run test:security  # @security   — Defensive security detection
npm run test:xss       # @xss        — XSS input validation
npm run test:session   # @session    — Session management
npm run test:a11y      # @a11y       — Accessibility (WCAG 2.1 AA)
npm run test:performance # @performance — Lighthouse client-side performance audits

# Role-based login tests (requires demo app + MySQL running — see Demo App Setup)
npx playwright test --grep @role-based

# Run everything (all tags, all projects) in a single Playwright process
npm run test:all

# Run with browser visible
npm run test:headed

# Debug mode (Playwright Inspector)
npm run test:debug

# Run a specific file
npx playwright test e2e/ui/role-based-login.spec.ts

# Run a specific test case by ID
npx playwright test --grep "TC-020"

# View the HTML report after a run
npm run report
```

---

## Test Coverage

### Role-Based Login from DB — `@role-based` (TC-020–TC-021)

These tests run against the **local demo app** (see [Demo App — DB & UI Setup](#demo-app--db--ui-setup)). They require MySQL and the Express server to be running before execution.

**How they work:**

1. `utils/db.utils.ts` opens a direct MySQL connection using the `DEMO_DB_*` env vars
2. `getUsersFromDb()` executes `SELECT * FROM users ORDER BY role` and returns typed `DbUser[]`
3. The test loops over each DB row, logs in via `DemoAppLoginPage`, and asserts the dashboard via `DemoAppDashboardPage`
4. After each user, the test logs out and the loop continues with the next

| ID | Test | What is asserted |
|---|---|---|
| TC-020 | Each DB user logs in and sees their role-specific dashboard | For each user: login succeeds, welcome message contains `display_name`, role badge matches `role`, only the matching `[data-role-section]` is visible, all other sections are hidden, logout returns to the login form |
| TC-021 | Invalid credentials show an error message | Login with a non-existent user returns an error message; evidence screenshot is captured and attached to the report |

**Role → UI mapping:**

| Role | Section heading | Navigation links |
|---|---|---|
| `admin` | Admin Panel | Manage Users · System Settings · Audit Logs |
| `manager` | Manager Dashboard | Team Reports · Approve Requests · Team Members |
| `user` | My Workspace | My Profile · My Orders · My Settings |

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

## Code Quality

Every `git commit` and `git push` automatically runs a three-stage quality pipeline. The pipeline is powered by [Husky](https://typicode.github.io/husky) git hooks and requires no manual steps — it activates the moment you run `git commit` or `git push`.

### What runs and when

```
git commit
│
├── [1/3] ESLint + Prettier    ← staged files only, auto-fixes what it can
├── [2/3] Coding Standards     ← staged .ts files only, custom rule checker
└── [3/3] AI Code Review       ← staged diff reviewed by Claude

git push
│
└── AI Code Review             ← full branch diff vs main reviewed by Claude
```

Each stage must pass before the next runs. A failure prints exactly what needs fixing — the commit or push is blocked until you resolve it, re-stage your files, and retry.

---

### Installation — what you need

Everything is installed automatically by `npm install`. There is nothing extra to install manually.

| What | How it gets set up |
|---|---|
| ESLint, Prettier, lint-staged | Installed as `devDependencies` via `npm install` |
| Husky git hooks | Activated by the `"prepare": "husky"` script that runs automatically after `npm install` |
| Coding standards checker | Already in [`scripts/code-quality/`](scripts/code-quality/) — runs via `ts-node` (included in dependencies) |
| AI reviewer (Claude API mode) | Add `ANTHROPIC_API_KEY` to your `.env` — no install required |
| AI reviewer (Claude Code CLI mode) | Install [Claude Code](https://claude.ai/code) and log in — the hook detects it automatically |

After cloning, `npm install` is the only command needed to activate all hooks on your machine.

> **Verify hooks are active:**
> ```bash
> cat .husky/pre-commit   # should show the 3-step pipeline
> cat .husky/pre-push     # should show the AI review on push
> ```

---

### How the pre-commit hook works

**Hook file:** [`.husky/pre-commit`](.husky/pre-commit)

When you run `git commit`, Git calls this hook before creating the commit object. The hook runs three checks in sequence:

```
╔══════════════════════════════════════════════════════════╗
║              PRE-COMMIT QUALITY CHECKS                  ║
╚══════════════════════════════════════════════════════════╝

  [1/3] Running ESLint + Prettier...
  [2/3] Running coding standards checker...
  [3/3] Running AI code review...

╔══════════════════════════════════════════════════════════╗
║           ✓  ALL PRE-COMMIT CHECKS PASSED               ║
╚══════════════════════════════════════════════════════════╝
```

If any step fails, the hook exits with a non-zero code — Git cancels the commit and your working tree is left exactly as it was. Fix the reported issues, re-stage (`git add`), and re-run `git commit`.

---

### How the pre-push hook works

**Hook file:** [`.husky/pre-push`](.husky/pre-push)

When you run `git push`, Git calls this hook before sending anything to the remote. It runs a single AI review on the **full branch diff** (all commits on your branch vs `main`), not just the last staged change.

This catches issues that look fine in isolation but are problematic in the context of everything on the branch — for example, a test added in one commit that contradicts a helper changed in another.

If the review fails, the push is blocked. Fix the reported issues, commit the fix, and push again.

---

### Stage 1 — ESLint + Prettier

**Tool:** ESLint + Prettier, run via [lint-staged](https://github.com/okonet/lint-staged)  
**Config:** [`.eslintrc.json`](.eslintrc.json) · [`.lintstagedrc.json`](.lintstagedrc.json)  
**Scope:** staged files only — files you have not changed are never touched

lint-staged passes only the staged files to each tool, grouped by glob:

```
e2e/**/*.ts          → eslint --fix  →  prettier --write
helpers/**/*.ts      → eslint --fix  →  prettier --write
page-objects/**/*.ts → eslint --fix  →  prettier --write
utils/**/*.ts        → eslint --fix  →  prettier --write
fixtures/**/*.ts     → eslint --fix  →  prettier --write
*.json               →                  prettier --write
```

`--fix` auto-corrects anything ESLint can fix automatically (unused imports, simple style issues). `prettier --write` reformats the file. Both changes are applied directly to the file — if you open the file after a failed commit attempt you will see the auto-corrections.

**Key ESLint rules:**

| Rule | Severity | What it catches |
|---|---|---|
| `no-console` | error | Raw `console.log` — use the Winston logger instead |
| `@typescript-eslint/no-explicit-any` | warning | Untyped `any` — prefer proper types |
| `@typescript-eslint/explicit-function-return-type` | warning | Missing return type annotations |
| `@typescript-eslint/no-unused-vars` | error | Declared but unused variables (args starting with `_` are exempt) |
| `@typescript-eslint/no-floating-promises` | error | Unawaited `async` calls — add `await` or `void` |
| `playwright/prefer-web-first-assertions` | error | `expect(await locator.count())` → use `expect(locator).toHaveCount()` |
| `playwright/expect-expect` | error | Tests that contain no `expect()` calls |
| `playwright/no-wait-for-timeout` | warning | Hardcoded `waitForTimeout` sleeps — use web-first waits |
| `playwright/no-force-option` | warning | `{ force: true }` — masks real interaction problems |
| `playwright/no-skipped-test` | warning | `test.skip` left in committed code |

Errors block the commit. Warnings are reported but non-blocking (zero-warning policy is enforced for staged files).

---

### Stage 2 — Coding Standards Checker

**Tool:** Custom TypeScript script  
**Script:** [`scripts/code-quality/standards-checker.ts`](scripts/code-quality/standards-checker.ts)  
**Scope:** staged `.ts` files only

This checker enforces framework conventions that ESLint cannot express — things like test ID format, fixture usage, and evidence capture requirements. It reads each staged file line-by-line and applies the rules below.

| Rule | Severity | What it checks |
|---|---|---|
| **TC-001** — Test ID format | error | Every `test()` title must open with `[TC-XXX]` or `[TC-XXX_NNN]` |
| **TC-005** — Describe tag | error | `test.describe()` must include a recognised tag: `@ui`, `@api`, `@security`, `@xss`, `@session`, `@a11y`, `@performance` |
| **TC-006** — No hardcoded credentials | error | Email addresses or passwords as string literals — use the `testUser` fixture instead. Exception: emails containing `invalid` (e.g. `invalid@example.com`) in negative tests are allowed |
| **TC-007** — No hardcoded URLs | warning | Inline `https://` strings — use `envConfig.baseUrl` so the target can be changed via `.env` |
| **TC-008** — Evidence capture on negative tests | warning | Tests whose title contains `invalid`, `error`, `fail`, `wrong`, or `incorrect` must call `captureEvidence()` within the test body |
| **TC-PO-001** — Page object contract | error | Page object classes (in `page-objects/`) must implement both `navigateTo()` and `waitForPageLoad()` |

**Errors block the commit. Warnings are printed but do not block.**

Example output when a violation is found:

```
Standards Check — 3 file(s) scanned

WARNINGS:
  ⚠  e2e/ui/login.spec.ts:55  [TC-008]  Negative test ('test("[TC-007] — Invalid password...') must call captureEvidence() and attach screenshot

ERRORS (blocking):
  ✗  e2e/ui/login.spec.ts:12  [TC-001]  Test title does not match [TC-XXX] format — found: 'Valid login'

STANDARDS FAILED — fix 1 error(s) above
```

Run it manually on any file:

```bash
npm run standards:check e2e/ui/login.spec.ts
```

---

### Stage 3 — AI Code Review

**Tool:** Claude `claude-sonnet-4-6`  
**Script:** [`scripts/code-quality/ai-reviewer.ts`](scripts/code-quality/ai-reviewer.ts)  
**On commit:** reviews the staged diff  
**On push:** reviews the full branch diff vs `main`

The reviewer sends the git diff to Claude together with `docs/coding-standards.md` and `.eslintrc.json` as context. Claude reviews it the way a senior engineer would review a pull request — looking at logic, naming, test quality, missing assertions, flaky test risks, and standards compliance — and returns a structured response.

**Output sections:**

| Section | Blocking? | Description |
|---|---|---|
| **SUMMARY** | No | 2–4 sentence overall assessment of what the change does and its quality |
| **ISSUES** | **Yes** | Clear violations — verdict becomes `fail` and the commit/push is stopped |
| **SUGGESTIONS** | No | Actionable improvements with file and line references |
| **REVIEW COMMENTS** | No | Inline comments on specific lines, written like a human reviewer |

Example output:

```
════════════════════════════════════════════════════════════
  AI CODE REVIEW  (claude-cli)
════════════════════════════════════════════════════════════
  Tokens used: 1842

  SUMMARY
  Adds captureEvidence() to TC-033 to satisfy the negative-test evidence
  rule. Change is minimal and correct. One suggestion below.

  SUGGESTIONS (non-blocking)
  ⚠  e2e/ui/accessibility.spec.ts:289
     Consider calling captureEvidence() before the final assertion so
     the screenshot is captured even when the assertion fails.

  REVIEW COMMENTS
  ◆  e2e/ui/accessibility.spec.ts:242
     Good fix. Replacing page.screenshot() with loginPage.captureEvidence()
     routes through the page-object method (Rule 8) and ensures any future
     framework hooks on evidence capture apply to this negative test.

  ✓ AI REVIEW PASSED
```

#### Authentication — which token is used

The script detects the available auth method automatically, in this priority order:

```
1. ANTHROPIC_API_KEY in .env   →  calls Claude API directly
                                   (uses claude-sonnet-4-6, shows token count)

2. claude CLI found on PATH    →  pipes diff to Claude Code CLI via stdin
    (which claude succeeds)        (uses your logged-in Claude Code session)

3. Neither available           →  prints "AI review skipped" and exits 0
                                   (commit/push continues normally)
```

#### When the review is skipped (non-blocking scenarios)

The AI review **never blocks a commit due to a tool problem** — only a real `"fail"` verdict (issues found in your code) stops the commit. In all the cases below, the commit proceeds with a skip message:

| Situation | What you see | Commit proceeds? |
|---|---|---|
| No `ANTHROPIC_API_KEY` and no Claude Code CLI | `⚠ AI review skipped: No AI reviewer available` | ✅ Yes |
| No TypeScript files in the diff | `⚠ AI review skipped: No TypeScript changes detected` | ✅ Yes |
| Claude API unreachable / timeout | `⚠ AI review skipped: AI review error: ...` | ✅ Yes |
| Claude response is not valid JSON | Review treated as `pass` with a parse-error suggestion | ✅ Yes |
| `"fail"` verdict — issues found in your code | `✗ AI REVIEW FAILED — fix N issue(s) above` | ❌ Blocked |

#### How it works on each machine

| Developer's setup | What happens |
|---|---|
| `ANTHROPIC_API_KEY` in `.env` | Uses Claude API directly — works in any shell, including git hooks |
| Claude Code CLI installed + logged in | Uses your Claude Code session — no extra config needed |
| CI/CD (GitHub Actions, etc.) | Add `ANTHROPIC_API_KEY` as a repository secret and set it as an env var in the workflow |
| Neither available | Review is silently skipped — all other checks still run |

> **For teams:** Claude Code CLI mode means each developer's commits consume their own Claude quota. For a shared setup, add `ANTHROPIC_API_KEY` to each developer's `.env` (source it from your team's password manager — never commit it to the repo). Get an API key at [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys).

---

### Running checks manually

You can run any stage independently without triggering a commit:

```bash
# ESLint — check all framework files
npm run lint:eslint

# Prettier — check formatting without writing
npm run lint:prettier

# TypeScript — type-check without emitting
npm run lint

# Coding standards checker — check specific files
npm run standards:check e2e/ui/login.spec.ts page-objects/LoginPage.ts

# AI reviewer — review staged changes (same as pre-commit)
npm run ai:review

# AI reviewer — review full branch diff vs main (same as pre-push)
npx ts-node scripts/code-quality/ai-reviewer.ts --push
```

### Bypassing hooks (not recommended)

If you ever need to skip the hooks temporarily (e.g. committing a work-in-progress draft):

```bash
git commit --no-verify -m "wip: draft"
git push --no-verify
```

> Use sparingly. `--no-verify` skips all hooks including ESLint, standards, and AI review. Any issues will surface on the next proper commit or in CI.

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
