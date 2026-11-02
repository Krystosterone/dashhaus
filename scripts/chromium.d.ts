/** Types for scripts/chromium.js, the browser-driven commands' Chromium switch. */
export declare const CHROMIUM_ENV: "DASHHAUS_CHROMIUM";
export declare function chromiumExecutable(env?: Record<string, string | undefined>): string | undefined;
export declare function chromiumLaunchOptions<T extends object>(options?: T, env?: Record<string, string | undefined>): T & { executablePath?: string };
