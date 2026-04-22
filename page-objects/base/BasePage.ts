import { Page, Locator, expect } from "@playwright/test";
import { Logger } from "../../utils/logger";

export abstract class BasePage {
  protected readonly page: Page;
  protected readonly logger: Logger;
  protected readonly headerLinks: Locator;
  protected readonly accountLink: Locator;
  protected readonly logoutLink: Locator;
  protected readonly searchBox: Locator;
  protected readonly loginLink: Locator;
  protected readonly registerLink: Locator;

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger;
    this.headerLinks = page.locator(".header-links");
    this.accountLink = this.headerLinks.locator(".account");
    this.logoutLink = this.headerLinks.locator('a[href="/logout"]');
    this.searchBox = page.locator("#small-searchterms");
    this.loginLink = this.headerLinks.locator('a[href="/login"]');
    this.registerLink = this.headerLinks.locator('a[href="/register"]');
  }

  abstract waitForPageLoad(): Promise<void>;

  async navigateTo(path: string = "/"): Promise<void> {
    const url = `${path}`;
    this.logger.info(`Navigating to: ${url}`);
    await this.page.goto(url);
    await this.waitForPageLoad();
    this.logger.debug(`Navigation complete. Current URL: ${this.page.url()}`);
  }

  async getTitle(): Promise<string> {
    const title = await this.page.title();
    this.logger.debug(`Page title: ${title}`);
    return title;
  }

  async getCurrentUrl(): Promise<string> {
    return this.page.url();
  }

  protected async waitForElement(
    locator: Locator,
    timeout = 10_000,
  ): Promise<void> {
    this.logger.debug(`Waiting for element to be visible`);
    await expect(locator).toBeVisible({ timeout });
  }

  protected async clickElement(
    locator: Locator,
    description: string,
  ): Promise<void> {
    this.logger.debug(`Clicking: ${description}`);
    await this.waitForElement(locator);
    await locator.click();
    this.logger.debug(`Clicked: ${description}`);
  }

  protected async fillField(
    locator: Locator,
    value: string,
    fieldName: string,
  ): Promise<void> {
    this.logger.debug(`Filling field "${fieldName}" with value`);
    await this.waitForElement(locator);
    await locator.clear();
    await locator.fill(value);
    this.logger.debug(`Filled field "${fieldName}"`);
  }

  protected async getText(locator: Locator): Promise<string> {
    await this.waitForElement(locator);
    const text = (await locator.textContent()) ?? "";
    this.logger.debug(`Got text: "${text.trim()}"`);
    return text.trim();
  }

  async takeScreenshot(name: string): Promise<void> {
    const screenshotPath = `reports/screenshots/${name}-${Date.now()}.png`;
    await this.page.screenshot({ path: screenshotPath, fullPage: true });
    this.logger.info(`Screenshot saved: ${screenshotPath}`);
  }

  /**
   * Captures a full-page screenshot and returns it as a Buffer so callers
   * (fixtures or tests) can attach it to the Playwright report via testInfo.attach().
   */
  async captureEvidence(label: string): Promise<Buffer> {
    this.logger.info(`Capturing evidence: "${label}" | URL: ${this.page.url()}`);
    const buffer = await this.page.screenshot({ fullPage: true });
    this.logger.debug(`Evidence captured: "${label}" (${buffer.length} bytes)`);
    return buffer;
  }

  async isElementVisible(locator: Locator): Promise<boolean> {
    return locator.isVisible();
  }
}
