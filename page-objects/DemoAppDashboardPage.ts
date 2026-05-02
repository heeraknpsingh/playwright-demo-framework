import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base/BasePage";
import { Logger } from "../utils/logger";
import { DbUser } from "../utils/db.utils";

type UserRole = DbUser["role"];

const ROLE_UI: Record<UserRole, { heading: string; navLinks: string[] }> = {
  admin: {
    heading: "Admin Panel",
    navLinks: ["Manage Users", "System Settings", "Audit Logs"],
  },
  manager: {
    heading: "Manager Dashboard",
    navLinks: ["Team Reports", "Approve Requests", "Team Members"],
  },
  user: {
    heading: "My Workspace",
    navLinks: ["My Profile", "My Orders", "My Settings"],
  },
};

export class DemoAppDashboardPage extends BasePage {
  private readonly dashboardSection: Locator;
  private readonly welcomeMessage: Locator;
  private readonly roleBadge: Locator;
  private readonly logoutButton: Locator;

  constructor(page: Page, logger: Logger) {
    super(page, logger);
    this.dashboardSection = page.locator("#dashboard-section");
    this.welcomeMessage = page.locator("#welcome-msg");
    this.roleBadge = page.locator("#role-badge");
    this.logoutButton = page.locator("#logout-btn");
  }

  async waitForPageLoad(): Promise<void> {
    await this.waitForElement(this.dashboardSection);
  }

  async getWelcomeMessage(): Promise<string> {
    return this.getText(this.welcomeMessage);
  }

  async getRoleBadgeText(): Promise<string> {
    return this.getText(this.roleBadge);
  }

  async assertRoleSpecificUI(role: UserRole): Promise<void> {
    this.logger.info(`Asserting dashboard UI for role: ${role}`);

    const { heading, navLinks } = ROLE_UI[role];
    const roleSection = this.page.locator(`[data-role-section="${role}"]`);

    await expect(roleSection).toBeVisible();
    await expect(roleSection.getByRole("heading", { name: heading })).toBeVisible();

    for (const linkText of navLinks) {
      await expect(roleSection.getByRole("link", { name: linkText })).toBeVisible();
      this.logger.debug(`Link visible: "${linkText}"`);
    }

    // Other role sections must be hidden
    const otherRoles = (Object.keys(ROLE_UI) as UserRole[]).filter((r) => r !== role);
    for (const other of otherRoles) {
      await expect(this.page.locator(`[data-role-section="${other}"]`)).toBeHidden();
      this.logger.debug(`Section hidden for role: ${other}`);
    }

    this.logger.info(`All UI assertions passed for role: ${role}`);
  }

  async assertWelcomeMessage(displayName: string): Promise<void> {
    await expect(this.welcomeMessage).toContainText(displayName);
  }

  async logout(): Promise<void> {
    this.logger.info("Logging out");
    await this.clickElement(this.logoutButton, "Logout button");
    await this.waitForElement(this.page.locator("#login-section"));
    this.logger.info("Logged out, back on login page");
  }
}
