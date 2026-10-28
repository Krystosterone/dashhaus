import type { ReactNode } from "react";

/**
 * Stands in a Storybook group Field has nothing for, so every skin's section keeps the same groups (AGENTS.md →
 * Storybook). It says why the group is empty; it never draws filler.
 */
export function NotInField({ children }: { children: ReactNode }) {
  return <p style={{ maxWidth: "60ch", margin: 0, font: "400 14px/1.5 var(--fd-sans)", color: "var(--fd-ink)" }}>{children}</p>;
}
