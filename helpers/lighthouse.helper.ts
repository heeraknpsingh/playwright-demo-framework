import { Page, TestInfo } from "@playwright/test";
import lighthouse from "lighthouse";
import * as path from "path";
import * as fs from "fs";
import { Logger } from "../utils/logger";
import {
  LIGHTHOUSE_PORT,
  PerformanceThresholds,
  performanceThresholds,
} from "../test-data/performance.data";

const CATEGORY_IDS: Record<keyof PerformanceThresholds, string> = {
  performance: "performance",
  accessibility: "accessibility",
  "best-practices": "best-practices",
  seo: "seo",
};

export class LighthouseHelper {
  private readonly reportsDir = path.resolve("reports/lighthouse");

  constructor(private readonly logger: Logger) {
    if (!fs.existsSync(this.reportsDir)) {
      fs.mkdirSync(this.reportsDir, { recursive: true });
    }
  }

  async runAudit(
    page: Page,
    name: string,
    thresholds: PerformanceThresholds = performanceThresholds,
  ): Promise<void> {
    const url = page.url();
    const timestamp = Date.now();
    const reportName = `${name}-${timestamp}`;

    this.logger.info(`Starting Lighthouse audit: ${name} → ${url}`);

    const result = await lighthouse(
      url,
      {
        port: LIGHTHOUSE_PORT,
        output: ["html", "json"],
        logLevel: "error",
        // Preserve session cookies so authenticated pages remain accessible.
        disableStorageReset: true,
      },
      {
        extends: "lighthouse:default",
        settings: {
          formFactor: "desktop",
          screenEmulation: {
            mobile: false,
            width: 1280,
            height: 720,
            deviceScaleFactor: 1,
            disabled: false,
          },
          throttlingMethod: "simulate",
        },
      },
    );

    if (!result) {
      throw new Error(`Lighthouse returned no result for: ${url}`);
    }

    // output: ['html', 'json'] → report is [htmlString, jsonString]
    const [htmlReport, jsonReport] = Array.isArray(result.report)
      ? result.report
      : [result.report, null];

    fs.writeFileSync(
      path.join(this.reportsDir, `${reportName}.html`),
      htmlReport,
    );
    if (jsonReport) {
      fs.writeFileSync(
        path.join(this.reportsDir, `${reportName}.json`),
        jsonReport,
      );
    }

    this.assertThresholds(result.lhr, thresholds);
    this.logger.info(`Lighthouse audit complete: ${reportName}`);
  }

  private assertThresholds(
    lhr: { categories: Record<string, { score: number | null }> },
    thresholds: PerformanceThresholds,
  ): void {
    const failures: string[] = [];

    for (const [key, threshold] of Object.entries(thresholds) as [
      keyof PerformanceThresholds,
      number,
    ][]) {
      if (threshold === undefined) continue;
      const score = Math.round(
        (lhr.categories[CATEGORY_IDS[key]]?.score ?? 0) * 100,
      );
      this.logger.info(`  ${key}: ${score} (threshold: ${threshold})`);
      if (score < threshold) {
        failures.push(
          `${key} score is ${score} and is under the ${threshold} threshold`,
        );
      }
    }

    if (failures.length > 0) {
      throw new Error(
        `Lighthouse - Some thresholds are not matching the expectations.\n\n${failures.join("\n")}`,
      );
    }
  }

  async attachReportToTest(testInfo: TestInfo, name: string): Promise<void> {
    const files = fs
      .readdirSync(this.reportsDir)
      .filter((f) => f.startsWith(name) && f.endsWith(".html"))
      .sort()
      .reverse();

    if (files.length === 0) {
      this.logger.warn(`No Lighthouse HTML report found for: ${name}`);
      return;
    }

    const reportPath = path.join(this.reportsDir, files[0]);
    await testInfo.attach(`lighthouse-${name}`, {
      path: reportPath,
      contentType: "text/html",
    });
    this.logger.info(`Lighthouse report attached to test: ${files[0]}`);
  }
}
