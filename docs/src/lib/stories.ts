/**
 * Every Storybook story and docs page id in the repository, read from the files statically, the way Storybook's
 * indexer reads them (`verify/storybook.test.ts` reads them the same way): each story file's meta `title` and its
 * exported stories, and each MDX page's `<Meta title>`. A page that links or embeds one checks its id here, so a
 * renamed or removed story fails the build rather than leaving a link to Storybook's "story not found".
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { repoRoot } from "./api";

/** Storybook's own `sanitize`: lower case, every run of punctuation or spaces one hyphen. */
const sanitize = (text: string) =>
  text.toLowerCase().replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/g, "-").replace(/-+/g, "-").replace(/^-+|-+$/g, "");

/** A story's name from its export, as Storybook's `storyNameFromExport` words it: `AllStates` is `All States`. */
const words = (key: string) =>
  key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2").replace(/([a-zA-Z])(\d)/g, "$1 $2").replace(/(\d)([a-zA-Z])/g, "$1 $2");

/** The id Storybook gives a title's story: `Orb/Cards/Fan` and `AllStates` is `orb-cards-fan--all-states`. */
export const storyId = (title: string, exportName: string) => `${sanitize(title)}--${sanitize(words(exportName))}`;

/** The id of a title's MDX page: `Studies/Futura/Read me first` is `studies-futura-read-me-first--docs`. */
export const docsId = (title: string) => `${sanitize(title)}--docs`;

/** Where the site's Storybook is: the copy `npm run build:docs` puts under /storybook, or `npm run storybook` in dev. */
export const storybookUrl = () => (import.meta.env.DEV ? "http://localhost:6006/" : `${import.meta.env.BASE_URL.replace(/\/$/, "")}/storybook/`);

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === "node_modules" || entry.name === "dist") return [];
    const path = join(dir, entry.name);
    return entry.isDirectory() ? walk(path) : /\.stories\.tsx?$|\.mdx$/.test(entry.name) ? [path] : [];
  });
}

let index: Map<string, string> | undefined;

/** Every story and docs page id, with the file it is in. */
export function storyIndex(): Map<string, string> {
  if (index) return index;
  const root = repoRoot();
  index = new Map();
  for (const file of walk(join(root, "src"))) {
    const source = readFileSync(file, "utf8");
    if (file.endsWith(".mdx")) {
      const page = source.match(/<Meta\b[^>]*\btitle="([^"]+)"/)?.[1];
      if (page) index.set(docsId(page), relative(root, file));
      continue;
    }
    const title = source.match(/(?:const meta\b|export default)[\s\S]*?\btitle:\s*"([^"]+)"/)?.[1];
    if (!title) throw new Error(`stories: ${relative(root, file)} has no meta title the site can read`);
    for (const match of source.matchAll(/^export const (\w+)\b/gm)) {
      if (match[1] !== "meta") index.set(storyId(title, match[1]), relative(root, file));
    }
  }
  return index;
}

/** A story's or docs page's id, checked: throws, naming the closest ids, when no file has it. */
export function story(id: string): string {
  const known = storyIndex();
  if (known.has(id)) return id;
  const prefix = id.split("--")[0];
  const near = [...known.keys()].filter((other) => other.startsWith(`${prefix}--`));
  throw new Error(`stories: no story "${id}"${near.length ? `; ${prefix} has ${near.join(", ")}` : ""}`);
}
