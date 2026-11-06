// The registry check is JavaScript so the release commands run without type stripping.

export const WAIT_MS: number;

export interface Timing {
  /** The time, in `Date.now()`'s milliseconds, after which a miss throws. */
  deadline?: number;
  /** The first pause after a miss, in milliseconds. */
  pause?: number;
  log?: (line: string) => void;
}

export interface VersionDocument {
  name: string;
  version: string;
  dist?: { tarball?: string; shasum?: string; integrity?: string };
}

export function registryUrl(): string;
export function versionDocument(name: string, version: string, registry?: string): Promise<VersionDocument | undefined>;
export function publishedAt(name: string, version: string, registry?: string): Promise<boolean>;
export function waitFor<T>(what: string, attempt: () => T | undefined | Promise<T | undefined>, timing?: Timing): Promise<T>;
export function fetchFromRegistry(
  version: string,
  outDir: string,
  compareDir?: string,
  names?: string[],
  options?: { registry?: string; wait?: number; pause?: number; log?: (line: string) => void },
): Promise<string[]>;
