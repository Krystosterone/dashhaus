/**
 * The repo's own conformance readers (verify/conformance.ts), on sources of their own: the part-prop rule's reader
 * counts a prop on the part it is passed to, and finds it drawn in a Parts story through a component of the story's
 * that spreads into the part, or through a card's own component the story draws.
 */
import { describe, expect, it } from "vitest";
import { optionalProps, undrawnProps } from "./conformance";
import type { Sources } from "./conformance";

const UI = `
export interface FrameProps { name: string; hint?: string; word?: string }
export function Frame({ name }: FrameProps) { return <div>{name}</div>; }
export function Pill({ label }: { label: string; extra?: string; hint?: string }) { return <b>{label}</b>; }
`;
const CARDS = {
  a: ["s/cards/a/A.tsx", "s/cards/a/parts.tsx"],
  b: ["s/cards/b/B.tsx"],
};
const FILES: Record<string, string> = {
  "s/shared/ui.tsx": UI,
  "s/cards/a/A.tsx": `import { Fill } from "./parts";\nexport function A() { return <Frame name="a" hint="h" word="w"><Fill /></Frame>; }`,
  "s/cards/a/parts.tsx": `export function Fill() { return <Pill label="p" extra="e" />; }`,
  "s/cards/b/B.tsx": `export function B() { return <><Frame name="b" word="w" /><Pill label="q" hint="h" /></>; }`,
};
const story = (body: string) => `import { Frame } from "../shared/ui";\nimport { Fill } from "../cards/a/parts";\nfunction Wrap(props: object) { return <Frame name="w" {...props} />; }\nexport const S = () => <>${body}</>;`;
const sources = (body: string): Sources => (path) => (path === "s/stories/Parts.stories.tsx" ? story(body) : FILES[path]);

describe("the part-prop reader", () => {
  it("reads a part's optional props from its type", () => {
    expect(Object.fromEntries(optionalProps("s/shared/ui.tsx", sources("")))).toEqual({ Frame: ["hint", "word"], Pill: ["extra", "hint"] });
  });

  it("lists a prop one card passes that the Parts story never draws, on the part it is passed to", () => {
    // Frame's hint is card a's alone; Pill's hint, b's alone (another part's hint doesn't draw it); word, both cards'.
    expect(undrawnProps("s", { cards: CARDS, sources: sources("") })).toEqual(["<Frame hint> (a)", "<Pill extra> (a)", "<Pill hint> (b)"]);
  });

  it("finds it drawn on the part, through a component that spreads into it, or in a card's component the story draws", () => {
    expect(undrawnProps("s", { cards: CARDS, sources: sources(`<Wrap hint="h" /><Fill /><Pill label="r" hint="h" />`) })).toEqual([]);
    expect(undrawnProps("s", { cards: CARDS, parts: ["Frame"], sources: sources("") })).toEqual(["<Frame hint> (a)"]);
  });
});
