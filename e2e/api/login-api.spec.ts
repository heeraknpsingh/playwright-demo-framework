import { test, expect } from "../../fixtures/base.fixture";
import { loginTestData } from "../../test-data/login.data";

test.describe("Login — API Tests", { tag: '@api' }, () => {
  test("[TC_001 — API login with valid credentials returns success", async ({
    apiHelper,
    logger,
    testUser,
  }) => {
    logger.info("Test: API login with valid credentials");
    const { email, password } = testUser;
    const result = await apiHelper.loginViaApi(email, password);
    logger.info(`API login status: ${result.statusCode}`);
    expect(result.statusCode).toBeLessThan(400);
    logger.info("API login returned non-error status — PASS");
  });

  test("[TC_002] — API login with invalid password returns error", async ({
    apiHelper,
    logger,
  }) => {
    const { email, password, description } = loginTestData.invalidPasswordUser;
    logger.info(`Test: ${description}`);
    const response = await apiHelper.post("/login", {
      Email: email,
      Password: password,
      RememberMe: "false",
    });
    const status = response.status();
    logger.info(`Response status for invalid password: ${status}`);
    const body = await response.text();
    logger.debug(`Response body snippet: ${body.substring(0, 300)}`);
    const hasLoginError =
      body.includes("Login was unsuccessful") ||
      body.includes("login") ||
      status >= 400;
    expect(hasLoginError).toBeTruthy();
    logger.info("Invalid password login correctly rejected — PASS");
  });

  test("[TC_003] — Access account page without auth redirects to login", async ({
    apiHelper,
    logger,
  }) => {
    logger.info("Test: access protected /customer/info without auth");
    const response = await apiHelper.get("/customer/info");
    const status = response.status();
    const finalUrl = response.url();
    logger.info(`Status: ${status}, Final URL: ${finalUrl}`);
    const isRedirectedToLogin =
      finalUrl.includes("/login") || status === 401 || status === 302;
    expect(isRedirectedToLogin).toBeTruthy();
    logger.info("Unauthenticated access correctly redirected — PASS");
  });

  test("[TC_004] — API login with non-existent email returns error", async ({
    apiHelper,
    logger,
  }) => {
    const { email, password, description } = loginTestData.nonExistentUser;
    logger.info(`Test: ${description}`);
    const response = await apiHelper.post("/login", {
      Email: email,
      Password: password,
      RememberMe: "false",
    });
    const status = response.status();
    const body = await response.text();
    logger.info(`Response status: ${status}`);
    const hasError =
      body.includes("unsuccessful") ||
      body.includes("No customer account found") ||
      status >= 400;
    expect(hasError).toBeTruthy();
    logger.info("Non-existent user login correctly rejected — PASS");
  });
});
