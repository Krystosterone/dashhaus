/**
 * Encodes the design rules from spec/orb.md and the repo skills as deterministic checks.
 * These read the actual CSS files; the docs are the contract, this test is the tripwire.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const walk = (dir: string, out: string[] = []): string[] => {
  for (const e of readdirSync(dir)) {
    if (e === "dist") continue;
    const p = join(dir, e);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (p.endsWith(".css")) out.push(p);
  }
  return out;
};

/** These rules are the orb skin's; another skin brings its own. */
const SKIN = "src/skins/orb";
const cssFiles = walk(SKIN).map((p) => relative(process.cwd(), p));
const css = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const nonTokens = cssFiles.filter((p) => p !== `${SKIN}/styles/tokens.css`);

/** transition/animation declarations, values up to the first `}`. */
const decls = (path: string) =>
  [...css(path).matchAll(/(?:^|;|\{)\s*(transition(?:-[a-z-]+)?|animation(?:-[a-z-]+)?)\s*:\s*([^;}]+)/g)].map((m) => ({
    prop: m[1],
    value: m[2].trim(),
  }));

describe("colour: tokens only", () => {
  it("no hex, named, or hsl/rgb colour anywhere outside tokens.css", () => {
    const bad: string[] = [];
    const named = /\b(red|green|blue|yellow|orange|purple|pink|brown|grey|gray|gold|silver|teal|navy|maroon|olive|lime|aqua|cyan|magenta|fuchsia|crimson|tomato|indigo|violet|coral|ivory|beige|tan|wheat|salmon|khaki|plum|lavender|azure|mint)\b/i;
    for (const f of nonTokens) {
      const body = css(f);
      if (/#[0-9a-fA-F]{3,8}\b/.test(body)) bad.push(`${f}: hex`);
      if (named.test(body)) bad.push(`${f}: named colour`);
      for (const m of body.matchAll(/(oklch|oklab|lab|lch|hsl|hsla|rgb|rgba|hwb)\(/g)) {
        // The sanctioned pattern is token channels; a literal oklch may only be a neutral grey shadow/scrim.
        const args = body.slice(m.index).match(/\(([^)]*)\)/)?.[1] ?? "";
        if (!args.includes("var(")) {
          if (m[1] !== "oklch") bad.push(`${f}: literal ${m[1]}()`);
          else {
            const [, chroma] = (args.match(/^[\d.]+ ([\d.]+) [\d.]+/) ?? []).map(Number);
            if (Number.isNaN(chroma) || chroma > 0.05) bad.push(`${f}: non-neutral oklch literal (${args})`);
          }
        }
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("UI language: one meaning per signal", () => {
  it("no hatching and no soft accent: off is the plain surface, on is the solid accent", () => {
    const bad: string[] = [];
    for (const f of cssFiles) {
      const body = css(f);
      if (/repeating-linear-gradient/.test(body)) bad.push(`${f}: hatching (repeating-linear-gradient)`);
      if (/var\(--(on|on-ring|hatching|hatch|on-mix|on-ring-a)\)/.test(body)) bad.push(`${f}: retired soft-accent or hatching token`);
    }
    expect(bad).toEqual([]);
  });

  it("dashed is unavailable and nothing else: only an outline is dashed, never a border or separator", () => {
    const bad: string[] = [];
    for (const f of cssFiles) {
      for (const m of css(f).matchAll(/(?:^|;|\{)\s*([a-z-]+)\s*:\s*[^;}]*\bdashed\b/g)) {
        if (m[1] !== "outline") bad.push(`${f}: ${m[1]} is dashed`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("buttons and grooves come from the shared surface tokens", () => {
    const t = css(`${SKIN}/styles/tokens.css`);
    for (const name of ["--btn", "--btn-shadow", "--groove", "--groove-shadow"]) expect(t, name).toContain(`${name}:`);
  });
});

describe("motion: composite-only, token easing, no viewport sizing", () => {
  const ANIMATABLE: Record<string, true> = { transform: true, translate: true, scale: true, rotate: true, opacity: true, "clip-path": true, "background-color": true, color: true, "box-shadow": true, none: true };

  it("transitions only animate compositor-safe properties, never `all`", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const { value } of decls(f).filter((d) => d.prop === "transition")) {
        for (const part of value.split(",")) {
          const prop = part.trim().split(/\s+/)[0];
          if (!ANIMATABLE[prop]) bad.push(`${f}: transition of \`${prop}\` (${value})`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("keyframes animate only compositor-safe properties", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const m of css(f).matchAll(/@keyframes\s+[\w-]+\s*\{([\s\S]*?)\}\s*(?=\})/g)) {
        for (const d of m[1].matchAll(/\b([a-z-]+)\s*:/g)) {
          const prop = d[1];
          if (prop === "from" || prop === "to" || /^\d+%$/.test(prop)) continue;
          if (!ANIMATABLE[prop]) bad.push(`${f}: keyframe animates \`${prop}\``);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("easing comes only from the --ease-* tokens or linear", () => {
    const bad: string[] = [];
    for (const f of cssFiles) {
      for (const { prop, value } of decls(f)) {
        if (prop.includes("duration") || prop.includes("delay")) continue;
        const stripped = value.replace(/var\(--ease[^)]*\)/g, "").replace(/\blinear\b/g, "");
        if (/ease|cubic-bezier|steps|spring/i.test(stripped)) bad.push(`${f}: ${prop}: ${value}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it("hover styles live under the hover-capability media query", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      const body = css(f);
      const stack: string[] = [];
      for (let i = 0; i < body.length; i++) {
        if (body.startsWith("@media", i)) {
          const end = body.indexOf("{", i);
          stack.push(body.slice(i + 6, end));
          i = end;
        } else if (body[i] === "{") stack.push("");
        else if (body[i] === "}") stack.pop();
        else if (body.startsWith(":hover", i)) {
          const ok = stack.some((c) => /hover\s*:\s*hover/.test(c) && /pointer\s*:\s*fine/.test(c));
          if (!ok) bad.push(`${f}: :hover outside @media (hover: hover) and (pointer: fine)`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  // Cards and the page around them size from their container; only the sheet (card.css, Bundle.css) asks the viewport.
  it("card and dashboard CSS only uses media queries for motion or pointer capability", () => {
    const bad: string[] = [];
    for (const f of cssFiles.filter((p) => p.startsWith(`${SKIN}/cards/`) || p.startsWith(`${SKIN}/dashboards/`))) {
      for (const m of css(f).matchAll(/@media\s+([^{]+)\{/g)) {
        const c = m[1];
        const reduced = /prefers-reduced-motion/.test(c);
        const hoverPair = /hover\s*:\s*hover[\s\S]*pointer\s*:\s*fine|pointer\s*:\s*fine[\s\S]*hover\s*:\s*hover/.test(c);
        if (!reduced && !hoverPair) bad.push(`${f}: @media ${c.trim()}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("a clock runs on by itself", () => {
  it("cuts and never slides: its places' stops in fours of decimals, each held, and it stops at its end", () => {
    const bad: string[] = [];
    let clocks = 0;
    for (const f of nonTokens) {
      const body = css(f);
      for (const m of body.matchAll(/@keyframes\s+([\w-]*reel[\w-]*)\s*\{/g)) {
        clocks++;
        const start = m.index! + m[0].length;
        let depth = 1;
        let end = start;
        for (; end < body.length && depth > 0; end++) depth += body[end] === "{" ? 1 : body[end] === "}" ? -1 : 0;
        for (const [, stops] of body.slice(start, end - 1).matchAll(/([^{}]+)\{/g)) {
          const list = stops.split(",").map((stop) => stop.trim());
          if (list.length !== 2) bad.push(`${f}: ${m[1]} ${stops.trim()} isn't a held stop`);
          for (const stop of list) if (!/^\d+(?:\.\d{4})?%$/.test(stop)) bad.push(`${f}: ${m[1]} ${stop}`);
        }
        for (const { value } of decls(f).filter((d) => d.prop === "animation" && d.value.includes(m[1]))) {
          if (/\binfinite\b/.test(value) || !/\bforwards\b/.test(value)) bad.push(`${f}: ${value}`);
        }
      }
    }
    expect(clocks).toBeGreaterThan(0);
    expect(bad).toEqual([]);
  });
});

describe("touch: controls answer presses, tracks let pages scroll", () => {
  it("shared controls disable tap highlight, selection, and tap delay", () => {
    const c = css(`${SKIN}/shared/card.css`);
    expect(c).toContain("touch-action: manipulation");
    expect(c).toContain("-webkit-tap-highlight-color: transparent");
    expect(c).toContain("user-select: none");
    expect(c).toContain("-webkit-touch-callout: none");
  });

  it("the track's hit layer keeps vertical scrolling (pan-y), and no card draws its own", () => {
    expect(css(`${SKIN}/shared/card.css`)).toMatch(/\.hd-track-hit \{[^}]*touch-action: pan-y/);
    const own = cssFiles.filter((f) => f.startsWith(`${SKIN}/cards/`) && /touch-action/.test(css(f)));
    expect(own, "a card that slides draws its track with Track (shared/ui.tsx)").toEqual([]);
  });
});

describe("glow: attention is a multiplier on a dimmed baseline", () => {
  it("the glow layer is glow x damping, both defaulting off or full", () => {
    expect(css(`${SKIN}/shared/card.css`)).toContain("opacity: calc(var(--hd-glow, 0) * var(--glow-damp, 1))");
  });
});

