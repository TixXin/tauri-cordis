export interface ScaffoldOptions {
  dir: string;
  scope: string;
  name: string;
  appKey?: string;
  slot?: string;
  windowName?: string;
  displayName?: { "zh-CN": string; en: string };
  description?: { "zh-CN": string; en: string };
}

export interface ScaffoldResult {
  packageName: string;
  dir: string;
  files: string[];
}

export declare function projectFiles(options: Omit<ScaffoldOptions, "dir">): Record<string, string>;
export declare function scaffoldPlugin(options: ScaffoldOptions): ScaffoldResult;
export declare function runCli(argv: string[], cwd?: string): Promise<number>;
