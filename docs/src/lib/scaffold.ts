/**
 * The skin the author guide builds, as `create-dashhaus-skin my-skin` writes it today, then `npm run add -- cover`:
 * the site shows its files rather than the templates, so a sample can't drift from the scaffolder's output.
 * `verify/docs.test.ts` writes the same skin and typechecks it.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";

export const SKIN = "my-skin";
/** The domain the guide's "Add a domain" adds. */
export const ADDED = "cover";

/**
 * Write the guide's skin into `parent/my-skin`, replacing what was there, and return its folder. With `added`, the
 * skin after `npm run add -- cover`.
 */
export function writeScaffold(repo: string, parent: string, added = false): string {
  const skin = join(parent, SKIN);
  rmSync(skin, { recursive: true, force: true });
  mkdirSync(dirname(skin), { recursive: true });
  const bin = join(repo, "packages/create-dashhaus-skin/bin.js");
  const steps = [[[bin, SKIN], parent], [[bin, "add", ADDED], skin]] as const;
  for (const [args, cwd] of added ? steps : steps.slice(0, 1)) {
    const result = spawnSync(process.execPath, args, { cwd, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`create-dashhaus-skin ${args.slice(1).join(" ")} failed:\n${result.stderr}${result.stdout}`);
  }
  return skin;
}

const written = new Map<boolean, string>();

/** One file of the guide's skin, as scaffolded or with the cover added, each written once per docs build. */
export function scaffoldFile(repo: string, path: string, added = false): string {
  if (!written.has(added)) written.set(added, writeScaffold(repo, join(repo, "node_modules/.cache/dashhaus-docs-site", added ? "added" : "scaffolded"), added));
  return readFileSync(join(written.get(added)!, path), "utf8");
}
