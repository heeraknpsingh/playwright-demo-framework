import { test as base } from "@playwright/test";
import { LoginPage } from "../page-objects/LoginPage";
import { HomePage } from "../page-objects/HomePage";
import { Logger } from "../utils/logger";

export type PageFixtures = {
  loginPage: LoginPage;
  homePage: HomePage;
};

export const pageFixtures = base.extend<PageFixtures & { logger: Logger }>({
  loginPage: async ({ page, logger }, use) => {
    const loginPage = new LoginPage(page, logger);
    await use(loginPage);
  },

  homePage: async ({ page, logger }, use) => {
    const homePage = new HomePage(page, logger);
    await use(homePage);
  },
});
