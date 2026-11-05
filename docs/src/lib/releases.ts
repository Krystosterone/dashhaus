/**
 * The site's release notes, read from the release records (`spec/releases/<version>.md`) and the change notes waiting
 * for the next release (`changes/`), the same files `npm run release` writes and the Release workflow publishes from.
 * A record's words for people are its `## Release page` section, which the GitHub release also carries, and the
 * `### Upgrading` steps when it has them; the rest of a record (its verification, digests and publish gate) is for
 * whoever cuts the release, so the site leaves it out.
 *
 * Pure (files only), for the content loader in `content.config.ts`.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { CHANGES_DIR, parseChange } from "../../../scripts/release/changes.js";

export interface Release {
  version: string;
  /** Markdown: the record's Release page and Upgrading sections, empty for a record that predates them. */
  notes: string;
}

export interface PendingChange {
  type: "breaking" | "feature" | "fix";
  body: string;
}

/** A section's body, from its heading to the next heading of its level or above. */
function section(record: string, heading: string, level: number): string | undefined {
  const hashes = "#".repeat(level);
  const match = new RegExp(`^${hashes} ${heading}\\n([\\s\\S]*?)(?=^#{1,${level}} |(?![\\s\\S]))`, "m").exec(record);
  return match?.[1].trim() || undefined;
}

const newestFirst = (a: string, b: string) => {
  const [x, y] = [a, b].map((version) => version.split(".").map(Number));
  return y[0] - x[0] || y[1] - x[1] || y[2] - x[2];
};

/** The repository root, whether the build runs there or in `docs/`. */
function rootOf(cwd: string): string {
  return existsSync(join(cwd, "spec", "releases")) ? cwd : join(cwd, "..");
}

/** Every release record, newest first. */
export function releases(cwd = process.cwd()): Release[] {
  const dir = join(rootOf(cwd), "spec", "releases");
  return readdirSync(dir)
    .filter((file) => /^\d+\.\d+\.\d+\.md$/.test(file))
    .map((file) => file.replace(/\.md$/, ""))
    .sort(newestFirst)
    .map((version) => {
      const record = readFileSync(join(dir, `${version}.md`), "utf8");
      const page = section(record, "Release page", 2);
      const upgrading = section(record, "Upgrading", 3);
      return { version, notes: [page, upgrading && `### Upgrading\n\n${upgrading}`].filter(Boolean).join("\n\n") };
    });
}

/** The change notes for the next release a consumer would notice, breaking first. */
export function pendingChanges(cwd = process.cwd()): PendingChange[] {
  const dir = join(rootOf(cwd), CHANGES_DIR);
  if (!existsSync(dir)) return [];
  const order = ["breaking", "feature", "fix"];
  return readdirSync(dir)
    .filter((file) => file.endsWith(".md") && file !== "README.md")
    .sort()
    .map((file) => parseChange(readFileSync(join(dir, file), "utf8"), `${CHANGES_DIR}/${file}`))
    .filter((change): change is PendingChange => change.type !== "internal")
    .sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
}
