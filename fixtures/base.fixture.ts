import { test as base, TestInfo } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { HomePage } from "../page-objects/HomePage";
import { ApiHelper } from "../helpers/api.helper";
import { SecurityHelper } from "../helpers/security.helper";
import { AccessibilityHelper } from "../helpers/accessibility.helper";
import { LighthouseHelper } from "../helpers/lighthouse.helper";
import { createLogger, Logger } from "../utils/logger";
import { envConfig, EnvConfig } from "../utils/env.loader";

export type BaseFixtures = {
  logger: Logger;
  loginPage: LoginPage;
  homePage: HomePage;
  apiHelper: ApiHelper;
  securityHelper: SecurityHelper;
  a11yHelper: AccessibilityHelper;
  lighthouseHelper: LighthouseHelper;
  testUser: { email: string; password: string };
  env: EnvConfig;
  captureOnFailure: void;
};

export const test = base.extend<BaseFixtures>({
  logger: async ({}, use, testInfo: TestInfo) => {
    const log = createLogger(testInfo.title);
    log.info(`Test started: "${testInfo.title}"`);
    await use(log);
    const status = testInfo.status ?? "unknown";
    if (status === "failed" || status === "timedOut") {
      log.error(`Test FAILED: "${testInfo.title}"`, {
        status,
        errors: testInfo.errors?.map((e) => e.message),
      });
    } else {
      log.info(`Test ${status.toUpperCase()}: "${testInfo.title}"`);
    }
  },

  env: async ({}, use) => {
    await use(envConfig);
  },

  testUser: async ({ env }, use) => {
    await use({ email: env.userEmail, password: env.userPassword });
  },

  loginPage: async ({ page, logger }, use) => {
    const loginPage = new LoginPage(page, logger);
    await use(loginPage);
  },

  homePage: async ({ page, logger }, use) => {
    const homePage = new HomePage(page, logger);
    await use(homePage);
  },

  apiHelper: async ({ request, logger }, use) => {
    const apiHelper = new ApiHelper(request, logger);
    await use(apiHelper);
  },

  securityHelper: async ({ logger }, use) => {
    await use(new SecurityHelper(logger));
  },

  a11yHelper: async ({ logger }, use) => {
    await use(new AccessibilityHelper(logger));
  },

  lighthouseHelper: async ({ logger }, use) => {
    await use(new LighthouseHelper(logger));
  },

  /**
   * Auto-fixture: runs after every test without needing to be declared in test params.
   * Captures a full-page screenshot, page HTML, and logs when authentication or any
   * test fails, then attaches all artifacts directly to the Playwright HTML report.
   */
  captureOnFailure: [
    async ({ page, logger }, use, testInfo: TestInfo) => {
      await use();
      const failed =
        testInfo.status === "failed" || testInfo.status === "timedOut";
      if (failed) {
        logger.error(`=== TEST FAILED: "${testInfo.title}" ===`, {
          status: testInfo.status,
          duration: `${testInfo.duration}ms`,
          errors: testInfo.errors?.map((e) => e.message),
        });

        // 1. Full-page screenshot attached to HTML report
        try {
          const screenshot = await page.screenshot({ fullPage: true });
          await testInfo.attach("failure-screenshot", {
            body: screenshot,
            contentType: "image/png",
          });
          logger.info("Failure screenshot attached to report");
        } catch (err) {
          logger.warn("Could not capture failure screenshot", {
            reason: String(err),
          });
        }

        // 2. Page HTML source attached for DOM inspection
        try {
          const html = await page.content();
          await testInfo.attach("failure-page-source", {
            body: html,
            contentType: "text/html",
          });
          logger.info("Failure page source attached to report");
        } catch (err) {
          logger.warn("Could not capture page source", { reason: String(err) });
        }

        // 3. Current URL logged for quick triage
        try {
          logger.error(`Failure URL: ${page.url()}`);
        } catch {
          // page may be closed
        }
        // 4. Error messages logged individually
        testInfo.errors?.forEach((e, i) => {
          logger.error(`Error[${i}]: ${e.message}`);
        });
      }
    },
    { auto: true },
  ],
});
export { expect } from "@playwright/test";
