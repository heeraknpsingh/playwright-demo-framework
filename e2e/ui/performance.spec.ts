import { test, expect } from "../../fixtures/base.fixture";
import { performanceThresholds } from "../../test-data/performance.data";

/**
 * Client-side performance audits using Playwright + Lighthouse.
 *
 * Tagged @performance so they run in isolation via:
 *   npm run test:performance
 *
 * Each test audits one URL, attaches the Lighthouse HTML report to the
 * Playwright HTML report, and enforces the budgets in performanceThresholds.
 * The CI pipeline will fail the build if any budget is violated.
 */

test.describe("Non-Authenticated Performance @performance", () => {
  test("[TC-PERF-001] — Home page meets performance budgets", async ({
    page,
    lighthouseHelper,
  }, testInfo) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await lighthouseHelper.runAudit(page, "home", performanceThresholds);
    await lighthouseHelper.attachReportToTest(testInfo, "home");
  });

  test("[TC-PERF-002] — Login page meets performance budgets", async ({
    page,
    lighthouseHelper,
  }, testInfo) => {
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    await lighthouseHelper.runAudit(page, "login", performanceThresholds);
    await lighthouseHelper.attachReportToTest(testInfo, "login");
  });
});

test.describe("Authenticated Performance @performance", () => {
  test.beforeEach(async ({ loginPage, testUser }) => {
    await loginPage.navigateToLogin();
    await loginPage.login(testUser.email, testUser.password);
    const loggedIn = await loginPage.isLoggedIn();
    expect(loggedIn, "Login must succeed before performance audit").toBe(true);
  });

  test("[TC-PERF-003] — Account/profile page meets performance budgets", async ({
    page,
    lighthouseHelper,
  }, testInfo) => {
    await page.goto("/customer/info");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/customer\/info$/);

    await lighthouseHelper.runAudit(page, "account", performanceThresholds);
    await lighthouseHelper.attachReportToTest(testInfo, "account");
  });

  test("[TC-PERF-004] — Order history page meets performance budgets", async ({
    page,
    lighthouseHelper,
  }, testInfo) => {
    await page.goto("/customer/orders");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/customer\/orders$/);

    await lighthouseHelper.runAudit(
      page,
      "order-history",
      performanceThresholds,
    );
    await lighthouseHelper.attachReportToTest(testInfo, "order-history");
  });
});
