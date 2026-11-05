/**
 * The scaffolder's usage, as data: `--help` prints it and the documentation site's author guide draws its reference
 * from it, so the two can't disagree.
 */

/** Each way to run it. */
export const USAGE = [
  "create-dashhaus-skin <directory> [--tarballs <dir>] [--dry-run]",
  "create-dashhaus-skin add <domain> [--kind control|reading] [--dry-run]",
];

/** Each argument and option, with what it does; `domains` marks the one followed by the domains `add` can draw. */
export const OPTIONS = [
  { flag: "<directory>", text: "a new, empty folder, or \".\" for the current one; its name is the skin's name" },
  { flag: "--tarballs <dir>", text: "install @dashhaus packages from the release tarballs in <dir>, not the registry" },
  { flag: "add <domain>", text: "run inside a skin: add the card for one more domain, registered and ready to restyle", domains: true },
  { flag: "--kind", text: "a control (its actions as buttons) or a reading (none); the domain's own kind by default" },
  { flag: "--dry-run", text: "print the files that would be written" },
  { flag: "--help", text: "this message" },
];

export const ABOUT = `It writes a working skin (a light and a sensor card, a preview, checks, a one-file build and a deploy config) and an
AGENTS.md that says where its colours, type, parts and rules live.`;

/** The `--help` text, with the domains `add` can draw. */
export function helpText(domains) {
  const width = Math.max(...OPTIONS.map((option) => option.flag.length)) + 3;
  const options = OPTIONS.map((option) => `  ${option.flag.padEnd(width)}${option.text}${option.domains ? `\n  ${" ".repeat(width)}(${domains.join(", ")})` : ""}`);
  return `usage: ${USAGE.join("\n       ")}\n\n${options.join("\n")}\n\n${ABOUT}`;
}
