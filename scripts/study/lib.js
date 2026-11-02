/**
 * A study run (spec/skins.md → Studies): a fresh agent builds a skin the way someone outside this repository would,
 * from the release tarballs and a reference, in a sandbox it can't see the repository from, and deploys it to a fake
 * Home Assistant. `npm run study` sets the sandbox up; `npm run study:keep` brings what the agent made into
 * `studies/<name>/`, where it stays as a standalone project anyone can take, with what the run taught.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";

/** Where kept studies live, outside every workspace, tool and Storybook glob. */
export const STUDIES = "studies";

/** A study's name: lower-case kebab-case, as a skin's. */
export function studyName(name) {
  if (!name || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(name)) throw new Error(`name "${name ?? ""}" must be lower-case kebab-case, like "warm-paper"`);
  return name;
}

/** The sandbox: `agent/` is the only folder the agent sees; `ha/` is the fake Home Assistant's www and state. */
export function sandbox(name, root = tmpdir()) {
  const dir = join(root, `dashhaus-study-${name}`);
  return { dir, agent: join(dir, "agent"), www: join(dir, "ha", "www"), state: join(dir, "ha", "state.json"), run: join(dir, "run.json") };
}

/**
 * The task the agent gets, and all it gets: one line of request, what a person would know about their Home Assistant,
 * and where to write what the run taught. It names no repository path, so the run tests the packages alone.
 */
export function taskText({ reference, haUrl, token, www }) {
  const look = reference.kind === "image"
    ? `that looks like ./${reference.file}`
    : `that looks like this: ${reference.text}`;
  return `# Task

Build and deploy a Dashhaus skin ${look}

Home Assistant runs at ${haUrl}; a long-lived token for an admin: ${token}; its /config/www is mounted at ${www}.
The packages aren't on npm yet; their release tarballs are in ./tarballs.
Work only in this folder; don't ask questions.

When you're done, write REPORT.md in this folder with two sections:

- ## FRICTION: every guess, retry, workaround, or doc that pointed somewhere you couldn't reach.
- ## RESULT: what is deployed and how you know.
`;
}

/**
 * A kept skin's manifest: its `file:` tarball paths become the version the run was built against, so whoever takes
 * the study installs it from the registry.
 */
export function pinnedManifest(manifest, version) {
  const pinned = structuredClone(manifest);
  for (const field of ["dependencies", "devDependencies", "peerDependencies"]) {
    for (const [name, range] of Object.entries(pinned[field] ?? {})) {
      if (typeof range === "string" && range.startsWith("file:")) pinned[field][name] = `^${version}`;
    }
  }
  return pinned;
}

/** What a kept study's report must say, for the docs site and the next change to the generators. */
export const REPORT_SECTIONS = ["## FRICTION", "## RESULT"];
