import type { ComponentProps } from "react";
import { Canvas, Markdown } from "@storybook/blocks";

type Of = ComponentProps<typeof Canvas>["of"];

/** Where a doc's relative links point once it's shown in Storybook, where they would lead nowhere. */
const REPO = "https://github.com/Krystosterone/home-dashboard/blob/main/";

interface Props {
  markdown: string;
  /** The file's path in the repo, so its relative links resolve as they do on GitHub. */
  path: string;
  /** Stories to draw after a section, by its `## ` heading. */
  after?: Record<string, Of[]>;
  /** Sections to leave out, by heading: what the file says that the page isn't for (install, licence). */
  skip?: string[];
  /** Draw what comes before the first `## `: the title and opening. */
  intro?: boolean;
}

/**
 * A markdown doc, drawn in Storybook with live stories after the sections they show. The markdown stays the one
 * source: every `## ` section not skipped is drawn in order, so a section added to the file shows up here without an
 * edit, and only the stories and the skips are chosen by hand, by heading. A heading named here that the file
 * doesn't have is an error, so renaming one can't quietly drop its stories or bring back a skipped section.
 */
export function MarkdownWithStories({ markdown, path, after = {}, skip = [], intro = true }: Props) {
  const base = new URL(path, REPO);
  const linked = markdown.replace(/\]\((?!https?:|#)([^)]+)\)/g, (_, href: string) => `](${new URL(href, base).href})`);
  const [opening, ...sections] = linked.split(/^(?=## )/m);
  const headingOf = (section: string) => section.slice(3, section.indexOf("\n")).trim();
  const headings = sections.map(headingOf);
  const unknown = [...Object.keys(after), ...skip].filter((h) => !headings.includes(h));
  if (unknown.length) throw new Error(`MarkdownWithStories: ${path} has no section headed ${unknown.map((h) => `"## ${h}"`).join(", ")}`);
  return (
    <>
      {intro && <Markdown>{opening}</Markdown>}
      {sections.filter((s) => !skip.includes(headingOf(s))).map((section) => {
        const heading = headingOf(section);
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
