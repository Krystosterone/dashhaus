/** A study run's reference: a picture beside the task, or a description in it. */
export type StudyReference = { kind: "image"; file: string } | { kind: "description"; text: string };
export const STUDIES: string;
export function studyName(name: string | undefined): string;
export function sandbox(name: string, root?: string): { dir: string; agent: string; www: string; state: string; run: string };
export function taskText(options: { reference: StudyReference; haUrl: string; token: string; www: string }): string;
export function pinnedManifest<T extends Record<string, unknown>>(manifest: T, version: string): T & Record<string, Record<string, string>>;
export const REPORT_SECTIONS: string[];
