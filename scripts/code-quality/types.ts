export type Severity = "error" | "warning";

export interface Violation {
  file: string;
  line: number;
  rule: string;
  message: string;
  severity: Severity;
}

export interface StandardsResult {
  passed: boolean;
  violations: Violation[];
  warnings: Violation[];
  filesChecked: number;
}

export interface ReviewIssue {
  file: string;
  line: number;
  severity: Severity;
  rule: string;
  message: string;
}

export interface ReviewComment {
  file: string;
  line: number;
  comment: string;
}

export interface ReviewResult {
  verdict: "pass" | "fail";
  summary: string;
  issues: ReviewIssue[];
  suggestions: ReviewIssue[];
  comments: ReviewComment[];
  model: string;
  tokensUsed?: number;
}
