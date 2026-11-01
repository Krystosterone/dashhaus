/** What the Card and skin generators share: the repo, templates, and one fully planned set of file changes. */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { root, packageFile, packageSpecifier, seams, skinDir } from "../packages.js";

export { root, packageFile, packageSpecifier, seams, skinDir };
export const templates = fileURLToPath(new URL("./templates/", import.meta.url));
export const read = (path) => readFileSync(join(root, path), "utf8");
export const exists = (path) => existsSync(join(root, path));

export const fail = (message) => {
  console.error(`new-card: ${message}`);
  process.exit(1);
};

/**
 * Replace every token in a text: `{ __Name__: "Fan" }`. A line a token empties is dropped, so an optional prop
 * can stand on its own line in a template: `__pressProps__` on a JSX line, filled with `onToggle={…}` or nothing.
 */
export const filler = (tokens) => (text) => text
  .split("\n")
  .flatMap((line) => {
    const filled = Object.entries(tokens).reduce((s, [token, value]) => s.replaceAll(token, value), line);
    return filled.trim() === "" && line.trim() !== "" ? [] : [filled];
  })
  .join("\n");

/** A card's name in every form a template and a doc use, or a failure if it isn't camelCase. */
export function names(name, example) {
  if (!/^[a-z][a-zA-Z0-9]*$/.test(name)) fail(`name "${name}" must be camelCase starting lower-case, like ${example}`);
  const words = name.replace(/([A-Z])/g, " $1").toLowerCase();
  return {
    name,
    Name: name[0].toUpperCase() + name.slice(1),
    CONST: name.replace(/([A-Z])/g, "_$1").toUpperCase(),
    /** "air purifier" */
    words,
    /** "Air purifier" */
    Label: words[0].toUpperCase() + words.slice(1),
  };
}

/**
 * Which orb card draws which Home Assistant domain, read from orb's Lovelace config: `domainKind` is DOMAIN_KIND
 * (a domain's own card), `shared` is SHARED_KINDS (a card on another card's domain, with its `id` pattern as source).
 */
export function orbKinds() {
  const source = read(seams.orb.config);
  const body = (constName) => source.match(new RegExp(`const ${constName}\\b[^{]*\\{([\\s\\S]*?)\\n\\};`))?.[1];
  const domainKinds = body("DOMAIN_KIND");
  const sharedKinds = body("SHARED_KINDS");
  if (domainKinds == null || sharedKinds == null) fail(`could not find DOMAIN_KIND and SHARED_KINDS in ${seams.orb.config}. Update scripts/packages.js`);
  const domainKind = Object.fromEntries([...domainKinds.matchAll(/^\s*(\w+): "(\w+)",/gm)].map((m) => [m[1], m[2]]));
  const shared = Object.fromEntries([...sharedKinds.matchAll(/^\s*(\w+): \{ domains: \[([^\]]*)\](?:, id: (\/.*\/))? \},/gm)]
    .map((m) => [m[1], { domains: [...m[2].matchAll(/"(\w+)"/g)].map((d) => d[1]), id: m[3] }]));
  return { path: seams.orb.config, domainKind, shared };
}

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

/**
 * Insert text at a declared marker's registration point, before its comment line. Repeated insertions keep their
 * order above the marker, and a moved marker leaves the file alone.
 */
export const after = (marker, text) => (s) => {
  const i = s.indexOf(marker);
  if (i === -1) return s;
  const line = text.endsWith("\n") ? text : `${text}\n`;
  const start = s.lastIndexOf("\n", i) + 1;
  return s.slice(0, start) + line + s.slice(start);
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

/** The files to create, edit or remove, applied only after every change can be planned. */
export function changes({ templateRoot = templates, onFail = fail } = {}) {
  /** path (relative to the repo) → content; null removes the path. */
  const writes = new Map();
  const plannedExists = (path) => writes.has(path) ? writes.get(path) !== null : exists(path);
  const plannedRead = (path) => {
    const planned = writes.get(path);
    if (planned === null) onFail(`${path} is planned for removal`);
    return planned ?? read(path);
  };
  return {
    writes,
    exists: plannedExists,
    read: plannedRead,
    /** Copy template folders into the repo, filling names and contents; later folders win. */
    fromTemplates(dirs, fill, sourceRoot = templateRoot) {
      for (const base of dirs.map((dir) => join(sourceRoot, dir))) {
        for (const source of walk(base)) {
          const target = fill(relative(base, source));
          if (plannedExists(target)) onFail(`${target} already exists`);
          writes.set(target, fill(readFileSync(source, "utf8")));
        }
      }
    },
    create(path, content) {
      if (plannedExists(path)) onFail(`${path} already exists`);
      writes.set(path, content);
    },
    remove(path) {
      if (!plannedExists(path)) onFail(`${path} doesn't exist`);
      writes.set(path, null);
    },
    /** Change one file in place, failing loudly when the change finds nothing to anchor on. */
    edit(path, change) {
      const current = plannedRead(path);
      const next = change(current);
      if (next === current) onFail(`could not register in ${path}: its anchor moved. Update the generator templates and anchors`);
      writes.set(path, next);
    },
    /** Write everything, or with `dryRun` list what would be created, edited or removed. */
    commit(dryRun) {
      if (dryRun) {
        for (const [path, content] of [...writes.entries()].sort(([a], [b]) => a.localeCompare(b))) {
          console.log(`${content === null ? "remove" : exists(path) ? "edit  " : "create"} ${path}`);
        }
        return false;
      }
      for (const [path, content] of writes) {
        if (content === null) {
          rmSync(join(root, path), { recursive: true, force: true });
          continue;
        }
        mkdirSync(dirname(join(root, path)), { recursive: true });
        writeFileSync(join(root, path), content);
      }
      return true;
    },
  };
}
