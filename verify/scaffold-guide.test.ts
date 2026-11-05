/**
 * The scaffold's AGENTS.md is the one document an agent outside this repository reads. Its Data section names every
 * helper module `@dashhaus/core/entities/*` exports (formatters, labels, history), so an agent finds a label or a scale
 * there instead of in the `.d.ts` files or by writing its own. A module added to core fails here until it is listed;
 * a listed one that is gone fails too, and so does a name a row gives that its module doesn't export.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const entities = join(root, "packages/core/src/entities");
const guide = readFileSync(join(root, "packages/create-dashhaus-skin/src/templates/standalone/AGENTS.md"), "utf8");

const files = (dir: string): string[] => readdirSync(dir).flatMap((name) => {
  const path = join(dir, name);
  return statSync(path).isDirectory() ? files(path) : [path];
});

/** Each helper module, as its subpath under `@dashhaus/core/entities/`: not a test, an index or a domain's types. */
const helpers = files(entities)
  .map((path) => relative(entities, path).replace(/\.ts$/, ""))
  .filter((path) => !/\.test$|(^|\/)index$|\/types$/.test(path));

describe("the scaffold's AGENTS.md", () => {
  it("names every helper module of @dashhaus/core/entities", () => {
    expect(helpers.length).toBeGreaterThan(20);
    const missing = helpers.filter((path) => !guide.includes(`\`@dashhaus/core/entities/${path}\``) && !guide.includes(`\`/${path}\``));
    expect(missing, "add them to the Data section's table").toEqual([]);
  });

  it("names only helper modules that exist", () => {
    const named = [...guide.matchAll(/`@dashhaus\/core\/entities\/([\w/-]+)`/g)].map((match) => match[1]).filter((path) => !path.includes("<"));
    for (const path of named) expect(existsSync(join(entities, `${path}.ts`)), `@dashhaus/core/entities/${path}`).toBe(true);
  });

  it("names in each row only what that row's modules export", () => {
    const rows = [...guide.matchAll(/^\| (`@dashhaus\/core\/entities\/[^|]+)\| ([^|]+) \|$/gm)];
    expect(rows.length).toBeGreaterThan(10);
    const wrong = rows.flatMap(([, modules, what]) => {
      const sources = [...modules.matchAll(/`(?:@dashhaus\/core\/entities)?\/([\w/-]+)`/g)].map((match) => readFileSync(join(entities, `${match[1]}.ts`), "utf8"));
      const names = [...what.matchAll(/`([A-Za-z_]\w*)`/g)].map((match) => match[1]).filter((name) => !["null", "undefined", "true", "false"].includes(name));
      // A row that names exports lists one module, so an agent knows which to import each from.
      if (names.length && sources.length > 1) return [`${modules.trim()}: one module per row that names exports`];
      const exported = (name: string) => sources.some((source) =>
        new RegExp(`export (?:const|let|function|type|interface|enum|class) ${name}\\b`).test(source) || new RegExp(`export \\{[^}]*\\b${name}\\b`).test(source));
      return names.filter((name) => !exported(name)).map((name) => `${name} in ${modules.trim()}`);
    });
    expect(wrong, "a name in the Data table that its row's modules don't export").toEqual([]);
  });
});
