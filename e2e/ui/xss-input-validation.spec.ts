import { test, expect } from "../../fixtures/base.fixture";
import { XssHelper } from "../../helpers/xss.helper";
import {
  scriptInjectionPayloads,
  htmlInjectionPayloads,
  eventHandlerPayloads,
  specialCharPayloads,
  longInputPayloads,
  malformedPayloads,
  criticalPayloads,
  IXssPayload,
} from "../../test-data/xss-payloads.data";

const BASE_HOST = "demowebshop.tricentis.com";

/**
 * Shared helper: injects one payload into the email field, submits the form,
 * collects the XSS observation, attaches a report, and returns the observation.
 */
async function runXssEmailTest(
  loginPage: Parameters<Parameters<typeof test>[2]>[0]["loginPage"],
  xssHelper: XssHelper,
  payload: IXssPayload,
  page: Parameters<Parameters<typeof test>[2]>[0]["page"],
  originalUrl: string,
  originalTitle: string,
  testInfo: ReturnType<typeof test.info>,
  logger: Parameters<Parameters<typeof test>[2]>[0]["logger"],
) {
  logger.info(`Injecting payload [${payload.id}]: ${payload.description}`);
  logger.debug(`Payload value: ${payload.payload.substring(0, 120)}`);

  await xssHelper.attachListeners(page, BASE_HOST);

  await loginPage.login(payload.payload, "dummy_password_for_xss_test");

  const obs = await xssHelper.getObservation(page, originalUrl, originalTitle);
  xssHelper.detachListeners(page);

  const report = xssHelper.formatObservationReport(payload, obs);
  await testInfo.attach(`xss-report-${payload.id}`, {
    body: report,
    contentType: "text/plain",
  });

  if (xssHelper.isXssExecuted(obs)) {
    logger.warn(`⚠ XSS EXECUTED for payload [${payload.id}]: ${payload.description}`);
    const screenshot = await loginPage.captureEvidence(`xss-executed-${payload.id}`);
    await testInfo.attach(`xss-executed-screenshot-${payload.id}`, {
      body: screenshot,
      contentType: "image/png",
    });
  } else {
    logger.info(`✓ SAFE — payload [${payload.id}] was blocked or neutralised`);
  }

  return obs;
}

