#!/usr/bin/env node
/**
 * `npm test`: the skin's checks, each finding printed with where it is and what to do.
 *
 * 1. The packed card preset (`@dashhaus/core/lovelace/conformance`) over `cards/`: every card folder has its component
 *    and story file, its stories are titled `__Section__/Cards/<Name>`, its classes start with `__skin__-`, and it
 *    imports nothing from the Home Assistant layer.
 * 2. The skin's own CSS rules (AGENTS.md → Rules): colours only from `styles/tokens.css`, whose blocks sit on `:root`,
 *    the theme on the skin's own attribute, hover only under the hover media query, and motion only on transform,
 *    opacity, clip-path and colours.
 * 3. Every `var(--__skin__-…)` without a fallback, in a stylesheet or in CSS written in a component (the host CSS in
 *    `lovelace/card.tsx`), names a custom property something defines: a renamed token leaves no rule reading nothing.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { cardFolders, checkCards } from "@dashhaus/core/lovelace/conformance";

const root = process.cwd();

const cardFindings = checkCards(
  {
    skin: ".",
    storyPrefix: "__Section__/Cards",
    component: (Name) => `__Skin__${Name}Card.tsx`,
    stories: (Name) => `__Skin__${Name}Card.stories.tsx`,
    allowedClass: (cls) => cls.startsWith("__skin__-"),
    forbiddenImport: (specifier) =>
      specifier === "@dashhaus/core" ||
      /^@dashhaus\/core\/(?:ha|websocket|demo|testing|fixtures)(?:\/|$)/.test(specifier) ||
      specifier === "@dashhaus/core/lovelace",
  },
  { root },
).map((finding) => `cards/${finding.card}: [${finding.rule}] ${finding.message}`);

/** Every file the bundle can carry with one of these endings: everything but dependencies, the build and the preview page. */
function sources(extensions, dir = root) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["node_modules", "dist", "preview", ".git"].includes(entry.name)) return [];
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(extensions, path);
    return extensions.some((extension) => entry.name.endsWith(extension)) ? [path] : [];
  });
}
const stylesheets = () => sources([".css"]);

const COLOUR = /#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/i;
const LAYOUT_MOTION = /\b(?:transition(?:-property)?|will-change)\s*:[^;]*\b(?:width|height|top|left|right|bottom|margin[a-z-]*|padding[a-z-]*|inset|gap|font-size|all)\b/i;
const SHARED_THEME = /\[data-theme\b/;
const HOVER_MEDIA = /@media\s*\(hover:\s*hover\)\s*and\s*\(pointer:\s*fine\)/i;

function cssFindings(file) {
  const name = relative(root, file);
  const source = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, (comment) => comment.replace(/[^\n]/g, " "));
  const findings = [];
  const lines = source.split("\n");
  const tokens = name === join("styles", "tokens.css");
  // The hover rule needs the block structure: track which open braces belong to the hover media query.
  const stack = [];
  let pending = "";
  lines.forEach((line, index) => {
    const at = `${name}:${index + 1}`;
    if (!tokens && COLOUR.test(line)) findings.push(`${at}: [colour] a colour literal; add a token to styles/tokens.css and use var(--__skin__-…)`);
    if (LAYOUT_MOTION.test(line)) findings.push(`${at}: [motion] animate only transform, opacity, clip-path and colours, never layout or "all"`);
    if (SHARED_THEME.test(line)) findings.push(`${at}: [theme] key the theme on [data-__skin__-theme], the skin's own attribute; another skin on the page may set data-theme`);
    for (const char of line) {
      if (char === "{") {
        if (tokens && !pending.trim().startsWith("@") && /(^|,)\s*(?!:root)[^,\s]/.test(pending.trim())) {
          findings.push(`${at}: [tokens] keep token blocks on :root (the card's host); a block on another selector hides the dark values`);
        }
        stack.push(HOVER_MEDIA.test(pending));
        if (/:hover\b/.test(pending) && !stack.slice(0, -1).includes(true)) {
          findings.push(`${at}: [hover] put :hover rules inside @media (hover: hover) and (pointer: fine), so a tap never leaves one stuck`);
        }
        pending = "";
      } else if (char === "}") {
        stack.pop();
        pending = "";
      } else if (char === ";") {
        pending = "";
      } else {
        pending += char;
      }
    }
    pending += " ";
  });
  return findings;
}

/** A `var(--__skin__-…)` with no fallback that nothing defines, as `--name: …` in CSS or `"--name"` in a component. */
function tokenFindings() {
  const files = sources([".css", ".ts", ".tsx"]).map((file) => ({ name: relative(root, file), source: readFileSync(file, "utf8") }));
  const defined = new Set(files.flatMap(({ source }) => [...source.matchAll(/(--__skin__-[\w-]+)\s*:|["'`](--__skin__-[\w-]+)["'`]/g)].map((match) => match[1] ?? match[2])));
  return files.flatMap(({ name, source }) => source.split("\n").flatMap((line, index) =>
    [...line.matchAll(/var\(\s*(--__skin__-[\w-]+)\s*\)/g)]
      .filter((match) => !defined.has(match[1]))
      .map((match) => `${name}:${index + 1}: [tokens] var(${match[1]}) names no token; define it in styles/tokens.css, or use the token's new name`)));
}

const findings = [...cardFindings, ...stylesheets().flatMap(cssFindings), ...tokenFindings()];
if (findings.length) {
  console.error(`conformance: ${findings.length} finding(s)\n  ${findings.join("\n  ")}`);
  process.exit(1);
}
console.log(`conformance: ${cardFolders(".", { root }).length} cards and ${stylesheets().length} stylesheets, no findings`);
