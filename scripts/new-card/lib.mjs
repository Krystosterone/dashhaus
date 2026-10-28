/** What the orb and field card generators share: the repo, its templates, and a set of changes made all or none. */
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../../", import.meta.url));
export const templates = fileURLToPath(new URL("./templates/", import.meta.url));
export const read = (path) => readFileSync(join(root, path), "utf8");
export const exists = (path) => existsSync(join(root, path));

export const fail = (message) => {
  console.error(`new-card: ${message}`);
  process.exit(1);
};

/** Replace every token in a text: `{ __Name__: "Fan" }`. */
export const filler = (tokens) => (text) => Object.entries(tokens).reduce((s, [token, value]) => s.replaceAll(token, value), text);

const walk = (dir, out = []) => {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) walk(path, out);
    else out.push(path);
  }
  return out;
};

/** Insert text before the first match of an anchor (a string or a RegExp). */
export const before = (anchor, text) => (s) => {
  const i = typeof anchor === "string" ? s.indexOf(anchor) : s.search(anchor);
  return i === -1 ? s : s.slice(0, i) + text + s.slice(i);
};

/** Insert a line after the line holding the last match of a global pattern. */
export const afterLast = (pattern, text) => (s) => {
  const last = [...s.matchAll(pattern)].at(-1);
  if (!last) return s;
  const end = s.indexOf("\n", last.index) + 1;
  return s.slice(0, end) + text + s.slice(end);
};

/** Add a line at the end of a top-level `const <name> … = { … };` object. */
export const intoObject = (constName, line) => (s) => s.replace(new RegExp(`(const ${constName}\\b[^{]*\\{[\\s\\S]*?)(\\n\\};)`), `$1\n${line}$2`);

/** The files to create and edit, written only once every one of them can be made. */
export function changes() {
  /** path (relative to the repo) → content */
  const writes = new Map();
  return {
    writes,
    /** Copy template folders (relative to ./templates/) into the repo, names and contents filled; later folders win. */
    fromTemplates(dirs, fill) {
      for (const base of dirs.map((dir) => join(templates, dir))) {
        for (const source of walk(base)) {
          const target = fill(relative(base, source));
          if (exists(target)) fail(`${target} already exists`);
          writes.set(target, fill(readFileSync(source, "utf8")));
        }
      }
    },
    create(path, content) {
      if (exists(path)) fail(`${path} already exists`);
      writes.set(path, content);
    },
    /** Change one file in place, failing loudly when the change finds nothing to anchor on. */
    edit(path, change) {
      const current = writes.get(path) ?? read(path);
      const next = change(current);
      if (next === current) fail(`could not register in ${path}: its anchor moved. Update scripts/new-card/`);
      writes.set(path, next);
    },
    /** Write everything, or with `dryRun` list what would be created and edited. */
    commit(dryRun) {
      if (dryRun) {
        for (const path of [...writes.keys()].sort()) console.log(`${exists(path) ? "edit  " : "create"} ${path}`);
        return false;
      }
      for (const [path, content] of writes) {
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), content);
      }
      return true;
    },
  };
}
