import { Page, Locator, TestInfo } from "@playwright/test";
import { BasePage } from "./base/BasePage";
import { Logger } from "../utils/logger";
import { WaitHelper } from "../helpers/wait.helper";
import { SecurityHelper, SecurityChallenge } from "../helpers/security.helper";

export class LoginPage extends BasePage {
  private readonly emailInput: Locator;
  private readonly passwordInput: Locator;
  private readonly loginButton: Locator;
  private readonly errorMessage: Locator;
  private readonly captchaFrame: Locator;
  private readonly mfaInput: Locator;
  private readonly waitHelper: WaitHelper;
  private readonly securityHelper: SecurityHelper;

  private static readonly LOGIN_PATH = "/login";

  constructor(page: Page, logger: Logger) {
    super(page, logger);
    this.waitHelper = new WaitHelper(page, logger);
    this.securityHelper = new SecurityHelper(logger);
    this.emailInput = page.locator("#Email");
    this.passwordInput = page.locator("#Password");
    this.loginButton = page.locator('input[value="Log in"]');
    this.errorMessage = page.locator(
      ".validation-summary-errors, .field-validation-error",
    );
    this.captchaFrame = page.locator(
      'iframe[src*="recaptcha"], iframe[src*="hcaptcha"], iframe[title*="reCAPTCHA"]',
    );
    this.mfaInput = page.locator(
      'input[name*="otp"], input[name*="code"], input[id*="otp"], input[autocomplete="one-time-code"]',
    );
  }

  async waitForPageLoad(): Promise<void> {
    this.logger.debug("Waiting for login page to load");
    await this.waitForElement(this.emailInput);
    this.logger.debug("Login page loaded");
  }

  async navigateToLogin(): Promise<void> {
    this.logger.info("Navigating to login page");
    await this.navigateTo(LoginPage.LOGIN_PATH);
  }

  async login(email: string, password: string): Promise<void> {
    this.logger.info(`Attempting login for user: ${email}`);
    await this.fillField(this.emailInput, email, "Email");
    await this.fillField(this.passwordInput, password, "Password");
    await this.clickElement(this.loginButton, "Login button");
    await this.waitHelper.waitForDomContentLoaded();
    this.logger.info("Login form submitted");
  }

  async getErrorMessage(): Promise<string> {
    this.logger.debug("Retrieving error message");
    return this.getText(this.errorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    this.logger.debug("Checking if error message is visible");
    return this.isElementVisible(this.errorMessage);
  }

  async isLoggedIn(): Promise<boolean> {
    const visible = await this.isElementVisible(this.accountLink);
    this.logger.debug(`User logged in: ${visible}`);
    return visible;
  }

  async getLoggedInUserEmail(): Promise<string> {
    return this.getText(this.accountLink);
  }

  async logout(): Promise<void> {
    this.logger.info("Logging out");
    await this.clickElement(this.logoutLink, "Logout link");
    this.logger.info("Logged out successfully");
  }

  async isOnLoginPage(): Promise<boolean> {
    const url = await this.getCurrentUrl();
    return url.includes("/login");
  }

  // ─── Security Detection ──────────────────────────────────────────────────────

  /**
   * Runs all security detectors (CAPTCHA, MFA, bot-protection, rate-limit,
   * account lockout) against the current page state.
   */
  async detectSecurityChallenge(): Promise<SecurityChallenge> {
    this.logger.info("Running security challenge detection on login page");
    return this.securityHelper.detectAll(this.page);
  }

  /**
   * Returns true if the current error text contains account-lockout keywords.
   * Does not interact with the page — observation only.
   */
  async isAccountLocked(): Promise<boolean> {
    const challenge = await this.securityHelper.detectAccountLockout(this.page);
    this.logger.debug(`Account locked: ${challenge.detected}`);
    return challenge.detected;
  }

  /**
   * Returns true if the page shows rate-limiting indicators after login attempts.
   */
  async isRateLimited(): Promise<boolean> {
    const challenge = await this.securityHelper.detectRateLimit(this.page);
    this.logger.debug(`Rate limited: ${challenge.detected}`);
    return challenge.detected;
  }

  /**
   * Logs and attaches a SecurityChallenge report to the Playwright HTML report.
   * If no challenge detected, documents that as well (absence is evidence too).
   */
  async documentChallenge(
    challenge: SecurityChallenge,
    testInfo: TestInfo,
  ): Promise<void> {
    const report = this.securityHelper.formatReport(challenge);
    this.logger.info(`Security challenge documented: ${challenge.type}`, {
      detected: challenge.detected,
      description: challenge.description,
      evidence: challenge.evidence,
    });

    await testInfo.attach("security-challenge-report", {
      body: report,
      contentType: "text/plain",
    });

    if (challenge.detected) {
      const screenshot = await this.captureEvidence(
        `security-challenge-${challenge.type.toLowerCase()}`,
      );
      await testInfo.attach("security-challenge-screenshot", {
        body: screenshot,
        contentType: "image/png",
      });
    }
  }

  // ─── Input Inspection (for XSS / validation testing) ────────────────────────

  /**
   * Returns the current browser-stored value of the email field.
   * Use after injection to verify the field holds exactly what was entered
   * (i.e. the browser did not sanitise or truncate the value client-side).
   */
  async getEmailFieldValue(): Promise<string> {
    const value = await this.emailInput.inputValue();
    this.logger.debug(`Email field value: "${value.substring(0, 80)}${value.length > 80 ? "…" : ""}"`);
    return value;
  }

  /**
   * Returns the current browser-stored value of the password field.
   */
  async getPasswordFieldValue(): Promise<string> {
    const value = await this.passwordInput.inputValue();
    this.logger.debug(`Password field has value (length: ${value.length})`);
    return value;
  }

  /**
   * Compares the current page <title> to an expected value.
   * A mismatch after payload injection indicates DOM manipulation.
   */
  async isPageTitleUnchanged(expected: string): Promise<boolean> {
    const current = await this.getTitle();
    const unchanged = current === expected;
    if (!unchanged) {
      this.logger.warn(
        `Page title changed — expected: "${expected}", got: "${current}"`,
      );
    }
    return unchanged;
  }
}
