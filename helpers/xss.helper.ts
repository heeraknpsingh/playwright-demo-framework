import { Page, ConsoleMessage, Dialog, Request } from "@playwright/test";
import { Logger } from "../utils/logger";
import { IXssPayload } from "../test-data/xss-payloads.data";

export interface XssObservation {
  /** A browser dialog (alert/confirm/prompt) was fired — XSS executed if true */
  dialogFired: boolean;
  /** The text message of the fired dialog, if any */
  dialogMessage?: string;
  /** console.error() messages captured during the test action */
  consoleErrors: string[];
  /** console.warn() messages captured during the test action */
  consoleWarnings: string[];
  /** A <script> element was found rendered in the live DOM */
  scriptElementFound: boolean;
  /** Tag name of an unexpected HTML element injected into the DOM, if found */
  htmlInjectedElement?: string;
  /** Page URL changed from its original value unexpectedly */
  urlChanged: boolean;
  /** Page <title> changed from its original value unexpectedly */
  titleChanged: boolean;
  /** A network request was made to a host outside the application base host */
  externalRequestMade: boolean;
  /** The external host that was contacted, if any */
  externalRequestHost?: string;
}

/**
 * Monitors browser-side observable behaviour during XSS payload injection.
 * Attaches event listeners BEFORE the injection occurs, collects evidence AFTER.
 *
 * Usage pattern:
 *   xssHelper.attachListeners(page, baseHost);
 *   // ... inject payload and submit form ...
 *   const obs = await xssHelper.getObservation(page, originalUrl, originalTitle);
 */
const MONITORED_TAGS = ["h1", "h2", "iframe", "marquee", "object", "embed"] as const;

// Hosts that are part of the site's normal operation and must never trigger an XSS alert,
// even when they load asynchronously after the Performance API baseline snapshot.
const KNOWN_SAFE_HOSTS = new Set([
  "ssl.google-analytics.com",
  "www.google-analytics.com",
  "www.googletagmanager.com",
  "stats.g.doubleclick.net",
  "www.google.com",
]);

export class XssHelper {
  private readonly logger: Logger;
  private dialogFired = false;
  private dialogMessage: string | undefined;
  private consoleErrors: string[] = [];
  private consoleWarnings: string[] = [];
  private externalRequestMade = false;
  private externalRequestHost: string | undefined;
  private baseHost: string = "";
  /** Script-tag count on the page BEFORE injection — set in attachListeners() */
  private baselineScriptCount = 0;
  /** Per-tag element counts BEFORE injection — compared in getObservation() */
  private baselineTagCounts: Record<string, number> = {};
  /** External hosts already seen BEFORE injection (e.g. Google Analytics on page load) */
  private baselineExternalHosts: Set<string> = new Set();

  private readonly dialogHandler = (dialog: Dialog) => {
    this.dialogFired = true;
    this.dialogMessage = dialog.message();
    this.logger.warn(
      `XSS ALERT: browser dialog intercepted — type="${dialog.type()}" message="${dialog.message()}"`,
    );
    dialog.dismiss().catch(() => {});
  };

  private readonly consoleHandler = (msg: ConsoleMessage) => {
    if (msg.type() === "error") {
      this.consoleErrors.push(msg.text());
      this.logger.debug(`Console error: ${msg.text()}`);
    }
    if (msg.type() === "warning") {
      this.consoleWarnings.push(msg.text());
      this.logger.debug(`Console warning: ${msg.text()}`);
    }
  };

  private readonly requestHandler = (req: Request) => {
    try {
      const url = new URL(req.url());
      const host = url.hostname;
      if (this.baseHost && host !== this.baseHost && !this.baselineExternalHosts.has(host) && !KNOWN_SAFE_HOSTS.has(host)) {
        this.externalRequestMade = true;
        this.externalRequestHost = host;
        this.logger.warn(
          `XSS ALERT: NEW external request to host "${host}" — not seen before injection (url: ${req.url()})`,
        );
      }
    } catch {
      // malformed URL — ignore
    }
  };

  constructor(logger: Logger) {
    this.logger = logger;
  }

  // ─── Listener Management ────────────────────────────────────────────────────

  /**
   * Attaches all browser-side event listeners AND snapshots the current DOM
   * element counts as a baseline. Must be called BEFORE the payload is injected.
   */
  async attachListeners(page: Page, baseHost: string): Promise<void> {
    this.reset();
    this.baseHost = baseHost;
    page.on("dialog", this.dialogHandler);
    page.on("console", this.consoleHandler);
    page.on("request", this.requestHandler);

    // Baseline: count existing <script> tags and monitored HTML tags so we can
    // detect only NEW elements added by the payload, not pre-existing page elements.
    this.baselineScriptCount = await page.locator("body script").count();
    for (const tag of MONITORED_TAGS) {
      this.baselineTagCounts[tag] = await page.locator(`body ${tag}`).count().catch(() => 0);
    }

    // Baseline: record all external hosts already contacted by the page (e.g. Google
    // Analytics, CDNs) so the request listener only flags hosts that appear NEW after
    // the payload is injected — inspects already-loaded resource URLs via Performance API.
    const resourceHosts = await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .map((e) => {
          try { return new URL(e.name).hostname; }
          catch { return null; }
        })
        .filter(Boolean)
    ) as string[];
    for (const host of resourceHosts) {
      if (host && host !== baseHost) {
        this.baselineExternalHosts.add(host);
      }
    }

