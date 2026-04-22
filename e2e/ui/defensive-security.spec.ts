import { test, expect } from "../../fixtures/base.fixture";
import { loginTestData } from "../../test-data/login.data";
import { SecurityChallengeType } from "../../helpers/security.helper";

/**
 * Defensive Security Test Suite
 *
 * These tests detect and document security challenges rather than bypass them.
 * - If a challenge is ABSENT on this environment → test passes + documents absence
 * - If a challenge is PRESENT → test passes + attaches screenshot + report
 * - Defensive responses (rate-limit, lockout) → document behaviour and pass
 *
 * All tests use robust, maintainable selectors via SecurityHelper and LoginPage.
 */
test.describe("Defensive Security — Login", { tag: "@security" }, () => {
  test.beforeEach(async ({ loginPage, logger }) => {
    logger.info("--- beforeEach: navigating to login page ---");
    await loginPage.navigateToLogin();
  });

  // ─── TC_010: CAPTCHA / Bot-Protection Detection ────────────────────────────

  test(
    "[TC_010] — Detect CAPTCHA or bot-protection on login page",
    async ({ loginPage, logger }) => {
      logger.info("Test: scanning login page for CAPTCHA / bot-protection");

      const challenge = await loginPage.detectSecurityChallenge();
      await loginPage.documentChallenge(challenge, test.info());

      if (challenge.detected) {
        if (
          challenge.type === SecurityChallengeType.RECAPTCHA ||
          challenge.type === SecurityChallengeType.HCAPTCHA
        ) {
          logger.warn(
            `CAPTCHA DETECTED (${challenge.type}): ${challenge.description}`
          );
          logger.warn(
            "Evidence: " + challenge.evidence
          );
          logger.warn(
            "Flow: Test cannot proceed with automated login — CAPTCHA must be solved manually or via CAPTCHA-solving service. Documenting presence."
          );
        } else if (challenge.type === SecurityChallengeType.CLOUDFLARE) {
          logger.warn(
            `Bot-protection DETECTED (Cloudflare): ${challenge.description}`
          );
          logger.warn(
            "Flow: Cloudflare challenge present — automated requests are being challenged. Documenting presence."
          );
        }
      } else {
        logger.info(
          "CAPTCHA / bot-protection: NOT present on this environment"
        );
        logger.info(challenge.description);
      }

      // Test always passes — outcome is documentation, not failure
      expect(challenge.type).toBeDefined();
    }
  );

  // ─── TC_011: MFA / Two-Factor Authentication Detection ────────────────────

  test(
    "[TC_011] — Detect MFA challenge after valid login attempt",
    async ({ loginPage, logger, testUser }) => {
      logger.info("Test: checking for MFA challenge after valid credential login");

      await loginPage.login(testUser.email, testUser.password);

      const challenge = await loginPage.detectSecurityChallenge();
      await loginPage.documentChallenge(challenge, test.info());

      if (challenge.type === SecurityChallengeType.MFA) {
        logger.warn(`MFA DETECTED: ${challenge.description}`);
        logger.warn(`Evidence: ${challenge.evidence}`);
        logger.warn(
          "Flow: MFA prompt present — test documents the step. " +
          "Automated MFA handling requires TOTP secret injection (not supported in this environment). " +
          "Documenting presence and halting further assertions."
        );
      } else if (await loginPage.isLoggedIn()) {
        logger.info(
          "MFA: NOT required — login succeeded without two-factor challenge"
        );
      } else if (await loginPage.isErrorVisible()) {
        const errMsg = await loginPage.getErrorMessage();
        logger.warn(`Login failed with error (no MFA): "${errMsg}"`);
        const screenshot = await loginPage.captureEvidence("tc011-login-state");
        await test.info().attach("tc011-page-state", {
          body: screenshot,
          contentType: "image/png",
        });
      }

      expect(challenge.type).toBeDefined();
    }
  );

  // ─── TC_012: Rate Limiting After Repeated Failures ────────────────────────

  test(
    "[TC_012] — Detect rate-limiting after repeated failed login attempts",
    async ({ loginPage, logger }) => {
      logger.info(
        "Test: submitting 6 rapid failed logins to probe for rate-limiting"
      );

      const attempts = loginTestData.bruteForceAttempts;
      let rateLimitDetected = false;
      let rateLimitAtAttempt = -1;

      for (let i = 0; i < attempts.length; i++) {
        const { email, password, description } = attempts[i];
        logger.info(`Attempt ${i + 1}/6: ${description}`);

        await loginPage.navigateToLogin();
        await loginPage.login(email, password);

        const isLimited = await loginPage.isRateLimited();
        if (isLimited) {
          rateLimitDetected = true;
          rateLimitAtAttempt = i + 1;
          logger.warn(
            `Rate-limiting triggered at attempt ${rateLimitAtAttempt}`
          );

          const screenshot = await loginPage.captureEvidence(
            `tc012-rate-limit-attempt-${rateLimitAtAttempt}`
          );
          await test.info().attach(
            `rate-limit-triggered-at-attempt-${rateLimitAtAttempt}`,
            { body: screenshot, contentType: "image/png" }
          );
          break;
        }

        const errorVisible = await loginPage.isErrorVisible();
        logger.info(
          `Attempt ${i + 1} result: error visible = ${errorVisible}`
        );
      }

      if (rateLimitDetected) {
        logger.warn(
          `Rate-limiting DETECTED at attempt ${rateLimitAtAttempt}. ` +
          "Server is defending against repeated automated requests."
        );
        await test.info().attach("rate-limit-finding", {
          body: `Rate-limiting triggered after ${rateLimitAtAttempt} attempt(s).`,
          contentType: "text/plain",
        });
      } else {
        logger.info(
          "Rate-limiting: NOT triggered after 6 consecutive failed attempts on this environment"
        );
        await test.info().attach("rate-limit-finding", {
          body:
            "No rate-limiting detected after 6 rapid failed login attempts. " +
            "The application may rely on other defensive mechanisms.",
          contentType: "text/plain",
        });
      }

      // Pass regardless — this test documents behaviour, not enforces it
      expect(attempts.length).toBe(6);
    }
  );

  // ─── TC_013: Account Lockout Detection ────────────────────────────────────

  test(
    "[TC_013] — Detect account lockout after repeated invalid-password attempts",
    async ({ loginPage, logger, testUser }) => {
      logger.info(
        "Test: submitting 5 invalid-password attempts to probe for account lockout"
      );

      const wrongPasswords = [
        "Wrong_Pass_1!",
        "Wrong_Pass_2!",
        "Wrong_Pass_3!",
        "Wrong_Pass_4!",
        "Wrong_Pass_5!",
      ];

      let lockoutDetected = false;
      let lockoutAtAttempt = -1;

      for (let i = 0; i < wrongPasswords.length; i++) {
        logger.info(
          `Lockout probe attempt ${i + 1}/5 for email: ${testUser.email}`
        );

        await loginPage.navigateToLogin();
        await loginPage.login(testUser.email, wrongPasswords[i]);

        const locked = await loginPage.isAccountLocked();
        if (locked) {
          lockoutDetected = true;
          lockoutAtAttempt = i + 1;
          logger.warn(
            `Account lockout triggered at attempt ${lockoutAtAttempt}`
          );

          const screenshot = await loginPage.captureEvidence(
            `tc013-lockout-attempt-${lockoutAtAttempt}`
          );
          await test.info().attach("lockout-screenshot", {
            body: screenshot,
            contentType: "image/png",
          });

          const errText = await loginPage.getErrorMessage().catch(() => "");
          logger.warn(`Lockout message: "${errText}"`);
          await test.info().attach("lockout-error-message", {
            body: errText || "(lockout message not in standard error element)",
            contentType: "text/plain",
          });
          break;
        }

        const errText = await loginPage.isErrorVisible()
          ? await loginPage.getErrorMessage()
          : "no error shown";
        logger.info(`Attempt ${i + 1} error: "${errText}"`);
      }

      if (lockoutDetected) {
        logger.warn(
          `Account lockout DETECTED after ${lockoutAtAttempt} attempt(s). ` +
          "Documenting — test will not attempt further login with this account."
        );
      } else {
        logger.info(
          "Account lockout: NOT triggered after 5 invalid-password attempts. " +
          "This environment may not enforce lockout policy."
        );
        await test.info().attach("lockout-finding", {
          body:
            "No account lockout detected after 5 failed attempts. " +
            "Application may rely on rate-limiting or CAPTCHA instead.",
          contentType: "text/plain",
        });
      }

      expect(wrongPasswords.length).toBe(5);
    }
  );

  // ─── TC_014: Bot-Protection Header Detection (API) ────────────────────────

  test(
    "[TC_014] — Detect bot-protection headers from rapid API login attempts",
    async ({ apiHelper, securityHelper, logger }) => {
      logger.info(
        "Test: sending rapid API login requests and inspecting response headers for bot-protection signals"
      );

      const findings: string[] = [];

      for (let i = 0; i < 4; i++) {
        logger.info(`API probe attempt ${i + 1}/4`);

        const response = await apiHelper.post("/login", {
          Email: loginTestData.invalidEmailUser.email,
          Password: "probe_attempt_pass!",
          RememberMe: "false",
        });

        const botChallenge =
          await securityHelper.detectBotProtectionFromResponse(response);
        const rateChallenge =
          await securityHelper.detectRateLimitFromResponse(response);

        if (botChallenge.detected) {
          logger.warn(
            `Bot-protection detected at attempt ${i + 1}: ${botChallenge.description}`
          );
          findings.push(`Attempt ${i + 1}: BOT_PROTECTION — ${botChallenge.evidence}`);
        } else if (rateChallenge.detected) {
          logger.warn(
            `Rate-limiting detected at attempt ${i + 1}: ${rateChallenge.description}`
          );
          findings.push(
            `Attempt ${i + 1}: RATE_LIMITED — ${rateChallenge.evidence}`
          );
        } else {
          logger.info(
            `Attempt ${i + 1}: status ${response.status()} — no defensive headers detected`
          );
          findings.push(
            `Attempt ${i + 1}: NONE — status ${response.status()}, no defensive headers`
          );
        }
      }

      const report = [
        "API Bot-Protection Header Scan",
        "==============================",
        ...findings,
      ].join("\n");

      logger.info("API bot-protection scan complete");
      await test.info().attach("api-bot-protection-report", {
        body: report,
        contentType: "text/plain",
      });

      expect(findings.length).toBe(4);
    }
  );
});