test.describe("XSS & Input Validation", { tag: "@xss" }, () => {
  let xssHelper: XssHelper;
  let originalTitle: string;

  test.beforeEach(async ({ loginPage, logger, page }) => {
    xssHelper = new XssHelper(logger);
    logger.info("--- beforeEach: navigating to login page ---");
    await loginPage.navigateToLogin();
    originalTitle = await loginPage.getTitle();
    logger.debug(`Original page title captured: "${originalTitle}"`);
  });

  test.afterEach(async ({ page }) => {
    xssHelper.detachListeners(page);
  });

  // ─── TC_015: Script Injection ────────────────────────────────────────────────

  test(
    "[TC_015] — Script injection in email field is blocked",
    async ({ loginPage, logger, page }) => {
      logger.info("Test: script injection payloads in email field");
      const results: Array<{ payload: IXssPayload; obs: Awaited<ReturnType<typeof runXssEmailTest>> }> = [];

      for (const payload of scriptInjectionPayloads) {
        await loginPage.navigateToLogin();
        const originalUrl = page.url();

        const obs = await runXssEmailTest(
          loginPage, xssHelper, payload, page,
          originalUrl, originalTitle, test.info(), logger,
        );
        results.push({ payload, obs });

        // Core assertions per payload
        expect(
          xssHelper.isXssExecuted(obs),
          `Payload [${payload.id}] should be blocked — XSS must not execute`,
        ).toBe(false);
        expect(
          await loginPage.isLoggedIn(),
          "Script injection must not grant authenticated access",
        ).toBe(false);
        expect(
          await loginPage.isPageTitleUnchanged(originalTitle),
          "Page title must not be mutated by script injection",
        ).toBe(true);
      }

      const batchReport = xssHelper.formatBatchReport(results);
      await test.info().attach("tc015-script-injection-batch-report", {
        body: batchReport,
        contentType: "text/plain",
      });
      logger.info(`TC_015 complete — ${results.length} payloads tested`);
    },
  );

  // ─── TC_016: HTML Injection ──────────────────────────────────────────────────

  test(
    "[TC_016] — HTML tag injection in email field is blocked",
    async ({ loginPage, logger, page }) => {
      logger.info("Test: HTML injection payloads in email field");
      const results: Array<{ payload: IXssPayload; obs: Awaited<ReturnType<typeof runXssEmailTest>> }> = [];

      for (const payload of htmlInjectionPayloads) {
        await loginPage.navigateToLogin();
        const originalUrl = page.url();

        const obs = await runXssEmailTest(
          loginPage, xssHelper, payload, page,
          originalUrl, originalTitle, test.info(), logger,
        );
        results.push({ payload, obs });

        expect(
          xssHelper.isXssExecuted(obs),
          `HTML payload [${payload.id}] must not be rendered as live DOM`,
        ).toBe(false);
        expect(
          await loginPage.isLoggedIn(),
          "HTML injection must not grant access",
        ).toBe(false);
      }

      await test.info().attach("tc016-html-injection-batch-report", {
        body: xssHelper.formatBatchReport(results),
        contentType: "text/plain",
      });
      logger.info(`TC_016 complete — ${results.length} payloads tested`);
    },
  );

  // ─── TC_017: Event Handler / JS URI Injection ────────────────────────────────

  test(
    "[TC_017] — Event handler and javascript: URI injection is blocked",
    async ({ loginPage, logger, page }) => {
      logger.info("Test: event handler / JS URI payloads in email field");
      const results: Array<{ payload: IXssPayload; obs: Awaited<ReturnType<typeof runXssEmailTest>> }> = [];

      for (const payload of eventHandlerPayloads) {
        await loginPage.navigateToLogin();
        const originalUrl = page.url();

        const obs = await runXssEmailTest(
          loginPage, xssHelper, payload, page,
          originalUrl, originalTitle, test.info(), logger,
        );
        results.push({ payload, obs });

        expect(
          obs.dialogFired,
          `Payload [${payload.id}]: browser dialog must NOT fire (XSS not executed)`,
        ).toBe(false);
        expect(
          obs.externalRequestMade,
          `Payload [${payload.id}]: no external request should be triggered`,
        ).toBe(false);
        expect(
          await loginPage.isLoggedIn(),
          "Event handler injection must not grant access",
        ).toBe(false);
      }

      await test.info().attach("tc017-event-handler-batch-report", {
        body: xssHelper.formatBatchReport(results),
        contentType: "text/plain",
      });
      logger.info(`TC_017 complete — ${results.length} payloads tested`);
    },
  );

  // ─── TC_018: Special Characters ─────────────────────────────────────────────

  test(
    "[TC_018] — Special characters are handled safely in email and password fields",
    async ({ loginPage, logger, page }) => {
      logger.info("Test: special character payloads in email and password fields");

      for (const payload of specialCharPayloads) {
        await loginPage.navigateToLogin();
        const originalUrl = page.url();
        logger.info(`Testing special chars [${payload.id}]: ${payload.description}`);

        await xssHelper.attachListeners(page, BASE_HOST);

        // Test in email field
        await loginPage.login(payload.payload, "DummyPass1!");
        let obs = await xssHelper.getObservation(page, originalUrl, originalTitle);
        xssHelper.detachListeners(page);

        await test.info().attach(`tc018-email-${payload.id}`, {
          body: xssHelper.formatObservationReport(payload, obs),
          contentType: "text/plain",
        });

        expect(
          xssHelper.isXssExecuted(obs),
          `Special chars [${payload.id}] in email must not execute`,
        ).toBe(false);
        expect(await loginPage.isLoggedIn()).toBe(false);

        // Test same payload in password field (with valid email format)
        await loginPage.navigateToLogin();
        const originalUrl2 = page.url();
        await xssHelper.attachListeners(page, BASE_HOST);
        await loginPage.login("test@example.com", payload.payload);
        obs = await xssHelper.getObservation(page, originalUrl2, originalTitle);
        xssHelper.detachListeners(page);

        expect(
          xssHelper.isXssExecuted(obs),
          `Special chars [${payload.id}] in password must not execute`,
        ).toBe(false);
        logger.info(`✓ [${payload.id}] handled safely in both fields`);
      }
    },
  );

  // ─── TC_019: SQL-Like Injection ──────────────────────────────────────────────

  test(
    "[TC_019] — SQL-like injection does not grant unauthorised access",
    async ({ loginPage, logger, page }) => {
      logger.info("Test: SQL injection patterns must not bypass authentication");

      const sqlPayloads = specialCharPayloads.filter(
        (p) => p.id === "SC-002" || p.id === "SC-003",
      );

      for (const payload of sqlPayloads) {
        await loginPage.navigateToLogin();
        const originalUrl = page.url();
        logger.info(`SQL injection test [${payload.id}]: ${payload.description}`);

        await xssHelper.attachListeners(page, BASE_HOST);
        await loginPage.login(payload.payload, payload.payload);
        const obs = await xssHelper.getObservation(page, originalUrl, originalTitle);
        xssHelper.detachListeners(page);

        await test.info().attach(`tc019-sql-${payload.id}`, {
          body: xssHelper.formatObservationReport(payload, obs),
          contentType: "text/plain",
        });

        // Primary assertion: SQL injection must NOT grant login
        expect(
          await loginPage.isLoggedIn(),
          `SQL injection [${payload.id}] must NOT grant authenticated access`,
        ).toBe(false);

        const errorShown = await loginPage.isErrorVisible();
        logger.info(
          `[${payload.id}] isLoggedIn=false ✓, errorVisible=${errorShown}`,
        );

        // Verify application responded with an error (not a blank page)
        const isResponded =
          errorShown || (await loginPage.isOnLoginPage());
        expect(
          isResponded,
          "Application must respond to SQL injection with an error or stay on login page",
        ).toBe(true);
      }
    },
  );

  // ─── TC_020: Long Input (1 000 chars) ────────────────────────────────────────

  test(
    "[TC_020] — Excessively long input (1 000 chars) is handled without crash",
    async ({ loginPage, logger, page }) => {
      logger.info("Test: 1 000-character inputs in email and password fields");

      const longEmail = longInputPayloads.find((p) => p.id === "LI-002")!;
      const longPass = longInputPayloads.find((p) => p.id === "LI-002")!;
      const originalUrl = page.url();

      await xssHelper.attachListeners(page, BASE_HOST);
      await loginPage.login(longEmail.payload, longPass.payload);
      const obs = await xssHelper.getObservation(page, originalUrl, originalTitle);
      xssHelper.detachListeners(page);

      await test.info().attach("tc020-long-input-report", {
        body: xssHelper.formatObservationReport(longEmail, obs),
        contentType: "text/plain",
      });

      // Page must remain responsive and not crash
      const currentUrl = page.url();
      expect(currentUrl, "Page must still be reachable after long input").toBeTruthy();
      expect(
        await loginPage.isLoggedIn(),
        "Long input must not grant access",
      ).toBe(false);
      expect(
        xssHelper.isXssExecuted(obs),
        "Long input must not execute XSS",
      ).toBe(false);

      // Verify the field accepted or truncated the value gracefully
      const emailValue = await loginPage.getEmailFieldValue();
      logger.info(
        `Email field stored ${emailValue.length} chars (input was ${longEmail.payload.length})`,
      );
      await test.info().attach("tc020-field-length", {
        body: `Input length: ${longEmail.payload.length}\nStored length: ${emailValue.length}\nTruncated: ${emailValue.length < longEmail.payload.length}`,
        contentType: "text/plain",
      });

      logger.info("TC_020 ✓ — page remained stable with 1 000-char input");
    },
  );

  // ─── TC_021: Long Input Stress (10 000 chars) ────────────────────────────────

  test(
    "[TC_021] — Excessively long input (10 000 chars) does not crash the server",
    async ({ loginPage, logger, page }) => {
      logger.info("Test: 10 000-character input — server-side limit stress test");

      const payload = longInputPayloads.find((p) => p.id === "LI-003")!;
      const originalUrl = page.url();

      await xssHelper.attachListeners(page, BASE_HOST);

      // Use a longer timeout for this test as the large payload may be slow
      await loginPage.login(payload.payload, "DummyPass1!");

      const obs = await xssHelper.getObservation(page, originalUrl, originalTitle);
      xssHelper.detachListeners(page);

      await test.info().attach("tc021-10k-report", {
        body: xssHelper.formatObservationReport(payload, obs),
        contentType: "text/plain",
      });

      const currentUrl = page.url();
      expect(currentUrl, "Page must still respond after 10k-char input").toBeTruthy();
      expect(await loginPage.isLoggedIn()).toBe(false);

      const emailValue = await loginPage.getEmailFieldValue();
      logger.info(
        `Email field: input=${payload.payload.length} chars, stored=${emailValue.length} chars`,
      );
      await test.info().attach("tc021-field-length", {
        body: `Input length: ${payload.payload.length}\nStored length: ${emailValue.length}\nTruncated/rejected: ${emailValue.length < payload.payload.length}`,
        contentType: "text/plain",
      });

      logger.info("TC_021 ✓ — server did not crash with 10 000-char input");
    },
  );

  // ─── TC_022: Malformed / Control Character Input ─────────────────────────────

  test(
    "[TC_022] — Malformed and control character input is handled safely",
    async ({ loginPage, logger, page }) => {
      logger.info("Test: malformed input — null bytes, control chars, Unicode edge cases");
      const results: Array<{ payload: IXssPayload; obs: Awaited<ReturnType<typeof runXssEmailTest>> }> = [];

      for (const payload of malformedPayloads) {
        await loginPage.navigateToLogin();
        const originalUrl = page.url();
        logger.info(`Malformed input [${payload.id}]: ${payload.description}`);

        const obs = await runXssEmailTest(
          loginPage, xssHelper, payload, page,
          originalUrl, originalTitle, test.info(), logger,
        );
        results.push({ payload, obs });

        // Page must remain stable — no crash, no XSS
        expect(
          xssHelper.isXssExecuted(obs),
          `Malformed input [${payload.id}] must not execute XSS`,
        ).toBe(false);
        expect(await loginPage.isLoggedIn()).toBe(false);

        // Page must still be reachable
        const url = page.url();
        expect(url, "Page must remain reachable after malformed input").toBeTruthy();
        logger.info(`✓ [${payload.id}] — page stable, no access granted`);
      }

      await test.info().attach("tc022-malformed-batch-report", {
        body: xssHelper.formatBatchReport(results),
        contentType: "text/plain",
      });
      logger.info(`TC_022 complete — ${results.length} malformed payloads tested`);
    },
  );

  // ─── TC_023: Browser-Side XSS Verification (Critical Payloads) ───────────────

  test(
    "[TC_023] — Browser-side XSS verification — critical payload suite",
    async ({ loginPage, logger, page }) => {
      logger.info(
        "Test: full browser-side XSS observation for critical payloads " +
        "(dialog interception, DOM inspection, network monitoring, console capture)",
      );

      const results: Array<{ payload: IXssPayload; obs: Awaited<ReturnType<typeof runXssEmailTest>> }> = [];

      for (const payload of criticalPayloads) {
        await loginPage.navigateToLogin();
        const originalUrl = page.url();

        const obs = await runXssEmailTest(
          loginPage, xssHelper, payload, page,
          originalUrl, originalTitle, test.info(), logger,
        );
        results.push({ payload, obs });

        // ── UI Behaviour ─────────────────────────────────────────────────────
        const errorShown = await loginPage.isErrorVisible();
        const onLoginPage = await loginPage.isOnLoginPage();
        const safeResponse = errorShown || onLoginPage;

        logger.info(
          `[${payload.id}] UI: errorVisible=${errorShown}, onLoginPage=${onLoginPage}`,
        );

        expect(
          safeResponse,
          `[${payload.id}] Application must respond safely (error or stay on login page)`,
        ).toBe(true);

        // ── Browser-Side Behaviour ────────────────────────────────────────────
        expect(
          obs.dialogFired,
          `[${payload.id}] No browser dialog must fire — XSS not executed`,
        ).toBe(false);
        expect(
          obs.scriptElementFound,
          `[${payload.id}] No <script> element must appear in DOM`,
        ).toBe(false);
        expect(
          obs.externalRequestMade,
          `[${payload.id}] No external network request must be triggered`,
        ).toBe(false);
        expect(
          await loginPage.isLoggedIn(),
          `[${payload.id}] XSS payload must not grant authenticated access`,
        ).toBe(false);
        expect(
          await loginPage.isPageTitleUnchanged(originalTitle),
          `[${payload.id}] Page title must not be mutated`,
        ).toBe(true);

        // Log console errors captured (informational — not a test failure)
        if (obs.consoleErrors.length > 0) {
          logger.warn(
            `[${payload.id}] Console errors during payload: ${obs.consoleErrors.join(" | ")}`,
          );
        }
      }

      // Attach final batch summary
      const batchReport = xssHelper.formatBatchReport(results);
      await test.info().attach("tc023-critical-xss-batch-report", {
        body: batchReport,
        contentType: "text/plain",
      });

      const executed = results.filter((r) => xssHelper.isXssExecuted(r.obs));
      logger.info(
        `TC_023 complete — ${results.length} critical payloads: ` +
        `${executed.length} executed (unsafe), ${results.length - executed.length} blocked (safe)`,
      );

      // Overall: zero payloads must have executed
      expect(
        executed.length,
        "All critical payloads must be blocked — none should execute",
      ).toBe(0);
    },
  );
});
