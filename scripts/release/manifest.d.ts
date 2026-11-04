// The release manifest helpers are JavaScript so the build and pack commands run without type stripping.

export interface PublicPackage {
  key: string;
  name: string;
  dir: string;
  ship: string[];
}

export interface ExportTarget {
  source?: string;
  types?: string;
  import?: string;
  default?: string;
  [condition: string]: string | undefined;
}

export interface PackageManifest {
  name: string;
  version: string;
  private?: boolean;
  license?: string;
  description?: string;
  keywords?: string[];
  homepage?: string;
  bugs?: { url: string };
  repository?: { type?: string; url: string; directory?: string };
  author?: string;
  publishConfig?: { access?: "public" | "restricted" };
  type?: string;
  sideEffects?: boolean | string[];
  files?: string[];
  exports: Record<string, ExportTarget>;
  bin?: Record<string, string>;
  engines?: { node: string };
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, { optional?: boolean }>;
}

export const root: string;
export const publicPackages: PublicPackage[];
export const SEMVER: RegExp;
export const LICENSE: string;
export function readManifest(dir: string): Promise<PackageManifest>;
export function publishManifest(manifest: PackageManifest): PackageManifest;
export function tarballName(name: string, version: string): string;
export const PUBLISH_ORDER: string;
export function publishOrder(packed: { name: string; version: string }[]): string;
