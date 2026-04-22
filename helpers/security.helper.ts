import { Page, APIResponse } from "@playwright/test";
import { Logger } from "../utils/logger";

export enum SecurityChallengeType {
  NONE = "NONE",
  RECAPTCHA = "RECAPTCHA",
  HCAPTCHA = "HCAPTCHA",
  CLOUDFLARE = "CLOUDFLARE",
  MFA = "MFA",
  ACCOUNT_LOCKED = "ACCOUNT_LOCKED",
  RATE_LIMITED = "RATE_LIMITED",
  BOT_PROTECTION = "BOT_PROTECTION",
}

export interface SecurityChallenge {
  type: SecurityChallengeType;
  detected: boolean;
  description: string;
  /** The selector, URL fragment, or header that triggered detection */
  evidence?: string;
}

const NONE = (description: string): SecurityChallenge => ({
  type: SecurityChallengeType.NONE,
  detected: false,
  description,
});

const FOUND = (
  type: SecurityChallengeType,
  description: string,
  evidence: string
): SecurityChallenge => ({ type, detected: true, description, evidence });

/**
 * Detects security challenges (CAPTCHA, MFA, rate-limiting, bot-protection,
 * account lockout) from the current page or API response.
 *
 * All detectors are non-destructive — they only observe, never interact with
 * challenge UI. Tests must document findings and continue rather than bypass.
 */
export class SecurityHelper {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // ─── CAPTCHA ────────────────────────────────────────────────────────────────

  async detectCaptcha(page: Page): Promise<SecurityChallenge> {
    this.logger.debug("Checking for CAPTCHA presence");

    const reCaptchaFrame = page.locator(
      'iframe[src*="recaptcha"], iframe[title*="reCAPTCHA"]'
    );
    if (await reCaptchaFrame.isVisible()) {
      return FOUND(
        SecurityChallengeType.RECAPTCHA,
        "Google reCAPTCHA iframe detected on page",
        'iframe[src*="recaptcha"]'
      );
    }

    const hCaptchaFrame = page.locator(
      'iframe[src*="hcaptcha"], iframe[title*="hCaptcha"]'
    );
    if (await hCaptchaFrame.isVisible()) {
      return FOUND(
        SecurityChallengeType.HCAPTCHA,
        "hCaptcha iframe detected on page",
        'iframe[src*="hcaptcha"]'
      );
    }

    const gRecaptchaDiv = page.locator(".g-recaptcha");
    if (await gRecaptchaDiv.isVisible()) {
      return FOUND(
        SecurityChallengeType.RECAPTCHA,
        "Google reCAPTCHA widget element (.g-recaptcha) detected",
        ".g-recaptcha"
      );
    }

    this.logger.debug("CAPTCHA: not detected");
    return NONE("No CAPTCHA detected on this page");
  }

  // ─── MFA / Two-Factor ───────────────────────────────────────────────────────

  async detectMfa(page: Page): Promise<SecurityChallenge> {
    this.logger.debug("Checking for MFA/2FA challenge presence");

    const otpInput = page.locator(
      'input[name*="otp"], input[name*="code"], input[id*="otp"], input[id*="mfa"], input[autocomplete="one-time-code"]'
    );
    if (await otpInput.isVisible()) {
      return FOUND(
        SecurityChallengeType.MFA,
        "OTP/MFA input field detected — two-factor authentication required",
        'input[name*="otp"]'
      );
    }

    const bodyText = await page.locator("body").innerText();
    const mfaKeywords = [
      "two-factor",
      "two factor",
      "verification code",
      "authenticator",
      "enter the code",
      "one-time password",
    ];
    const found = mfaKeywords.find((kw) =>
      bodyText.toLowerCase().includes(kw)
    );
    if (found) {
      return FOUND(
        SecurityChallengeType.MFA,
        `MFA challenge detected via page text keyword: "${found}"`,
        `body text: "${found}"`
      );
    }

    this.logger.debug("MFA: not detected");
    return NONE("No MFA/2FA challenge detected on this page");
  }

  // ─── Rate Limiting (UI) ─────────────────────────────────────────────────────

  async detectRateLimit(page: Page): Promise<SecurityChallenge> {
    this.logger.debug("Checking for rate-limiting indicators");

    const bodyText = await page.locator("body").innerText();
    const rateLimitKeywords = [
      "too many requests",
      "rate limit",
      "try again later",
      "slow down",
      "429",
      "request limit",
    ];
    const found = rateLimitKeywords.find((kw) =>
      bodyText.toLowerCase().includes(kw)
    );
    if (found) {
      return FOUND(
        SecurityChallengeType.RATE_LIMITED,
        `Rate-limiting detected via page text: "${found}"`,
        `body text: "${found}"`
      );
    }

    this.logger.debug("Rate limiting: not detected on page");
    return NONE("No rate-limiting indicators detected on this page");
  }

  // ─── Rate Limiting (API response) ───────────────────────────────────────────

