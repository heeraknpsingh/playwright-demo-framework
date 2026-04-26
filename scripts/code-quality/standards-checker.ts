import * as fs from "fs";
import * as path from "path";
import { Violation, StandardsResult } from "./types";

const ROOT = path.resolve(__dirname, "../..");

// ─── Helpers ────────────────────────────────────────────────────────────────

function readLines(filePath: string): string[] {
  return fs.readFileSync(filePath, "utf-8").split("\n");
}

function violation(
  file: string,
  line: number,
  rule: string,
  message: string,
  severity: "error" | "warning" = "error",
): Violation {
  return { file: path.relative(ROOT, file), line, rule, message, severity };
}

// ─── Rule Checkers ───────────────────────────────────────────────────────────

function checkTestIdFormat(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  lines.forEach((line, i) => {
    const isTestCall = /^\s*test\s*\(/.test(line) && !line.includes("test.describe") && !line.includes("test.beforeEach") && !line.includes("test.afterEach") && !line.includes("test.skip") && !line.includes("test.only");
    if (isTestCall) {
      // Support both single-line test("title", ...) and multiline test(\n  "title",\n  ...)
      const checkLine = /["']/.test(line) ? line : (lines[i + 1] || "");

      const hasValidId = /["']\[TC-[A-Z0-9-]+\]/.test(checkLine);   // complete: [TC-XXX]
      const hasOpenBracket = /["']\[/.test(checkLine);               // title starts with [
      const hasTcStart = /["']\[TC-/.test(checkLine);               // title starts with [TC-
      const hasTcClosedBracket = /["']\[TC-[A-Z0-9-]+\]/.test(checkLine); // [TC-XXX] closed

      if (!hasValidId) {
        if (!hasOpenBracket) {
          violations.push(
            violation(
              filePath,
              i + 1,
              "TC-001",
              `Test title must start with '[' — expected format: [TC-XXX] — description`,
              "error",
            ),
          );
        } else if (!hasTcStart) {
          violations.push(
            violation(
              filePath,
              i + 1,
              "TC-001",
              `Test ID must use 'TC-' prefix inside brackets — expected: [TC-XXX] (e.g. [TC-001])`,
              "error",
            ),
          );
        } else if (!hasTcClosedBracket) {
          violations.push(
            violation(
              filePath,
              i + 1,
              "TC-001",
              `Test ID bracket is not closed — expected ']' after the ID (e.g. [TC-001] not [TC-001)`,
              "error",
            ),
          );
        }
      }
    }
  });
  return violations;
}

function checkFixtureImport(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  lines.forEach((line, i) => {
    const importsFromPlaywright =
      /import\s+.*\btest\b.*from\s+["']@playwright\/test["']/.test(line) ||
      /import\s+.*\bexpect\b.*from\s+["']@playwright\/test["']/.test(line);
    if (importsFromPlaywright) {
      violations.push(
        violation(
          filePath,
          i + 1,
          "TC-002",
          `Import 'test'/'expect' from 'fixtures/base.fixture', not '@playwright/test'`,
          "error",
        ),
      );
    }
  });
  return violations;
}

function checkNoConsole(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  lines.forEach((line, i) => {
    const isComment = line.trim().startsWith("//") || line.trim().startsWith("*");
    if (!isComment && /\bconsole\s*\.\s*(log|warn|error|info|debug)\s*\(/.test(line)) {
      violations.push(
        violation(
          filePath,
          i + 1,
          "TC-003",
          `console.* is forbidden — use logger.info/warn/error/debug instead`,
          "error",
        ),
      );
    }
  });
  return violations;
}

function checkPageObjectContract(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  const content = lines.join("\n");

  const classMatch = content.match(/export\s+class\s+(\w+)/);
  if (!classMatch) return violations;

  const className = classMatch[1];
  if (className === "BasePage") return violations;

  const extendsBasePage = /extends\s+BasePage/.test(content);
  if (!extendsBasePage) {
    violations.push(
      violation(
        filePath,
        1,
        "TC-004",
        `Class '${className}' must extend BasePage`,
        "error",
      ),
    );
  }

  const hasWaitForPageLoad = /async\s+waitForPageLoad\s*\(\s*\)/.test(content);
  if (!hasWaitForPageLoad) {
    violations.push(
      violation(
        filePath,
        1,
        "TC-004",
        `Class '${className}' must implement 'async waitForPageLoad(): Promise<void>'`,
        "error",
      ),
    );
  }

  return violations;
}

function checkTestTags(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  const allowedTags = ["@ui", "@api", "@security", "@xss", "@session", "@a11y", "@performance"];

  lines.forEach((line, i) => {
    if (/test\.describe\s*\(/.test(line)) {
      const hasTag = allowedTags.some((tag) => line.includes(tag));
      if (!hasTag) {
        violations.push(
          violation(
            filePath,
            i + 1,
            "TC-005",
            `test.describe() must include a tag — allowed: ${allowedTags.join(", ")}`,
            "error",
          ),
        );
      }
    }
  });
  return violations;
}

function checkNoHardcodedCredentials(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  const emailPattern = /["'][a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}["']/;
  const passwordPatterns = [
    /["']Password\d+["']/i,
    /password\s*:\s*["'][^"']{4,}["']/i,
  ];

  lines.forEach((line, i) => {
    const isComment = line.trim().startsWith("//") || line.trim().startsWith("*");
    if (isComment) return;

    const isInvalidTestEmail = /["']invalid[^"']*@/.test(line);
    if (emailPattern.test(line) && !isInvalidTestEmail && !line.includes("test-data") && !line.includes("login.data")) {
      violations.push(
        violation(
          filePath,
          i + 1,
          "TC-006",
          `Hardcoded email detected — use testUser fixture instead`,
          "error",
        ),
      );
    }

    passwordPatterns.forEach((pattern) => {
      if (pattern.test(line)) {
        violations.push(
          violation(
            filePath,
            i + 1,
            "TC-006",
            `Hardcoded password detected — use testUser fixture instead`,
            "error",
          ),
        );
      }
    });
  });
  return violations;
}

function checkNoHardcodedUrls(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  const urlPattern = /["']https?:\/\/[^"']+["']/;
  const envPattern = /envConfig|BASE_URL|baseUrl/;

  lines.forEach((line, i) => {
    const isComment = line.trim().startsWith("//") || line.trim().startsWith("*");
    if (isComment) return;
    if (urlPattern.test(line) && !envPattern.test(line) && !line.includes("import")) {
      violations.push(
        violation(
          filePath,
          i + 1,
          "TC-007",
          `Hardcoded URL detected — use envConfig.baseUrl or Playwright's baseURL instead`,
          "warning",
        ),
      );
    }
  });
  return violations;
}

function checkEvidenceCapture(filePath: string, lines: string[]): Violation[] {
  const violations: Violation[] = [];
  const triggerWords = /\b(invalid|error|fail|wrong|incorrect)\b/i;

  lines.forEach((line, i) => {
    const isTestTitle = /^\s*test\s*\(/.test(line) && triggerWords.test(line);
    if (!isTestTitle) return;

    // Scan the next 100 lines for captureEvidence (tests can be long)
    const block = lines.slice(i, i + 100).join("\n");
    if (!block.includes("captureEvidence")) {
      violations.push(
        violation(
          filePath,
          i + 1,
          "TC-008",
          `Negative test ('${line.trim().slice(0, 60)}...') must call captureEvidence() and attach screenshot`,
          "warning",
        ),
      );
    }
  });
  return violations;
}

// ─── File Router ─────────────────────────────────────────────────────────────

function checkFile(filePath: string): Violation[] {
  const lines = readLines(filePath);
  const rel = path.relative(ROOT, filePath);
  const violations: Violation[] = [];

  const isSpec = rel.startsWith("e2e") && rel.endsWith(".spec.ts");
  const isPageObject = rel.startsWith("page-objects") && !rel.includes("base/BasePage");
  const isAnyTs = rel.endsWith(".ts");

  if (isSpec) {
    violations.push(...checkTestIdFormat(filePath, lines));
    violations.push(...checkFixtureImport(filePath, lines));
    violations.push(...checkTestTags(filePath, lines));
    violations.push(...checkNoHardcodedCredentials(filePath, lines));
    violations.push(...checkEvidenceCapture(filePath, lines));
  }

  if (isPageObject) {
    violations.push(...checkPageObjectContract(filePath, lines));
  }

  const isFrameworkTs =
    rel.startsWith("e2e") ||
    rel.startsWith("helpers") ||
    rel.startsWith("page-objects") ||
    rel.startsWith("utils") ||
    rel.startsWith("fixtures");

  if (isFrameworkTs) {
    violations.push(...checkNoConsole(filePath, lines));
    violations.push(...checkNoHardcodedUrls(filePath, lines));
  }

  return violations;
}

// ─── Runner ──────────────────────────────────────────────────────────────────

function run(files: string[]): StandardsResult {
  const allViolations: Violation[] = [];

  for (const f of files) {
    const abs = path.isAbsolute(f) ? f : path.resolve(ROOT, f);
    if (!fs.existsSync(abs) || !abs.endsWith(".ts")) continue;
    allViolations.push(...checkFile(abs));
  }

  const errors = allViolations.filter((v) => v.severity === "error");
  const warnings = allViolations.filter((v) => v.severity === "warning");

  return {
    passed: errors.length === 0,
    violations: errors,
    warnings,
    filesChecked: files.length,
  };
}

// ─── CLI Entry ───────────────────────────────────────────────────────────────

const files = process.argv.slice(2);

if (files.length === 0) {
  console.error("Usage: ts-node standards-checker.ts <file1.ts> [file2.ts ...]");
  process.exit(1);
}

const result = run(files);

console.log(`\n Standards Check — ${result.filesChecked} file(s) scanned\n`);

if (result.warnings.length > 0) {
  console.log("WARNINGS:");
  result.warnings.forEach((w) => {
    console.log(`  ⚠  ${w.file}:${w.line}  [${w.rule}]  ${w.message}`);
  });
  console.log();
}

if (result.violations.length > 0) {
  console.log("ERRORS (blocking):");
  result.violations.forEach((v) => {
    console.log(`  ✗  ${v.file}:${v.line}  [${v.rule}]  ${v.message}`);
  });
  console.log(`\n STANDARDS FAILED — fix ${result.violations.length} error(s) above\n`);
  process.exit(1);
} else {
  console.log(" STANDARDS PASSED\n");
  process.exit(0);
}
