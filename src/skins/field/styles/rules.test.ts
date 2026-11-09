/**
 * The field skin's design rules (spec/field.md) and the hard rules every skin keeps (AGENTS.md), as checks
 * against its CSS, and the screen's words in its modules. The docs are the contract, this test is the tripwire.
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
      for (const { selector, body } of rules(f)) if (/var\(--fd-param-/.test(body) && !/\.fd-(thumb|pict-lit|meter-lit|dial-lit|dial-dot)$/.test(selector)) bad.push(`${f}: ${selector}`);
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

describe("the screen speaks in fixed places", () => {
  it("a resting state's figure is dim through the module's one rest hook, never a card's own rule", () => {
    const shared = rules(`${SKIN}/shared/module.css`).filter((r) => /\[data-rest\]/.test(r.selector));
    expect(shared.some((r) => /\.fd-read-fig/.test(r.selector) && /\.fd-chan/.test(r.selector) && /color: var\(--fd-screen-ink-2\)/.test(r.body))).toBe(true);
    const bad = cssFiles.filter((f) => f.startsWith(`${SKIN}/cards/`)).flatMap((f) => rules(f)
      .filter((r) => /\.fd-(?:read-fig|chan)\b/.test(r.selector) && /(?:^|;)\s*color\s*:\s*var\(--fd-screen-ink-2\)/.test(r.body))
      .map((r) => `${f}: ${r.selector}`));
    expect(bad, "pass the module's `rest` instead (spec/field.md → The screen speaks in fixed places)").toEqual([]);
    // And no state dims it by its name in the shared CSS either: off is a rest like any other.
    expect(nonTokens.flatMap((f) => rules(f).filter((r) => /\[data-state[^\]]*\][^,{]*\.fd-(?:read-fig|chan)\b/.test(r.selector)).map((r) => `${f}: ${r.selector}`))).toEqual([]);
  });

  it("a word on the screen takes four places at most; only an alarm's takes five", () => {
    const ALARM_WORDS = new Set(["ALARM", "SMOKE"]);
    const modules = readdirSync(join(process.cwd(), `${SKIN}/cards`), { recursive: true, encoding: "utf8" })
      .filter((f) => /Module\.tsx$/.test(f) && !/\.(stories|test)\.tsx$/.test(f));
    const bad = modules.flatMap((f) => [...readFileSync(join(process.cwd(), `${SKIN}/cards/${f}`), "utf8").matchAll(/"([A-Z][A-Z0-9]{4,})"/g)]
      .map((m) => m[1]).filter((word) => !ALARM_WORDS.has(word)).map((word) => `${f}: ${word}`));
    expect(bad).toEqual([]);
  });

  it("nothing printed is smaller than 10 px: every type size, in the tokens and the CSS", () => {
    const bad: string[] = [];
    for (const f of cssFiles) {
      for (const [, prop, px] of css(f).matchAll(/(font-size|--fd-type-[\w-]+)\s*:\s*([\d.]+)px/g)) if (Number(px) < 10) bad.push(`${f}: ${prop} ${px}px`);
    }
    expect(bad).toEqual([]);
  });

  it("a clock cuts and never slides: its places' stops in fours of decimals, each held, and it stops at its end", () => {
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

  it("a row's screen fits four places by its own geometry, the same for every card: a closer inset and closer segments", () => {
    const shared = rules(`${SKIN}/shared/module.css`);
    const screen = shared.find((r) => r.selector === '.fd-module[data-footprint="compact"] .fd-screen');
    expect(screen?.body).toMatch(/width: 104px/);
    expect(screen?.body).toMatch(/padding: 0 5px/);
    expect(shared.some((r) => r.selector === ':where(.fd-module[data-footprint="compact"]) .fd-read' && /letter-spacing: -0\.06em/.test(r.body))).toBe(true);
    // No card spaces a row's figure, nor pads its screen, to fit its own word: the row's geometry is shared.
    const bad = cssFiles.filter((f) => f.startsWith(`${SKIN}/cards/`)).flatMap((f) => rules(f)
      .filter((r) => /data-footprint="compact"\][^,{]*\.fd-screen\b/.test(r.selector) && /(?:^|;)\s*padding(?:-inline|-left|-right)?\s*:/.test(r.body))
      .map((r) => `${f}: ${r.selector}`));
    expect(bad).toEqual([]);
  });

  it("no card sets its row figure's size: the row's figure is the shared 21 px, and never steps down to fit", () => {
    /** A card's own size for what a row's screen prints, keyed `file: selector`, with why it isn't a figure. */
    const NOT_FIGURES: Record<string, string> = {
      [`${SKIN}/cards/guestWifi/GuestWifiModule.css: .fd-gw[data-state="ready"][data-footprint="compact"] .fd-read`]:
        "the guest code: eight characters of text a guest types, not a figure of four places",
      [`${SKIN}/cards/guestWifi/GuestWifiModule.css: .fd-gw[data-footprint="compact"] .fd-read:has([data-text])`]:
        "a Wi-Fi password: text of any length a guest types, not a figure",
    };
    const own = cssFiles.filter((f) => f.startsWith(`${SKIN}/cards/`)).flatMap((f) => rules(f)
      .filter((r) => r.selector.split(",").some((one) => /data-footprint="compact"\][^{]*\.fd-read(?:-fig)?\b/.test(one.replace(/:not\([^)]*\)/g, ""))))
      .filter((r) => /(?:^|;)\s*(?:font-size|font)\s*:/.test(r.body))
      .map((r) => `${f}: ${r.selector}`));
    expect(own.filter((key) => !(key in NOT_FIGURES)), "spec/field.md → Footprints: a row's screen keeps one geometry; a word that doesn't fit is another word").toEqual([]);
    expect(Object.keys(NOT_FIGURES).filter((key) => !own.includes(key)), "an exception no stylesheet still has").toEqual([]);
  });

  it("today's legend keeps to one line in a module, so the strip never moves: the summary ends in an ellipsis", () => {
    const shared = rules(`${SKIN}/shared/module.css`);
    expect(shared.some((r) => r.selector === ".fd-module .fd-today .fd-legend" && /white-space: nowrap/.test(r.body))).toBe(true);
    expect(shared.some((r) => r.selector === ".fd-module .fd-today .fd-legend-v" && /text-overflow: ellipsis/.test(r.body))).toBe(true);
  });

  it("a fader's legend keeps to one line over its slot: its words end in an ellipsis", () => {
    const shared = rules(`${SKIN}/shared/module.css`);
    expect(shared.some((r) => r.selector === ".fd-fader > .fd-legend" && /white-space: nowrap/.test(r.body))).toBe(true);
    expect(shared.some((r) => r.selector === ".fd-fader > .fd-legend > .fd-legend-n" && /text-overflow: ellipsis/.test(r.body))).toBe(true);
  });

  it("the screen's figure never steps its type down to fit its word: a word fits four places or is another word", () => {
    const bad = cssFiles.flatMap((f) => rules(f)
      .filter((r) => /\[data-(?:places|len|length|chars|long)\b/.test(r.selector) && /(?:^|;)\s*font-size\s*:/.test(r.body))
      .map((r) => `${f}: ${r.selector}`));
    expect(bad).toEqual([]);
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

  it("a width never makes a track of its own: the stylesheet spans nothing, the shared layout clamps each width to the row's tracks", () => {
    expect(css(`${SKIN}/dashboards/layout.css`)).not.toMatch(/grid-column:\s*span/);
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
