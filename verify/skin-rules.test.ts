/**
 * The rules every skin keeps have one home, spec/skins.md → Rules every skin keeps. Two readers carry them elsewhere:
 * this repo's AGENTS.md points there, and the scaffold's AGENTS.md repeats each one, under the same bold title, for an
 * agent that has only the package. A rule added to, renamed in or dropped from the spec fails here until both follow.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** A markdown section's body: from its heading to the next heading of the same level. */
function section(source: string, heading: string) {
  const start = source.indexOf(`\n${heading}\n`);
  if (start === -1) throw new Error(`no "${heading}" section`);
  const level = heading.match(/^#+/)![0];
  const rest = source.slice(start + heading.length + 2);
  const end = rest.search(new RegExp(`\\n${level} `));
  return end === -1 ? rest : rest.slice(0, end);
}

/** The bold title each bullet opens with, without its closing punctuation or a ✓ marker. */
const titles = (body: string) =>
  [...body.matchAll(/^- (?:✓ )?\*\*(.+?)\*\*/gm)].map((match) => match[1].replace(/[.:]$/, ""));

const rules = titles(section(read("spec/skins.md"), "## Rules every skin keeps"));

describe("rules every skin keeps", () => {
  it("are listed in spec/skins.md", () => {
    expect(rules.length).toBeGreaterThanOrEqual(6);
  });

  it("each appear in the scaffold's AGENTS.md under the same title", () => {
    const guide = titles(section(read("packages/create-dashhaus-skin/src/templates/AGENTS.md"), "## Rules"));
    expect(rules.filter((rule) => !guide.includes(rule))).toEqual([]);
  });

  it("are what this repo's AGENTS.md points every skin at", () => {
    const hard = section(read("AGENTS.md"), "## Hard rules");
    expect(hard).toContain("spec/skins.md → Rules every skin keeps");
  });
});
