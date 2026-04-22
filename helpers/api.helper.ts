import { APIRequestContext, APIResponse } from "@playwright/test";
import { Logger } from "../utils/logger";
import { envConfig } from "../utils/env.loader";

export interface RequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, string>;
}

export interface ApiLoginResult {
  success: boolean;
  statusCode: number;
  cookies: string[];
}

export class ApiHelper {
  private readonly request: APIRequestContext;
  private readonly logger: Logger;
  private readonly baseUrl: string;
  private authCookies: string[] = [];

  constructor(request: APIRequestContext, logger: Logger) {
    this.request = request;
    this.logger = logger;
    this.baseUrl = envConfig.baseUrl;
  }

  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  private async logResponse(
    method: string,
    url: string,
    response: APIResponse,
  ): Promise<void> {
    const status = response.status();
    const level = status >= 400 ? "warn" : "debug";
    this.logger[level](`${method} ${url} → ${status}`, { status });
  }

  async get(
    endpoint: string,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    const url = this.buildUrl(endpoint);
    this.logger.info(`GET ${url}`);
    const response = await this.request.get(url, {
      headers: { ...this.getAuthHeaders(), ...options.headers },
      params: options.params,
    });
    await this.logResponse("GET", url, response);
    return response;
  }

  async post(
    endpoint: string,
    body: Record<string, unknown>,
    options: RequestOptions = {},
  ): Promise<APIResponse> {
    const url = this.buildUrl(endpoint);
    this.logger.info(`POST ${url}`, { body });
    const response = await this.request.post(url, {
      headers: { ...this.getAuthHeaders(), ...options.headers },
      form: body as Record<string, string>,
    });
    await this.logResponse("POST", url, response);
    return response;
  }

  async loginViaApi(email: string, password: string): Promise<ApiLoginResult> {
    this.logger.info(`API login attempt for: ${email}`);
    const response = await this.post("/login", {
      Email: email,
      Password: password,
      RememberMe: "false",
    });
    const status = response.status();
    const headers = response.headers();
    const cookies = headers["set-cookie"] ? [headers["set-cookie"]] : [];
    if (cookies.length) {
      this.authCookies = cookies;
      this.logger.info("Auth cookies captured from login response");
    }
    const success = status < 400;
    this.logger.info(`API login result: ${success ? "SUCCESS" : "FAILED"}`, {
      status,
    });
    return { success, statusCode: status, cookies };
  }

  private getAuthHeaders(): Record<string, string> {
    if (this.hasAuthCookies()) {
      return { Cookie: this.authCookies.join("; ") };
    }
    return {};
  }

  hasAuthCookies(): boolean {
    return this.authCookies.length > 0;
  }

  clearAuth(): void {
    this.authCookies = [];
    this.logger.debug("Auth cookies cleared");
  }
}
