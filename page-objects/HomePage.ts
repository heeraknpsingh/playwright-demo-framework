import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base/BasePage";
import { Logger } from "../utils/logger";

export class HomePage extends BasePage {
  private readonly headerLogo: Locator;

  constructor(page: Page, logger: Logger) {
    super(page, logger);
    this.headerLogo = page.locator(".header-logo");
  }

  async waitForPageLoad(): Promise<void> {
    this.logger.debug("Waiting for home page to load");
    await this.waitForElement(this.headerLogo);
    this.logger.debug("Home page loaded");
  }

  async navigateToHome(): Promise<void> {
    this.logger.info("Navigating to home page");
    await this.navigateTo("/");
  }

  async isUserLoggedIn(): Promise<boolean> {
    const visible = await this.isElementVisible(this.accountLink);
    this.logger.debug(`Home page — user logged in: ${visible}`);
    return visible;
  }

  async getLoggedInEmail(): Promise<string> {
    return this.getText(this.accountLink);
  }

  async clickLoginLink(): Promise<void> {
    this.logger.info("Clicking login link from home page");
    await this.clickElement(this.loginLink, "Login link");
  }

  async logout(): Promise<void> {
    this.logger.info("Logging out from home page");
    await this.clickElement(this.logoutLink, "Logout link");
    this.logger.info("Logout successful from home page");
  }

  async isLoginLinkVisible(): Promise<boolean> {
    return this.isElementVisible(this.loginLink);
  }
}
