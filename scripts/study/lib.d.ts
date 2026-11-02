/** A study run's reference: a picture beside the task, or a description in it. */
export type StudyReference = { kind: "image"; file: string } | { kind: "description"; text: string };
/** A study's study.json: how it was made and from what. */
export interface StudyRecord {
  name: string;
  skin: string;
  kept: string;
  version: string;
  commit: string;
  made: "run" | "generators";
  reference?: StudyReference;
  task?: string;
  captures: string[];
}
export function studyName(name: string | undefined): string;
export function sandbox(name: string, root?: string): { dir: string; agent: string; www: string; state: string; run: string };
export const REPORT_SECTIONS: string[];
export const DESIGN_SECTIONS: string[];
export const RUN_FILES: { report: string; design: string };
export function taskText(options: { reference: StudyReference; haUrl: string; token: string; www: string }): string;
export function headingsOf(markdown: string): string[];
export function fitDesignRules(mdx: string, headings: readonly string[]): string;
export function madeByRun(options: { reference: StudyReference; task: string; version: string; commit: string }): string;
