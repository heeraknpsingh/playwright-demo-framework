export type PayloadCategory =
  | "script-injection"
  | "html-injection"
  | "event-handler"
  | "special-chars"
  | "long-input"
  | "malformed";

export interface IXssPayload {
  id: string;
  category: PayloadCategory;
  payload: string;
  description: string;
}

// ─── Script Injection ────────────────────────────────────────────────────────

export const scriptInjectionPayloads: IXssPayload[] = [
  {
    id: "SI-001",
    category: "script-injection",
    payload: "<script>alert('XSS')</script>",
    description: "Basic inline script tag with alert",
  },
  {
    id: "SI-002",
    category: "script-injection",
    payload: "<script>document.write('hacked')</script>",
    description: "Script tag using document.write to mutate DOM",
  },
  {
    id: "SI-003",
    category: "script-injection",
    payload: "</script><script>alert(1)</script>",
    description:
      "Context-breaking script injection (closes existing tag first)",
  },
  {
    id: "SI-004",
    category: "script-injection",
    payload: "<SCRIPT>alert('XSS')</SCRIPT>",
    description: "Uppercase script tag to test case-insensitive filtering",
  },
  {
    id: "SI-005",
    category: "script-injection",
    payload: "<scr\x00ipt>alert(1)</scr\x00ipt>",
    description: "Null-byte obfuscated script tag",
  },
];

// ─── HTML Injection ──────────────────────────────────────────────────────────

export const htmlInjectionPayloads: IXssPayload[] = [
  {
    id: "HI-001",
    category: "html-injection",
    payload: "<h1>Hacked</h1>",
    description: "Block-level HTML injection — heading element",
  },
  {
    id: "HI-002",
    category: "html-injection",
    payload: "<b>Bold injected text</b>",
    description: "Inline HTML injection — bold element",
  },
  {
    id: "HI-003",
    category: "html-injection",
    payload: '<iframe src="javascript:alert(1)"></iframe>',
    description: "iframe with javascript: URI in src attribute",
  },
  {
    id: "HI-004",
    category: "html-injection",
    payload: "<img src=x>",
    description: "Broken image tag (no onerror) — checks HTML rendering",
  },
  {
    id: "HI-005",
    category: "html-injection",
    payload: '<input type="hidden" name="injected" value="bad">',
    description: "Hidden input injection to add rogue form field",
  },
  {
    id: "HI-006",
    category: "html-injection",
    payload: '<div style="display:none">hidden content</div>',
    description: "Hidden div injection via style attribute",
  },
];

// ─── Event Handler / JS URI ──────────────────────────────────────────────────

export const eventHandlerPayloads: IXssPayload[] = [
  {
    id: "EH-001",
    category: "event-handler",
    payload: '"><img src=x onerror="alert(1)">',
    description: "Quote-break followed by img onerror event handler",
  },
  {
    id: "EH-002",
    category: "event-handler",
    payload: "' onmouseover='alert(1)",
    description: "Single-quote attribute break with onmouseover handler",
  },
  {
    id: "EH-003",
    category: "event-handler",
    payload: "javascript:alert(1)",
    description: "Raw javascript: URI protocol in email field",
  },
  {
    id: "EH-004",
    category: "event-handler",
    payload: '"; alert(1); //',
    description: "JS context break — attempts to close string and execute",
  },
  {
    id: "EH-005",
    category: "event-handler",
    payload: "' onfocus='alert(1)' autofocus='",
    description: "onfocus with autofocus auto-trigger attempt",
  },
];

// ─── Special Characters ──────────────────────────────────────────────────────

export const specialCharPayloads: IXssPayload[] = [
  {
    id: "SC-001",
    category: "special-chars",
    payload: "<>\"'&;",
    description: "Core HTML metacharacters — must be encoded not rendered",
  },
  {
    id: "SC-002",
    category: "special-chars",
    payload: "' OR '1'='1' --",
    description: "Classic SQL injection pattern",
  },
  {
    id: "SC-003",
    category: "special-chars",
    payload: "1' OR '1' = '1';--",
    description: "SQL injection with comment terminator",
  },
  {
    id: "SC-004",
    category: "special-chars",
    payload: "%3Cscript%3Ealert(1)%3C/script%3E",
    description: "URL-encoded script tag bypass attempt",
  },
  {
    id: "SC-005",
    category: "special-chars",
    payload: "&lt;script&gt;alert(1)&lt;/script&gt;",
    description: "HTML-entity encoded script tag",
  },
  {
    id: "SC-006",
    category: "special-chars",
    payload: "!@#$%^&*()_+-=[]{}|;':\",./<>?",
    description: "Full printable special character set",
  },
];

// ─── Long Input ──────────────────────────────────────────────────────────────

export const longInputPayloads: IXssPayload[] = [
  {
    id: "LI-001",
    category: "long-input",
    payload: "a".repeat(500),
    description: "500-character alphabetic string — boundary test",
  },
  {
    id: "LI-002",
    category: "long-input",
    payload: "a".repeat(1000),
    description: "1 000-character string — overflow stress test",
  },
  {
    id: "LI-003",
    category: "long-input",
    payload: "a".repeat(10_000),
    description: "10 000-character string — server-side limit test",
  },
  {
    id: "LI-004",
    category: "long-input",
    payload: "<script>alert(1)</script>".repeat(50),
    description: "Repeated XSS payload × 50 — combined length + injection test",
  },
];

// ─── Malformed Input ─────────────────────────────────────────────────────────

export const malformedPayloads: IXssPayload[] = [
  {
    id: "MF-001",
    category: "malformed",
    payload: "test\r\ninjected@evil.com",
    description: "CRLF injection in email — HTTP response splitting attempt",
  },
  {
    id: "MF-002",
    category: "malformed",
    payload: "test\x00@example.com",
    description: "Null byte in email address",
  },
  {
    id: "MF-003",
    category: "malformed",
    payload: "\x01\x02\x03\x04\x05",
    description: "Non-printable ASCII control characters (0x01–0x05)",
  },
  {
    id: "MF-004",
    category: "malformed",
    payload: "\u2028\u2029",
    description:
      "Unicode line/paragraph separators (can break JS string literals)",
  },
  {
    id: "MF-005",
    category: "malformed",
    payload: "test😀💉🔓@example.com",
    description: "Emoji characters in email — multi-byte UTF-8 handling",
  },
  {
    id: "MF-006",
    category: "malformed",
    payload: "\t\n\r",
    description:
      "Whitespace control characters — tab, newline, carriage return",
  },
];

// ─── Convenience: Critical payloads for browser-side parametrised test ───────

export const criticalPayloads: IXssPayload[] = [
  scriptInjectionPayloads[0], // SI-001 basic script
  scriptInjectionPayloads[1], // SI-002 document.write
  htmlInjectionPayloads[2], // HI-003 iframe javascript:
  eventHandlerPayloads[0], // EH-001 img onerror
  eventHandlerPayloads[2], // EH-003 javascript: URI
  specialCharPayloads[1], // SC-002 SQL injection
];

export const XSS_DUMMY_EMAIL = "test@example.com";
