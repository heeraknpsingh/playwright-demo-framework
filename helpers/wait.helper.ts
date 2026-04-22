import { Page } from "@playwright/test";
import { Logger } from "../utils/logger";

export class WaitHelper {
  private readonly page: Page;
  private readonly logger: Logger;

  constructor(page: Page, logger: Logger) {
    this.page = page;
    this.logger = logger;
  }

  async waitForUrlToContain(
    substring: string,
    timeout = 15_000,
  ): Promise<void> {
    this.logger.debug(`Waiting for URL to contain: "${substring}"`);
    await this.page.waitForURL(`**${substring}**`, { timeout });
    this.logger.debug(`URL now contains: "${substring}"`);
  }

  async waitForUrlToMatch(pattern: RegExp, timeout = 15_000): Promise<void> {
    this.logger.debug(`Waiting for URL to match pattern: ${pattern}`);
    await this.page.waitForURL(pattern, { timeout });
    this.logger.debug("URL pattern matched");
  }

  async waitForNetworkIdle(timeout = 10_000): Promise<void> {
    this.logger.debug("Waiting for network idle");
    await this.page.waitForLoadState("networkidle", { timeout });
    this.logger.debug("Network is idle");
  }

  async waitForDomContentLoaded(timeout = 10_000): Promise<void> {
    this.logger.debug("Waiting for DOM content loaded");
    await this.page.waitForLoadState("domcontentloaded", { timeout });
    this.logger.debug("DOM content loaded");
  }

  async pause(ms: number): Promise<void> {
    this.logger.debug(`Pausing for ${ms}ms`);
    await this.page.waitForTimeout(ms);
  }
}
