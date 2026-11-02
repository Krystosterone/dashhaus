/** Types for scripts/check-npm.js, the root preinstall's npm check. */
export declare function pinnedNpm(packageManager: string | undefined): string | undefined;
export declare function runningNpm(userAgent: string | undefined): string | undefined;
export declare function atLeast(version: string, floor: string): boolean;
export declare function npmProblem(userAgent: string | undefined, packageManager: string | undefined): string | null;
