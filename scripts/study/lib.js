/**
 * A study run (spec/skins.md → Studies): a fresh agent builds a skin the way someone outside this repository would,
 * from the release tarballs and a reference, in a sandbox it can't see the repository from, and deploys it to a fake
 * Home Assistant. `npm run study` sets the sandbox up; `npm run study:keep` brings what the agent made into
 * `src/skins/<skin>/` as a study, with the same shape and the same checks as every other study.
 */
import { tmpdir } from "node:os";
import { join } from "node:path";

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

/** What a run's REPORT.md must say, for the study's Read me first and the next change to the generators. */
export const REPORT_SECTIONS = ["## FRICTION", "## RESULT"];

/**
 * The headings a run's DESIGN.md must have, so its Foundations → Design rules page can draw the skin's palette, parts
 * and dashboards after them. Each card adds its own `## <Card>` (`## Light`), which draws that card's states.
 */
export const DESIGN_SECTIONS = ["## Palette", "## Parts", "## Dashboards"];

/** The files a run leaves beside its skin, which the study keeps. */
export const RUN_FILES = { report: "REPORT.md", design: "DESIGN.md" };

/**
 * The task the agent gets, and all it gets: one line of request, what a person would know about their Home Assistant,
 * and the two files the study keeps. It names no repository path, so the run tests the packages alone.
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

When you're done, write two files in this folder, beside the skin:

- ${RUN_FILES.design}: the skin's design rules, for whoever builds on it: what the look is after, then ${DESIGN_SECTIONS.join(", ")}
  and one \`## <Card>\` section per card (\`## Light\`), each saying what it shows and why.
- ${RUN_FILES.report}, with two sections:
  - ${REPORT_SECTIONS[0]}: every guess, retry, workaround, or doc that pointed somewhere you couldn't reach.
  - ${REPORT_SECTIONS[1]}: what is deployed and how you know.
`;
}

/** The headings (`## Palette` → `Palette`) a markdown file has. */
export const headingsOf = (markdown) => [...markdown.matchAll(/^## (.+?)\s*$/gm)].map((match) => match[1]);

/**
 * A study's Design rules page drawn from its own design.md: the template places the palette and parts after "Baseline
 * design", which a run's DESIGN.md calls Palette and Parts, and every story keyed by a heading the file doesn't have
 * is left out, so the page draws whatever design rules the agent wrote.
 */
export function fitDesignRules(mdx, headings) {
  const has = new Set(headings);
  return mdx
    .replace(/^(\s*)"Baseline design": \[Palette\.Roles, Parts\.States\],$/m, "$1Palette: [Palette.Roles],\n$1Parts: [Parts.States],")
    .split("\n")
    .filter((line) => {
      const key = line.match(/^\s*(?:"([^"]+)"|(\w+)): \[[\w.,\s]+\],$/);
      return !key || has.has(key[1] ?? key[2]);
    })
    .join("\n");
}

/** A study's Read me first section on how it was made, for a kept run. Its sentences aren't wrapped: they carry the run's words. */
export function madeByRun({ reference, task, version, commit }) {
  const look = reference.kind === "image" ? `the picture in [${reference.file}](${reference.file})` : `this description: "${reference.text}"`;
  return `A fresh agent built it from the Dashhaus ${version} release packages (commit \`${commit}\`) and ${look}, the way someone outside this repository would: in an empty folder, with \`npm create dashhaus-skin\`, its \`AGENTS.md\` and \`npm run add\`, then deployed it to a simulated Home Assistant. Its whole task:

${task.trim().split("\n").map((line) => `> ${line}`.trimEnd()).join("\n")}

- [\`REPORT.md\`](REPORT.md) is its own account: its FRICTION (every guess, retry and dead end) and its RESULT.
- [\`design.md\`](design.md) is the design rules it wrote.
- [\`captures/\`](captures/) holds its preview snapshots and \`deployed.png\`, the dashboard it deployed.

\`npm run study:keep\` then brought it into this repository: the agent's files over a shell from \`npm run new-skin -- --study\` and \`npm run new-card -- <domain> --skin\`, which add the stories, tests and Connected cards every skin has here. What only a standalone skin needs (its manifest, build and deploy config, preview and guide) stayed behind: the repository builds, previews and deploys its skins itself.
`;
}
