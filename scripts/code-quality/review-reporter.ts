import { ReviewResult, StandardsResult } from "./types";

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

function divider(char = "─", width = 60): string {
  return char.repeat(width);
}

export function printStandardsResult(result: StandardsResult): void {
  console.log(`\n${BOLD}${CYAN}${divider("═")}${RESET}`);
  console.log(`${BOLD}${CYAN}  CODING STANDARDS CHECK${RESET}`);
  console.log(`${BOLD}${CYAN}${divider("═")}${RESET}`);
  console.log(`${DIM}  Files scanned: ${result.filesChecked}${RESET}\n`);

  if (result.warnings.length > 0) {
    console.log(`${YELLOW}${BOLD}  WARNINGS${RESET}`);
    result.warnings.forEach((w) => {
      console.log(`  ${YELLOW}⚠${RESET}  ${w.file}:${w.line}`);
      console.log(`     ${DIM}[${w.rule}]${RESET} ${w.message}`);
    });
    console.log();
  }

  if (result.violations.length > 0) {
    console.log(`${RED}${BOLD}  ERRORS (blocking)${RESET}`);
    result.violations.forEach((v) => {
      console.log(`  ${RED}✗${RESET}  ${v.file}:${v.line}`);
      console.log(`     ${DIM}[${v.rule}]${RESET} ${v.message}`);
    });
    console.log();
    console.log(
      `${RED}${BOLD}  STANDARDS FAILED — fix ${result.violations.length} error(s) above${RESET}\n`,
    );
  } else {
    console.log(`${GREEN}${BOLD}  ✓ STANDARDS PASSED${RESET}\n`);
  }
}

export function printReviewResult(result: ReviewResult): void {
  console.log(`\n${BOLD}${CYAN}${divider("═")}${RESET}`);
  console.log(`${BOLD}${CYAN}  AI CODE REVIEW  ${DIM}(${result.model})${RESET}`);
  console.log(`${BOLD}${CYAN}${divider("═")}${RESET}`);
  if (result.tokensUsed) {
    console.log(`${DIM}  Tokens used: ${result.tokensUsed}${RESET}`);
  }

  if (result.summary) {
    console.log(`\n${BOLD}  SUMMARY${RESET}`);
    console.log(`  ${result.summary}\n`);
  }

  if (result.issues.length > 0) {
    console.log(`${RED}${BOLD}  ISSUES (blocking)${RESET}`);
    result.issues.forEach((issue) => {
      const loc = issue.line > 0 ? `:${issue.line}` : "";
      console.log(`  ${RED}✗${RESET}  ${issue.file}${loc}`);
      console.log(`     ${DIM}[${issue.rule}]${RESET} ${issue.message}`);
    });
    console.log();
  }

  if (result.suggestions.length > 0) {
    console.log(`${YELLOW}${BOLD}  SUGGESTIONS (non-blocking)${RESET}`);
    result.suggestions.forEach((s) => {
      const loc = s.line > 0 ? `:${s.line}` : "";
      console.log(`  ${YELLOW}⚠${RESET}  ${s.file}${loc}`);
      console.log(`     ${s.message}`);
    });
    console.log();
  }

  if (result.comments.length > 0) {
    console.log(`${CYAN}${BOLD}  REVIEW COMMENTS${RESET}`);
    result.comments.forEach((c) => {
      const loc = c.line > 0 ? `:${c.line}` : "";
      console.log(`  ${CYAN}◆${RESET}  ${c.file}${loc}`);
      console.log(`     ${c.comment}`);
    });
    console.log();
  }

  if (result.verdict === "pass") {
    console.log(`${GREEN}${BOLD}  ✓ AI REVIEW PASSED${RESET}\n`);
  } else {
    console.log(
      `${RED}${BOLD}  AI REVIEW FAILED — fix ${result.issues.length} issue(s) above${RESET}\n`,
    );
  }
}

export function printSkipped(reason: string): void {
  console.log(`\n${YELLOW}  ⚠ AI review skipped: ${reason}${RESET}\n`);
}
