// The release command is JavaScript so it runs without type stripping.
import type { ApiDiff } from "./api.js";
import type { ChangeNote } from "./changes.js";

export function renderRecord(input: { version: string; from: string; notes: ChangeNote[]; diff: ApiDiff; repository: string }): string;
