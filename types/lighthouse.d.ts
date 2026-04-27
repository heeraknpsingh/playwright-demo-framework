declare module "lighthouse" {
  interface LighthouseResult {
    lhr: {
      categories: Record<string, { score: number | null }>;
      audits: Record<string, { score: number | null; displayValue?: string }>;
    };
    report: string | string[];
  }

  interface LighthouseFlags {
    port?: number;
    output?: string | string[];
    logLevel?: string;
    disableStorageReset?: boolean;
    onlyCategories?: string[];
  }

  function lighthouse(
    url: string,
    flags?: LighthouseFlags,
    config?: unknown,
  ): Promise<LighthouseResult>;

  export = lighthouse;
}