    this.logger.debug(
      `XSS listeners attached (baseHost: ${baseHost}, baseline scripts: ${this.baselineScriptCount}, known external hosts: ${this.baselineExternalHosts.size})`,
    );
  }

  /**
   * Detaches all listeners. Call after observation is collected to avoid
   * interference with subsequent tests.
   */
  detachListeners(page: Page): void {
    page.off("dialog", this.dialogHandler);
    page.off("console", this.consoleHandler);
    page.off("request", this.requestHandler);
    this.logger.debug("XSS listeners detached");
  }

  private reset(): void {
    this.dialogFired = false;
    this.dialogMessage = undefined;
    this.consoleErrors = [];
    this.consoleWarnings = [];
    this.externalRequestMade = false;
    this.externalRequestHost = undefined;
    this.baseHost = "";
    this.baselineScriptCount = 0;
    this.baselineTagCounts = {};
    this.baselineExternalHosts = new Set();
  }

  // ─── Observation Collection ─────────────────────────────────────────────────

  /**
   * Collects all observable XSS indicators from the current page state.
   * Call AFTER submitting the payload.
   */
  async getObservation(
    page: Page,
    originalUrl: string,
    originalTitle: string,
  ): Promise<XssObservation> {
    const currentUrl = page.url();
    const currentTitle = await page.title();

    // Check for NEW <script> elements added after injection (compare vs baseline)
    const currentScriptCount = await page.locator("body script").count();
    const scriptElementFound = currentScriptCount > this.baselineScriptCount;

    // Check for NEW HTML elements added after injection (compare vs per-tag baseline)
    let htmlInjectedElement: string | undefined;
    for (const tag of MONITORED_TAGS) {
      const currentCount = await page.locator(`body ${tag}`).count().catch(() => 0);
      const baselineCount = this.baselineTagCounts[tag] ?? 0;
      if (currentCount > baselineCount) {
        htmlInjectedElement = tag;
        this.logger.warn(
          `New <${tag}> element injected into page body (was: ${baselineCount}, now: ${currentCount})`,
        );
        break;
      }
    }

    const urlChanged =
      currentUrl !== originalUrl &&
      !currentUrl.includes("/login") &&
      !currentUrl.endsWith("/");

    const titleChanged = currentTitle !== originalTitle;

    if (scriptElementFound) {
      this.logger.warn("XSS ALERT: <script> element found in live DOM");
    }
    if (urlChanged) {
      this.logger.warn(
        `URL changed unexpectedly: "${originalUrl}" → "${currentUrl}"`,
      );
    }
    if (titleChanged) {
      this.logger.warn(
        `Page title changed: "${originalTitle}" → "${currentTitle}"`,
      );
    }

    return {
      dialogFired: this.dialogFired,
      dialogMessage: this.dialogMessage,
      consoleErrors: [...this.consoleErrors],
      consoleWarnings: [...this.consoleWarnings],
      scriptElementFound,
      htmlInjectedElement,
      urlChanged,
      titleChanged,
      externalRequestMade: this.externalRequestMade,
      externalRequestHost: this.externalRequestHost,
    };
  }

  // ─── Assessment ─────────────────────────────────────────────────────────────

  /**
   * Returns true if any indicator confirms XSS payload was executed.
   * A false result means the payload was safely blocked or neutralised.
   */
  isXssExecuted(obs: XssObservation): boolean {
    return (
      obs.dialogFired ||
      obs.scriptElementFound ||
      obs.externalRequestMade ||
      obs.htmlInjectedElement !== undefined
    );
  }

  // ─── Reporting ──────────────────────────────────────────────────────────────

  /**
   * Formats a human-readable observation report for attachment to the HTML report.
   */
  formatObservationReport(payload: IXssPayload, obs: XssObservation): string {
    const xssResult = this.isXssExecuted(obs)
      ? "⚠ XSS EXECUTED — payload was NOT safely handled"
      : "✓ SAFE — payload was blocked or neutralised";

    return [
      `XSS Observation Report`,
      `======================`,
      `Payload ID:       ${payload.id}`,
      `Category:         ${payload.category}`,
      `Description:      ${payload.description}`,
      `Payload:          ${payload.payload}`,
      ``,
      `Result:           ${xssResult}`,
      ``,
      `Browser-Side Indicators`,
      `-----------------------`,
      `Dialog fired:        ${obs.dialogFired}${obs.dialogMessage ? ` ("${obs.dialogMessage}")` : ""}`,
      `Script in DOM:       ${obs.scriptElementFound}`,
      `HTML injected tag:   ${obs.htmlInjectedElement ?? "none"}`,
      `URL changed:         ${obs.urlChanged}`,
      `Title changed:       ${obs.titleChanged}`,
      `External request:    ${obs.externalRequestMade}${obs.externalRequestHost ? ` (${obs.externalRequestHost})` : ""}`,
      `Console errors:      ${obs.consoleErrors.length > 0 ? obs.consoleErrors.join(" | ") : "none"}`,
      `Console warnings:    ${obs.consoleWarnings.length > 0 ? obs.consoleWarnings.join(" | ") : "none"}`,
    ].join("\n");
  }

  /**
   * Formats a summary report for a batch of payloads tested in one test case.
   */
  formatBatchReport(
    results: Array<{ payload: IXssPayload; obs: XssObservation }>,
  ): string {
    const lines = [
      `XSS Batch Test Report`,
      `=====================`,
      `Total payloads tested: ${results.length}`,
      `Payloads executed (unsafe): ${results.filter((r) => this.isXssExecuted(r.obs)).length}`,
      `Payloads blocked (safe):    ${results.filter((r) => !this.isXssExecuted(r.obs)).length}`,
      ``,
      `Per-Payload Summary`,
      `-------------------`,
    ];

    for (const { payload, obs } of results) {
      const status = this.isXssExecuted(obs) ? "⚠ EXECUTED" : "✓ BLOCKED";
      lines.push(`[${payload.id}] ${status} — ${payload.description}`);
    }

    return lines.join("\n");
  }
}
