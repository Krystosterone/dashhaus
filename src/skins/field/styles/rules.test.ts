/**
 * The field skin's design rules (docs/field.md) and the hard rules every skin keeps (AGENTS.md), as checks
 * against its CSS. The docs are the contract, this test is the tripwire.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const SKIN = "src/skins/field";
const TOKENS = `${SKIN}/styles/tokens.css`;
const cssFiles = readdirSync(join(process.cwd(), SKIN), { recursive: true, encoding: "utf8" })
  .filter((f) => f.endsWith(".css") && !f.startsWith("dist/"))
  .map((f) => `${SKIN}/${f}`);
const css = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
const nonTokens = cssFiles.filter((p) => p !== TOKENS);

/** transition/animation declarations, values up to the first `;` or `}`. */
const decls = (path: string) =>
  [...css(path).matchAll(/(?:^|;|\{)\s*(transition(?:-[a-z-]+)?|animation(?:-[a-z-]+)?)\s*:\s*([^;}]+)/g)].map((m) => ({ prop: m[1], value: m[2].trim() }));

/** Each rule's selector with its declarations, flattened out of at-rules. */
const rules = (path: string) => [...css(path).matchAll(/([^{}@]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));

describe("colour: tokens only", () => {
  it("no hex, named or functional colour outside tokens.css", () => {
    const bad: string[] = [];
    const named = /:\s*[^;]*\b(red|green|blue|yellow|orange|purple|pink|grey|gray|white|black|silver|crimson|coral)\b/i;
    for (const f of nonTokens) {
      const body = css(f);
      if (/#[0-9a-fA-F]{3,8}\b/.test(body)) bad.push(`${f}: hex`);
      if (named.test(body)) bad.push(`${f}: named colour`);
      if (/\b(oklch|oklab|lab|lch|hsla?|rgba?|hwb)\(/.test(body)) bad.push(`${f}: colour function`);
    }
    expect(bad).toEqual([]);
  });

  it("the skin's tokens are scoped: every custom property it declares starts with --fd-", () => {
    const bad: string[] = [];
    for (const f of cssFiles) {
      for (const [, name] of css(f).matchAll(/(?:^|[;{\s])(--[\w-]+)\s*:/g)) if (!name.startsWith("--fd-") && name !== "--v") bad.push(`${f}: ${name}`);
    }
    expect(bad).toEqual([]);
  });

  it("a lit LED is the one sign of on: --fd-led-lit appears only on it", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const { selector, body } of rules(f)) if (/var\(--fd-led-lit/.test(body) && selector !== '.fd-led[data-lit="true"]') bad.push(`${f}: ${selector}`);
    }
    expect(bad).toEqual([]);
  });

  it("a parameter's colour marks only its control, its pictogram and its history", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const { selector, body } of rules(f)) if (/var\(--fd-param-/.test(body) && !/\.fd-(thumb|pict-lit|meter-lit)$/.test(selector)) bad.push(`${f}: ${selector}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("a reading", () => {
  it("draws its glyph flat, never as a control: no lift, no press, no hover, no pointer", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const { selector, body } of rules(f)) {
        if (!/\.fd-glyph/.test(selector)) continue;
        if (/:(active|hover|focus)/.test(selector)) bad.push(`${f}: ${selector}`);
        if (/cursor:\s*pointer|box-shadow|--fd-key-lift|--fd-key\)/.test(body)) bad.push(`${f}: ${selector} looks pressable`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("a lamp's own colour", () => {
  it("shows only as a swatch: on a key, or as a screen pictogram", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const { selector, body } of rules(f)) if (/var\(--fd-lamp\b/.test(body) && !/^(\.fd-swatch|\.fd-pict\[data-lamp\] \.fd-pict-lit)$/.test(selector)) bad.push(`${f}: ${selector}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("footprint: height from the footprint, never from state or the viewport", () => {
  it("each footprint fixes the module's height", () => {
    const c = css(`${SKIN}/shared/module.css`);
    expect(c).toMatch(/\.fd-module\[data-footprint="standard"\]\s*\{[^}]*height: 160px/);
    expect(c).toMatch(/\.fd-module\[data-footprint="compact"\]\s*\{[^}]*height: 64px/);
  });

  // The detail panel is a dialog, not a card: it sizes to the screen and becomes a bottom sheet on phones.
  it("no viewport units and no viewport media queries in the modules", () => {
    const bad: string[] = [];
    for (const f of nonTokens.filter((p) => p !== `${SKIN}/shared/panel.css`)) {
      const body = css(f);
      if (/\d(?:d|s|l)?v(?:w|h|min|max)\b/.test(body)) bad.push(`${f}: viewport unit`);
      for (const m of body.matchAll(/@media\s+([^{]+)\{/g)) {
        if (!/prefers-reduced-motion|hover\s*:\s*hover/.test(m[1])) bad.push(`${f}: @media ${m[1].trim()}`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("viewing distance: type for the room, never a height", () => {
  it("the shared print and the screen's figure take their size and weight from the --fd-type-* roles", () => {
    const c = css(`${SKIN}/shared/module.css`);
    expect(c).toMatch(/\.fd-name \{[^}]*font-size: var\(--fd-type-name\)/);
    expect(c).toMatch(/\.fd-area \{[^}]*font-size: var\(--fd-type-small\)/);
    expect(c).toMatch(/\.fd-meta \{[^}]*font-size: var\(--fd-type-small\)/);
    expect(c).toMatch(/\.fd-key-cap \{[^}]*font-size: var\(--fd-type-cap\)/);
    expect(c).toMatch(/\.fd-legend \{[^}]*font-size: var\(--fd-type-legend\)/);
    expect(c).toMatch(/\.fd-read \{[^}]*font-weight: var\(--fd-type-figure\)/);
    expect(css(`${SKIN}/shared/alerts.css`)).toMatch(/\.fd-alerts-entry \{[^}]*font-size: var\(--fd-type-alert\)/);
  });

  it("far sets only the type roles, on the page and never on a detail panel, which is read up close", () => {
    const far = rules(TOKENS).filter((r) => r.selector.includes('[data-viewing="far"]'));
    expect(far).toHaveLength(1);
    expect(far[0].selector).not.toMatch(/fd-panel/);
    const props = [...far[0].body.matchAll(/(--?[\w-]+)\s*:/g)].map((m) => m[1]);
    expect(props.length).toBeGreaterThan(0);
    expect(props.filter((p) => !p.startsWith("--fd-type-"))).toEqual([]);
  });
});

describe("the page's nav: page furniture in the module's parts", () => {
  it("draws its keys as the module's key part, and where you are as a chosen key: down, never lit", () => {
    const c = css(`${SKIN}/dashboards/NavBar.css`);
    expect(readFileSync(join(process.cwd(), `${SKIN}/dashboards/NavBar.tsx`), "utf8")).toContain('className="fd-key fd-nav-key"');
    const current = rules(`${SKIN}/dashboards/NavBar.css`).filter((r) => r.selector.includes("[aria-current]"));
    expect(current.some((r) => /box-shadow: var\(--fd-key-sunk\)/.test(r.body))).toBe(true);
    expect(c).not.toMatch(/var\(--fd-(led|param|lamp)/);
  });

  it("a span never makes a track of its own: it applies only inside the area's width queries", () => {
    const c = css(`${SKIN}/dashboards/layout.css`);
    const outside = c.replace(/@container fd-area[^{]*\{[^{}]*\{[^}]*\}\s*\}/g, "");
    expect(outside).not.toMatch(/grid-column:\s*span/);
    expect(c).toMatch(/@container fd-area[^{]*\{[^{}]*\{[^}]*grid-column: span 2/);
  });
});

describe("motion: compositor-only, token easing", () => {
  const ANIMATABLE = new Set(["transform", "translate", "opacity", "clip-path", "background-color", "color", "box-shadow", "none"]);

  it("transitions only animate compositor-safe properties and colour, never `all`", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const { value } of decls(f).filter((d) => d.prop === "transition")) {
        for (const part of value.split(",")) {
          const prop = part.trim().split(/\s+/)[0];
          if (!ANIMATABLE.has(prop)) bad.push(`${f}: transition of \`${prop}\``);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  it("easing comes only from the --fd-ease-* tokens", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const { prop, value } of decls(f)) {
        if (/duration|delay/.test(prop)) continue;
        const stripped = value.replace(/var\(--fd-ease[^)]*\)/g, "").replace(/\blinear\b/g, "");
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
        else if (body.startsWith(":hover", i) && !stack.some((c) => /hover\s*:\s*hover/.test(c) && /pointer\s*:\s*fine/.test(c))) bad.push(`${f}: :hover outside the media query`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe("severity: inversion, never a colour, and a flash that ends", () => {
  it("an alarm's flash runs a set number of times, never forever, and stops under reduced motion and quiet", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const { prop, value } of decls(f)) if (prop === "animation" && /fd-alarm-/.test(value) && !/\s\d+$/.test(value)) bad.push(`${f}: ${value}`);
    }
    expect(bad).toEqual([]);
    expect(css(`${SKIN}/shared/module.css`)).toMatch(/prefers-reduced-motion: reduce\)\s*\{[^}]*data-level="alarm"\][^}]*animation: none/);
    expect(css(`${SKIN}/dashboards/layout.css`)).toMatch(/\.fd-dash\[data-quiet\][^{]*\{\s*animation: none/);
  });

  it("a level is drawn with the screen's and the plate's own inks, never a warning colour", () => {
    const bad: string[] = [];
    for (const f of nonTokens) {
      for (const { selector, body } of rules(f)) if (/data-level|data-block|fd-alerts/.test(selector) && /var\(--fd-(param|led|lamp)/.test(body)) bad.push(`${f}: ${selector}`);
    }
    expect(bad).toEqual([]);
  });
});

describe("touch: controls answer presses, faders let pages scroll", () => {
  it("keys and faders take no selection, callout or tap highlight, and no tap delay", () => {
    const c = css(`${SKIN}/shared/module.css`);
    for (const decl of ["touch-action: manipulation", "-webkit-tap-highlight-color: transparent", "user-select: none", "-webkit-touch-callout: none"]) expect(c).toContain(decl);
  });

  it("keys give press feedback on :active", () => {
    expect(css(`${SKIN}/shared/module.css`)).toMatch(/\.fd-key:active[^{]*\{[^}]*transform:/);
  });

  it("the fader's hit layer keeps vertical scrolling", () => {
    expect(css(`${SKIN}/shared/module.css`)).toMatch(/\.fd-hit\s*\{[^}]*touch-action: pan-y/);
  });
});
