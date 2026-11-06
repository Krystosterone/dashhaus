/**
 * spec/journeys.md is the one list of the people Dashhaus serves. Each row's way in must be a page in the site's
 * sidebar, its proof a clean-room driver CI runs (or a repository command), and every driver in verify/dx/ must prove a
 * row, so a journey can't be promised without a proof or proved without being promised. The user's rows come first,
 * one per skin, each skin's landing page its way in. The introduction links every way in but the command-line one,
 * which is the advanced page of the user's section.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

interface Journey {
  name: string;
  page: string;
  proof: string;
}

function journeys(): Journey[] {
  const table = read("spec/journeys.md").split("\n").filter((line) => line.startsWith("| ") && !line.startsWith("| ---"));
  const [head, ...rows] = table.map((line) => line.slice(1, -1).split(" | ").map((cell) => cell.trim()));
  const column = (name: string) => head.indexOf(name);
  expect(head).toEqual(["Journey", "Who", "Way in", "Installs", "Proof", "Promise"]);
  const code = (cell: string) => cell.match(/^`([^`]+)`$/)?.[1] ?? cell;
  return rows.map((row) => ({ name: row[column("Journey")], page: code(row[column("Way in")]), proof: code(row[column("Proof")]) }));
}

describe("spec/journeys.md", () => {
  const rows = journeys();
  const sidebar = read("docs/astro.config.js");
  const ci = read(".github/workflows/ci.yml");
  const dx = ci.slice(ci.indexOf("\n  dx:"), ci.indexOf("\n  storybook_shard:"));

  it("lists the four kinds of user, the user first, by skin", () => {
    expect(rows.map((row) => row.name)).toEqual(["User: Orb", "User: Field", "User, both in one", "User, from the command line", "Author", "Developer", "Contributor"]);
  });

  it("gives each journey a page in the site's sidebar", () => {
    for (const { name, page } of rows) {
      expect(existsSync(join(root, "docs/src/content/docs", `${page}.mdx`)), `${name}: no docs page ${page}`).toBe(true);
      expect(sidebar, `${name}: ${page} is not in the sidebar`).toContain(`slug: "${page}"`);
    }
  });

  it("proves each journey with a driver CI runs from the packed tarballs, or a repository command", () => {
    const scripts = JSON.parse(read("package.json")).scripts as Record<string, string>;
    for (const { name, proof } of rows) {
      if (proof.startsWith("verify/dx/")) {
        expect(existsSync(join(root, proof)), `${name}: no ${proof}`).toBe(true);
        expect(dx, `${name}: CI's dx lane does not run ${proof}`).toContain(`run: node ${proof}`);
      } else {
        const script = proof.match(/^npm run ([\w:-]+)$/)?.[1];
        expect(script && scripts[script], `${name}: ${proof} is neither a dx driver nor an npm script`).toBeTruthy();
      }
    }
  });

  it("names a journey for every clean-room driver", () => {
    // The harness is shared machinery; details.js is the live smoke's check, run by hand against a real instance.
    const drivers = readdirSync(join(root, "verify/dx")).filter((file) => file.endsWith(".js") && !["harness.js", "details.js"].includes(file));
    const proved = new Set(rows.map((row) => row.proof));
    for (const driver of drivers) expect(proved.has(`verify/dx/${driver}`), `verify/dx/${driver} proves no journey in spec/journeys.md`).toBe(true);
  });

  it("is linked from the introduction, the command line aside", () => {
    const intro = read("docs/src/content/docs/intro.mdx");
    for (const { name, page } of rows.filter((row) => row.name !== "User, from the command line")) {
      expect(intro, `${name}: the introduction does not link ${page}`).toMatch(new RegExp(`(?:href="|\\]\\()/dashhaus/${page}/[")]`));
    }
  });
});
