import { test, expect } from "../../fixtures/base.fixture";
import { loginTestData } from "../../test-data/login.data";

test.describe("Login — UI Tests", { tag: "@ui" }, () => {
  test.beforeEach(async ({ loginPage, logger }) => {
    logger.info("--- beforeEach: navigating to login page ---");
    await loginPage.navigateToLogin();
  });

  test("[TC-005] — Valid login with correct credentials", async ({
    loginPage,
    logger,
    testUser,
  }) => {
    logger.info("Test: valid login flow");
    const { email, password } = testUser;
    await loginPage.login(email, password);
    logger.info("Asserting user is logged in");
    const isLoggedIn = await loginPage.isLoggedIn();
    expect(isLoggedIn).toBeTruthy();
    const loggedInEmail = await loginPage.getLoggedInUserEmail();
    logger.info(`Logged in as: ${loggedInEmail}`);
    expect(loggedInEmail.toLowerCase()).toContain(email.toLowerCase());
  });

  test("[TC-006] — Invalid password shows error message", async ({ loginPage, logger }) => {
    const { email, password, description } = loginTestData.invalidPasswordUser;
    logger.info(`Test: ${description}`);
    await loginPage.login(email, password);

    logger.warn("Authentication failed — invalid password — capturing evidence");
    const screenshot = await loginPage.captureEvidence("tc006-invalid-password");
    await test.info().attach("auth-failure-screenshot", {
      body: screenshot,
      contentType: "image/png",
    });

    const isError = await loginPage.isErrorVisible();
    expect(isError).toBeTruthy();
    const errorText = await loginPage.getErrorMessage();
    logger.info(`Auth failure error message: "${errorText}"`);
    await test.info().attach("auth-failure-error-text", {
      body: errorText,
      contentType: "text/plain",
    });
    expect(errorText).not.toBeNull();
  });

  test("[TC-007] — Unregistered email shows error message", async ({ loginPage, logger }) => {
    const { email, password, description } = loginTestData.invalidEmailUser;
    logger.info(`Test: ${description}`);
    await loginPage.login(email, password);

    logger.warn("Authentication failed — unregistered email — capturing evidence");
    const screenshot = await loginPage.captureEvidence("tc007-unregistered-email");
    await test.info().attach("auth-failure-screenshot", {
      body: screenshot,
      contentType: "image/png",
    });

    const isError = await loginPage.isErrorVisible();
    const errorText = isError ? await loginPage.getErrorMessage() : "";
    logger.info(`Auth failure error message: "${errorText}"`);
    await test.info().attach("auth-failure-error-text", {
      body: errorText || "(no error message found)",
      contentType: "text/plain",
    });
    expect(isError).toBeTruthy();
  });

  test("[TC-008] — Empty credentials show validation errors", async ({ loginPage, logger }) => {
    const { description } = loginTestData.emptyCredentialsUser;
    logger.info(`Test: ${description}`);
    await loginPage.login("", "");

    logger.warn("Authentication failed — empty credentials — capturing evidence");
    const screenshot = await loginPage.captureEvidence("tc008-empty-credentials");
    await test.info().attach("auth-failure-screenshot", {
      body: screenshot,
      contentType: "image/png",
    });

    const isError = await loginPage.isErrorVisible();
    const errorText = isError ? await loginPage.getErrorMessage() : "";
    logger.info(`Validation error message: "${errorText}"`);
    await test.info().attach("auth-failure-error-text", {
      body: errorText || "(no error message found)",
      contentType: "text/plain",
    });
    expect(isError).toBeTruthy();
  });

  test(
    "[TC-009] — Logout after successful login",
    { tag: "@smoke" },
    async ({ loginPage, homePage, logger, testUser }) => {
      logger.info("Test: logout after login");
      const { email, password } = testUser;
      await loginPage.login(email, password);
      const isLoggedIn = await loginPage.isLoggedIn();
      expect(isLoggedIn).toBeTruthy();
      logger.info("Login verified — proceeding to logout");
      await loginPage.logout();
      logger.info("Asserting user is redirected to home after logout");
      const url = await loginPage.getCurrentUrl();
      logger.info(`URL after logout: ${url}`);
      const isLoginVisible = await homePage.isLoginLinkVisible();
      expect(isLoginVisible).toBeTruthy();
      logger.info("Login link visible — user is logged out");
    },
  );
});
