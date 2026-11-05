// The change-note helpers are JavaScript so CI runs them before anything is built.

export interface ChangeNote {
  type: "breaking" | "feature" | "fix" | "internal";
  body: string;
  file: string;
}

export const CHANGES_DIR: string;
export const CHANGE_TYPES: ChangeNote["type"][];
export function shipsFrom(path: string): boolean;
export function parseChange(text: string, file?: string): ChangeNote;
export function readChanges(dir?: string): Promise<ChangeNote[]>;
export function pullRequestProblem(entries: { status: string; path: string }[]): string | undefined;
export function noteFileName(body: string, taken: Set<string>): string;
export function formatChange(type: string, body: string): string;
