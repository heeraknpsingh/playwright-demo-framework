import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";
import { ReviewResult, ReviewIssue } from "./types";
import { printReviewResult, printSkipped } from "./review-reporter";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const ROOT = path.resolve(__dirname, "../..");
const STANDARDS_PATH = path.join(ROOT, "docs/coding-standards.md");
const ESLINT_PATH = path.join(ROOT, ".eslintrc.json");
const MODEL = "claude-sonnet-4-6";

// ─── Diff Helpers ────────────────────────────────────────────────────────────

function getStagedDiff(): string {
  try {
    return execSync("git diff --cached -- '*.ts'", { cwd: ROOT }).toString().trim();
  } catch {
    return "";
  }
}

function getBranchDiff(): string {
  try {
    return execSync("git diff main...HEAD -- '*.ts'", { cwd: ROOT }).toString().trim();
  } catch {
    try {
      return execSync("git diff HEAD~1...HEAD -- '*.ts'", { cwd: ROOT }).toString().trim();
    } catch {
      return "";
    }
  }
}

// ─── Prompt Builder ──────────────────────────────────────────────────────────

function buildSystemPrompt(): string {
  const standards = fs.existsSync(STANDARDS_PATH)
    ? fs.readFileSync(STANDARDS_PATH, "utf-8")
    : "No coding standards file found.";

  const eslint = fs.existsSync(ESLINT_PATH)
    ? fs.readFileSync(ESLINT_PATH, "utf-8")
    : "No ESLint config found.";

  return `You are an expert code reviewer for a Playwright TypeScript test automation framework.

## Your responsibilities
- Review the changed lines in the git diff like a senior engineer doing a pull request review
- Give honest, specific, actionable feedback — including what looks good and what could be improved
- Check for: coding standard violations, logic errors, naming, readability, test coverage gaps, missing assertions, flaky test risks, and maintainability
- Also check against the ESLint rules and coding standards below

## Coding Standards
${standards}

## ESLint Rules (key rules)
${eslint}

## Response Format
Return a single JSON object with this exact shape — no markdown, no prose outside the JSON:
{
  "verdict": "pass" | "fail",
  "summary": "2-4 sentence overall assessment: what the change does, overall quality, and the most important thing to address",
  "issues": [
    {
      "file": "relative/path/to/file.ts",
      "line": <number, 0 if unknown>,
      "severity": "error",
      "rule": "rule-id or short label",
      "message": "clear explanation of the violation and how to fix it"
    }
  ],
  "suggestions": [
    {
      "file": "relative/path/to/file.ts",
      "line": <number, 0 if unknown>,
      "severity": "warning",
      "rule": "suggestion",
      "message": "specific, actionable improvement with example if helpful"
    }
  ],
  "comments": [
    {
      "file": "relative/path/to/file.ts",
      "line": <number, 0 if unknown>,
      "comment": "inline review comment — explain why, not just what"
    }
  ]
}

## Verdict rules
- verdict = "fail" when issues array is non-empty
- verdict = "pass" when issues array is empty (suggestions and comments are non-blocking)
- Be thorough: flag real problems, suggest real improvements, leave real inline comments
- comments should read like a human reviewer wrote them — specific to the code, not generic advice`;
}

function buildUserPrompt(diff: string, mode: "staged" | "branch"): string {
  return `Review the following git diff (${mode} changes). Focus only on the added lines (starting with +).

\`\`\`diff
${diff.slice(0, 12000)}
\`\`\`

Return JSON only.`;
}

// ─── Claude API Mode ─────────────────────────────────────────────────────────

async function reviewWithApi(diff: string, mode: "staged" | "branch"): Promise<ReviewResult> {
  let Anthropic: typeof import("@anthropic-ai/sdk").default;
  try {
    Anthropic = (await import("@anthropic-ai/sdk")).default;
  } catch {
    throw new Error(
      "@anthropic-ai/sdk is not installed. Run: npm install --save-dev @anthropic-ai/sdk",
    );
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 2048,
    system: [
      {
        type: "text",
        text: buildSystemPrompt(),
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: buildUserPrompt(diff, mode),
      },
    ],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "";
  const tokensUsed = response.usage.input_tokens + response.usage.output_tokens;

  return parseClaudeResponse(raw, MODEL, tokensUsed);
}

// ─── Claude Code CLI Mode ────────────────────────────────────────────────────

function reviewWithCli(diff: string, mode: "staged" | "branch"): ReviewResult {
  const prompt = `${buildSystemPrompt()}\n\n${buildUserPrompt(diff, mode)}`;

  const raw = execSync(`claude -p --output-format text`, {
    cwd: ROOT,
    timeout: 120000,
    input: prompt,
  }).toString();

  return parseClaudeResponse(raw, "claude-cli");
}

// ─── Response Parser ─────────────────────────────────────────────────────────

function parseClaudeResponse(raw: string, model: string, tokensUsed?: number): ReviewResult {
  // Extract JSON from response (handles markdown code blocks if present)
  const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || raw.match(/(\{[\s\S]*\})/);
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : raw.trim();

  let parsed: {
    verdict: string;
    summary?: string;
    issues?: ReviewIssue[];
    suggestions?: ReviewIssue[];
    comments?: import("./types").ReviewComment[];
  };

  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    return {
      verdict: "pass",
      summary: "AI review response could not be parsed — manual review recommended.",
      issues: [],
      suggestions: [],
      comments: [],
      model,
      tokensUsed,
    };
  }

  return {
    verdict: parsed.verdict === "fail" ? "fail" : "pass",
    summary: parsed.summary || "",
    issues: (parsed.issues || []).map((i) => ({ ...i, severity: "error" as const })),
    suggestions: (parsed.suggestions || []).map((s) => ({ ...s, severity: "warning" as const })),
    comments: parsed.comments || [],
    model,
    tokensUsed,
  };
}

// ─── Mode Detection ───────────────────────────────────────────────────────────

type ReviewMode = "claude-api" | "claude-cli" | null;

function detectMode(): ReviewMode {
  if (process.env.ANTHROPIC_API_KEY) return "claude-api";
  try {
    execSync("which claude", { stdio: "ignore" });
    return "claude-cli";
  } catch {
    return null;
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const isPush = process.argv.includes("--push");
  const diff = isPush ? getBranchDiff() : getStagedDiff();
  const mode = isPush ? "branch" : "staged";

  if (!diff) {
    printSkipped("No TypeScript changes detected");
    process.exit(0);
  }

  const reviewMode = detectMode();

  if (!reviewMode) {
    printSkipped(
      "No AI reviewer available. Set ANTHROPIC_API_KEY in .env or install Claude Code CLI.",
    );
    process.exit(0);
  }

  console.log(
    `\n  Running AI review via ${reviewMode === "claude-api" ? "Claude API" : "Claude Code CLI"}...`,
  );

  try {
    const result =
      reviewMode === "claude-api"
        ? await reviewWithApi(diff, mode)
        : reviewWithCli(diff, mode);

    printReviewResult(result);
    process.exit(result.verdict === "fail" ? 1 : 0);
  } catch (err) {
    printSkipped(`AI review error: ${String(err)}`);
    process.exit(0);
  }
}

main();