  async detectRateLimitFromResponse(
    response: APIResponse
  ): Promise<SecurityChallenge> {
    this.logger.debug(
      `Checking API response for rate-limiting (status: ${response.status()})`
    );

    if (response.status() === 429) {
      return FOUND(
        SecurityChallengeType.RATE_LIMITED,
        "HTTP 429 Too Many Requests — server is rate-limiting automated requests",
        "HTTP status 429"
      );
    }

    const retryAfter = response.headers()["retry-after"];
    if (retryAfter) {
      return FOUND(
        SecurityChallengeType.RATE_LIMITED,
        `Rate-limiting via Retry-After header: ${retryAfter}s`,
        `Retry-After: ${retryAfter}`
      );
    }

    const body = await response.text().catch(() => "");
    const rateLimitKeywords = [
      "too many requests",
      "rate limit",
      "try again later",
    ];
    const found = rateLimitKeywords.find((kw) =>
      body.toLowerCase().includes(kw)
    );
    if (found) {
      return FOUND(
        SecurityChallengeType.RATE_LIMITED,
        `Rate-limiting in API response body: "${found}"`,
        `response body: "${found}"`
      );
    }

    this.logger.debug("Rate limiting: not detected in API response");
    return NONE("No rate-limiting detected in API response");
  }

  // ─── Bot Protection / Cloudflare ────────────────────────────────────────────

  async detectBotProtection(page: Page): Promise<SecurityChallenge> {
    this.logger.debug("Checking for bot-protection / Cloudflare challenge");

    const cfChallenge = page.locator(
      "#cf-challenge-stage, #cf-please-wait, .cf-browser-verification"
    );
    if (await cfChallenge.isVisible()) {
      return FOUND(
        SecurityChallengeType.CLOUDFLARE,
        "Cloudflare browser challenge page detected",
        "#cf-challenge-stage"
      );
    }

    const title = await page.title();
    if (
      title.toLowerCase().includes("just a moment") ||
      title.toLowerCase().includes("attention required")
    ) {
      return FOUND(
        SecurityChallengeType.CLOUDFLARE,
        `Cloudflare challenge detected via page title: "${title}"`,
        `page title: "${title}"`
      );
    }

    this.logger.debug("Bot protection: not detected");
    return NONE("No bot-protection challenge detected on this page");
  }

  async detectBotProtectionFromResponse(
    response: APIResponse
  ): Promise<SecurityChallenge> {
    this.logger.debug("Checking API response headers for bot-protection signals");

    const headers = response.headers();
    if (headers["cf-mitigated"]) {
      return FOUND(
        SecurityChallengeType.BOT_PROTECTION,
        `Cloudflare mitigation header detected: cf-mitigated=${headers["cf-mitigated"]}`,
        `cf-mitigated: ${headers["cf-mitigated"]}`
      );
    }
    if (headers["x-request-id"] && response.status() === 403) {
      return FOUND(
        SecurityChallengeType.BOT_PROTECTION,
        "HTTP 403 with request-id header — possible bot-protection block",
        "HTTP 403 + x-request-id header"
      );
    }

    this.logger.debug("Bot protection headers: not detected");
    return NONE("No bot-protection headers in API response");
  }

  // ─── Account Lockout ────────────────────────────────────────────────────────

  async detectAccountLockout(page: Page): Promise<SecurityChallenge> {
    this.logger.debug("Checking for account lockout indicators");

    const bodyText = await page.locator("body").innerText();
    const lockoutKeywords = [
      "account has been locked",
      "account is locked",
      "too many failed",
      "temporarily disabled",
      "temporarily locked",
      "account disabled",
      "suspended",
    ];
    const found = lockoutKeywords.find((kw) =>
      bodyText.toLowerCase().includes(kw)
    );
    if (found) {
      return FOUND(
        SecurityChallengeType.ACCOUNT_LOCKED,
        `Account lockout detected via page text: "${found}"`,
        `body text: "${found}"`
      );
    }

    this.logger.debug("Account lockout: not detected");
    return NONE("No account lockout indicators detected");
  }

  // ─── Detect All (UI) ────────────────────────────────────────────────────────

  /**
   * Runs all UI-based detectors in sequence.
   * Returns the first challenge found, or NONE if nothing detected.
   */
  async detectAll(page: Page): Promise<SecurityChallenge> {
    this.logger.info("Running full security challenge scan on current page");

    const detectors: Array<(p: Page) => Promise<SecurityChallenge>> = [
      (p) => this.detectCaptcha(p),
      (p) => this.detectMfa(p),
      (p) => this.detectBotProtection(p),
      (p) => this.detectRateLimit(p),
      (p) => this.detectAccountLockout(p),
    ];

    for (const detector of detectors) {
      const result = await detector(page);
      if (result.detected) {
        this.logger.warn(`Security challenge detected: ${result.type}`, {
          description: result.description,
          evidence: result.evidence,
        });
        return result;
      }
    }

    this.logger.info(
      "Security scan complete — no challenges detected on this environment"
    );
    return NONE(
      "Full scan complete: no CAPTCHA, MFA, rate-limit, or bot-protection detected"
    );
  }

  /**
   * Formats a SecurityChallenge as a readable plain-text report for attachment.
   */
  formatReport(challenge: SecurityChallenge): string {
    return [
      `Security Challenge Report`,
      `========================`,
      `Type:      ${challenge.type}`,
      `Detected:  ${challenge.detected}`,
      `Details:   ${challenge.description}`,
      `Evidence:  ${challenge.evidence ?? "N/A"}`,
    ].join("\n");
  }
}
