import { test, expect } from "../../fixtures/base.fixture";
import { getUsersFromDb } from "../../utils/db.utils";
import { DemoAppLoginPage } from "../../page-objects/DemoAppLoginPage";
import { DemoAppDashboardPage } from "../../page-objects/DemoAppDashboardPage";
import { demoAppTestData } from "../../test-data/demo-app.data";

const DEMO_APP_URL = process.env.DEMO_APP_URL || "http://localhost:3001";

/**
 * Prerequisites:
 *   - MySQL running:   cd demo-app && docker compose up mysql -d
 *   - App running:     cd demo-app && npm install && node server.js
 *   - .env vars set:   DEMO_APP_URL, DEMO_DB_HOST, DEMO_DB_USER, DEMO_DB_PASSWORD, DEMO_DB_NAME
 */
test.describe("Role-based login from DB", { tag: ["@ui", "@role-based"] }, () => {
  test("[TC-020] — each DB user can log in and sees their role-specific dashboard", async ({
    page,
    logger,
  }) => {
    const users = await getUsersFromDb();

    expect(users.length, "No users found in database").toBeGreaterThan(0);
    logger.info(`Fetched ${users.length} users from DB`);

    const loginPage = new DemoAppLoginPage(page, logger);
    const dashboardPage = new DemoAppDashboardPage(page, logger);

    for (const user of users) {
      logger.info(`--- Testing user: ${user.username} | role: ${user.role} ---`);

      await loginPage.navigateToApp(DEMO_APP_URL);
      await loginPage.login(user.username, user.password);

      await dashboardPage.waitForPageLoad();
      await dashboardPage.assertWelcomeMessage(user.display_name);

      const badge = await dashboardPage.getRoleBadgeText();
      expect(badge.toLowerCase()).toBe(user.role);

      await dashboardPage.assertRoleSpecificUI(user.role);
      await dashboardPage.logout();
    }
  });

  test("[TC-021] — invalid credentials show an error message", async ({ page, logger }) => {
    const loginPage = new DemoAppLoginPage(page, logger);
    const { username, password, description } = demoAppTestData.invalidUser;

    logger.info(`Test: ${description}`);
    await loginPage.navigateToApp(DEMO_APP_URL);
    await loginPage.login(username, password);

    logger.warn("Auth failed — invalid credentials — capturing evidence");
    const screenshot = await loginPage.captureEvidence("tc021-invalid-credentials");
    await test.info().attach("auth-failure-screenshot", {
      body: screenshot,
      contentType: "image/png",
    });

    await expect(loginPage.errorMessage).toBeVisible();
    const msg = await loginPage.getErrorMessage();
    expect(msg.length, "Error message should not be empty").toBeGreaterThan(0);

    await test.info().attach("auth-failure-error-text", {
      body: msg,
      contentType: "text/plain",
    });
    logger.info(`Error shown as expected: "${msg}"`);
  });
});
