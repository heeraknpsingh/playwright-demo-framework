import { Page, Locator } from "@playwright/test";
import { BasePage } from "./base/BasePage";
import { Logger } from "../utils/logger";

export class DemoAppLoginPage extends BasePage {
  private readonly usernameInput: Locator;
  private readonly passwordInput: Locator;
  private readonly submitButton: Locator;
  readonly errorMessage: Locator;
  readonly loginSection: Locator;

  constructor(page: Page, logger: Logger) {
    super(page, logger);
    this.loginSection = page.locator("#login-section");
    this.usernameInput = page.locator("#username");
    this.passwordInput = page.locator("#password");
    this.submitButton = page.locator('button[type="submit"]');
    this.errorMessage = page.locator("#error-msg");
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitForElement(this.usernameInput);
  }

  async navigateToApp(baseUrl: string): Promise<void> {
    this.logger.info(`Navigating to demo app: ${baseUrl}`);
    await this.page.goto(baseUrl);
    await this.waitForPageLoad();
  }

  async login(username: string, password: string): Promise<void> {
    this.logger.info(`Logging in as: ${username}`);
    await this.fillField(this.usernameInput, username, "Username");
    await this.fillField(this.passwordInput, password, "Password");
    await this.clickElement(this.submitButton, "Login button");
  }

  async getErrorMessage(): Promise<string> {
    return this.getText(this.errorMessage);
  }

  async isErrorVisible(): Promise<boolean> {
    return this.isElementVisible(this.errorMessage);
  }
}
