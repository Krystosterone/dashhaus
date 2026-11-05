// The candidate checks are JavaScript so CI and the Release workflow run them without type stripping.

export interface Digest {
  name: string;
  hash: string;
}

export function recordPath(version: string): string;
export function digestsPath(version: string): string;
export function candidateFiles(version: string, releaseDir?: string): { name: string; path: string }[];
export function formatDigests(entries: Digest[]): string;
export function parseDigests(text: string): Digest[];
export function digestProblems(recorded: Digest[], packed: Digest[]): string[];
export function unfinished(record: string): string[];
export function lateNoteProblems(notes: { file: string }[], version: string): string[];
export function releaseBody(record: string, version: string, repositoryUrl: string): string;
export function packedDigests(version: string): Promise<Digest[]>;
