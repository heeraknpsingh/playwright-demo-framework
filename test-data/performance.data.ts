export const LIGHTHOUSE_PORT = 9222;

export interface PerformanceThresholds {
  performance?: number;
  accessibility?: number;
  "best-practices"?: number;
  seo?: number;
}

// Thresholds sit ~5 points below the measured baseline for this demo site.
// They guard against regressions, not absolute quality targets.
export const performanceThresholds: PerformanceThresholds = {
  performance: 50,
  accessibility: 70,
  "best-practices": 80,
  seo: 40,
};

export interface PageConfig {
  name: string;
  path: string;
  requiresAuth: boolean;
}

export const performancePages: PageConfig[] = [
  { name: "home", path: "/", requiresAuth: false },
  { name: "login", path: "/login", requiresAuth: false },
  { name: "account", path: "/customer/info", requiresAuth: true },
  { name: "order-history", path: "/order/history", requiresAuth: true },
];
