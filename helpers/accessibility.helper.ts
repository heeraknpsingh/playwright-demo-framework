import { Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import type { AxeResults, Result, NodeResult } from "axe-core";
import { Logger } from "../utils/logger";

export type ImpactLevel = "critical" | "serious" | "moderate" | "minor";

export interface A11yScanOptions {
  /** CSS selector to scope the scan to a specific component. Scans the full page when omitted. */
  include?: string;
  /** CSS selectors to exclude from the scan (e.g. third-party iframes). */
  exclude?: string[];
  /** axe rule IDs to disable in addition to the built-in defaults. */
  disableRules?: string[];
  /** WCAG / axe tag set to run. Defaults to WCAG 2.1 AA. */
  tags?: string[];
  /** Violations at or above this impact level are considered failures. Defaults to "serious". */
  failOn?: ImpactLevel;
}

export interface A11yScanResult {
  violations: Result[];
  /** Violations that exceed the failOn threshold — these should fail the test. */
  failures: Result[];
  /** Violations below the threshold — documented but do not fail the test. */
  warnings: Result[];
  passes: Result[];
  incomplete: Result[];
  raw: AxeResults;
}

const IMPACT_ORDER: ImpactLevel[] = [
  "minor",
  "moderate",
  "serious",
  "critical",
];

const DEFAULT_TAGS = ["wcag2a", "wcag2aa", "wcag21aa"];

// Third-party and CMS template selectors excluded from scans by default.
// These elements are outside the control of any individual page feature.
const DEFAULT_EXCLUDES = [
  // Third-party widgets
  'iframe[src*="recaptcha"]',
  'iframe[src*="hcaptcha"]',
  'iframe[src*="doubleclick"]',
  'iframe[src*="google"]',
  // demowebshop.tricentis.com template inputs that lack labels — a known CMS-level
  // issue present on every page. Excluded so scans focus on feature-specific elements.
  "#small-searchterms",
  "#newsletter-email",
  // Nivo slider — a jQuery image-carousel plugin used on the home page. Its wrapper
  // links and images regularly lack alt text and discernible names. Excluded because
  // this is third-party / CMS-generated markup outside the application's page logic.
  ".nivo-slider-wrapper",
  ".nivo-imageLink",
  ".nivo-main-image",
];

// axe rules disabled by default for the target demo application.
// Each exclusion is documented with a reason so it can be re-evaluated per target.
const DEFAULT_DISABLED_RULES: string[] = [
  // demowebshop.tricentis.com does not set a lang attribute on <html>.
  // This is a CMS template issue that cannot be fixed per-page — excluded to keep
  // feature-level scans actionable.
  "html-has-lang",
];

export class AccessibilityHelper {
  private readonly logger: Logger;

  constructor(logger: Logger) {
    this.logger = logger;
  }

  /**
   * Runs an axe-core scan on the full page or a scoped component.
   * Returns structured results split into failures (above threshold) and warnings.
   */
  async scan(
    page: Page,
    options: A11yScanOptions = {},
  ): Promise<A11yScanResult> {
    const {
      include,
      exclude = [],
      disableRules = [],
      tags = DEFAULT_TAGS,
      failOn = "serious",
    } = options;

    this.logger.info(`Running accessibility scan`, {
      scope: include ?? "full page",
      tags,
      failOn,
    });

    let builder = new AxeBuilder({ page }).withTags(tags);

    if (include) {
      builder = builder.include(include);
    }

    const allExcludes = [...DEFAULT_EXCLUDES, ...exclude];
    for (const selector of allExcludes) {
      builder = builder.exclude(selector);
    }

    const allDisabledRules = [...DEFAULT_DISABLED_RULES, ...disableRules];
    if (allDisabledRules.length) {
      builder = builder.disableRules(allDisabledRules);
    }

    const raw = await builder.analyze();

    const failOnIndex = IMPACT_ORDER.indexOf(failOn);
    const failures = raw.violations.filter(
      (v) =>
        v.impact &&
        IMPACT_ORDER.indexOf(v.impact as ImpactLevel) >= failOnIndex,
    );
    const warnings = raw.violations.filter(
      (v) =>
        !v.impact ||
        IMPACT_ORDER.indexOf(v.impact as ImpactLevel) < failOnIndex,
    );

    this.logger.info(
      `Scan complete — violations: ${raw.violations.length} ` +
        `(failures: ${failures.length}, warnings: ${warnings.length}), ` +
        `passes: ${raw.passes.length}`,
    );

    if (failures.length) {
      this.logger.warn(`${failures.length} accessibility failure(s) found`, {
        failures: failures.map((f) => ({
          id: f.id,
          impact: f.impact,
          description: f.description,
        })),
      });
    }

    return {
      violations: raw.violations,
      failures,
      warnings,
      passes: raw.passes,
      incomplete: raw.incomplete,
      raw,
    };
  }

  /** Returns true when there are zero failures (violations at or above the failOn threshold). */
  isPassing(result: A11yScanResult): boolean {
    return result.failures.length === 0;
  }

  /** Formats a violation list into a human-readable plain-text report for test attachments. */
  formatViolations(
    violations: Result[],
    heading = "Accessibility Violations",
  ): string {
    if (!violations.length) {
      return `${heading}\n${"─".repeat(40)}\nNo violations found.\n`;
    }

    const lines: string[] = [`${heading}`, "─".repeat(60), ""];

    for (const [i, v] of violations.entries()) {
      lines.push(
        `[${i + 1}] ${v.id} — ${v.impact?.toUpperCase() ?? "UNKNOWN"}`,
      );
      lines.push(`    Description : ${v.description}`);
      lines.push(`    Help        : ${v.helpUrl}`);
      lines.push(`    Nodes       : ${v.nodes.length}`);
      for (const node of v.nodes.slice(0, 3)) {
        lines.push(`      • ${this.summariseNode(node)}`);
      }
      if (v.nodes.length > 3) {
        lines.push(`      … and ${v.nodes.length - 3} more node(s)`);
      }
      lines.push("");
    }

    return lines.join("\n");
  }

  /** Formats the full scan result as a summary report. */
  formatSummary(result: A11yScanResult, pageLabel: string): string {
    const lines: string[] = [
      `=== Accessibility Scan: ${pageLabel} ===`,
      "",
      `Total violations : ${result.violations.length}`,
      `  — Failures     : ${result.failures.length}  (critical / serious — MUST FIX)`,
      `  — Warnings     : ${result.warnings.length}  (moderate / minor — SHOULD FIX)`,
      `Passes           : ${result.passes.length}`,
      `Incomplete       : ${result.incomplete.length}  (needs manual review)`,
      "",
    ];

    if (result.failures.length) {
      lines.push(
        this.formatViolations(result.failures, "FAILURES (critical / serious)"),
      );
    }

    if (result.warnings.length) {
      lines.push(
        this.formatViolations(result.warnings, "WARNINGS (moderate / minor)"),
      );
    }

    return lines.join("\n");
  }

  private summariseNode(node: NodeResult): string {
    const target = node.target.join(", ");
    const snippet = node.html.replace(/\s+/g, " ").trim().substring(0, 120);
    return `${target} → ${snippet}`;
  }
}
