import type { ComponentProps } from "react";
import { Canvas, Markdown } from "@storybook/blocks";

type Of = ComponentProps<typeof Canvas>["of"];

/** Where docs/*.md links point once they're shown in Storybook, where a relative link would lead nowhere. */
const REPO = "https://github.com/Krystosterone/home-dashboard/blob/main/docs/";

/**
 * A doc from docs/, drawn whole in Storybook with live stories after the sections they show. The markdown stays the
 * one source: every `## ` section is drawn in order, so a section added to the file shows up here without an edit,
 * and only the stories are chosen by hand, by heading.
 */
export function MarkdownWithStories({ markdown, after = {} }: { markdown: string; after?: Record<string, Of[]> }) {
  const linked = markdown.replace(/\]\((?!https?:|#)([^)]+)\)/g, (_, href: string) => `](${new URL(href, REPO).href})`);
  const [intro, ...sections] = linked.split(/^(?=## )/m);
  const unknown = Object.keys(after).filter((h) => !sections.some((s) => s.startsWith(`## ${h}\n`)));
  if (unknown.length) throw new Error(`MarkdownWithStories: no section headed ${unknown.map((h) => `"## ${h}"`).join(", ")}`);
  return (
    <>
      <Markdown>{intro}</Markdown>
      {sections.map((section) => {
        const heading = section.slice(3, section.indexOf("\n"));
        return (
          <div key={heading}>
            <Markdown>{section}</Markdown>
            {(after[heading] ?? []).map((of, i) => <Canvas key={i} of={of} />)}
          </div>
        );
      })}
    </>
  );
}
