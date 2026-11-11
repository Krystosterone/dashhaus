// The API comparison is JavaScript so the release commands run without type stripping.

export type Api = Record<string, {
  typed: boolean;
  exports: Record<string, string>;
  /** For each exported interface: whether it appears in an input position (a parameter, a prop, a member of an input type or a generic constraint). */
  inputs?: Record<string, boolean>;
  /** For each exported interface: whether any exported value hands it out (a return, a member of a returned type, a callback's parameter). */
  outputs?: Record<string, boolean>;
}>;

export interface ApiDiff {
  removedSubpaths: string[];
  addedSubpaths: string[];
  removed: { subpath: string; name: string }[];
  changed: { subpath: string; name: string; before: string; after: string; breaking: boolean }[];
  added: { subpath: string; name: string }[];
  breaking: boolean;
  additive: boolean;
}

export function unpack(tarballs: { name: string; file: string }[], into: string): Promise<void>;
export function readApi(dir: string, names?: string[]): Promise<Api>;
export function diffApi(before: Api, after: Api): ApiDiff;
export function suggestVersion(latest: string, change: { breaking: boolean; feature: boolean }): string;
export function compareVersions(a: string, b: string): -1 | 0 | 1;
export function apiMarkdown(diff: ApiDiff, from: string): string;
export function apiOfTarballs(tarballsDir: string, version: string, work: string): Promise<Api>;
export function apiOfRegistry(version: string, work: string): Promise<Api>;
export function apiWorkDir(root: string): Promise<string>;
