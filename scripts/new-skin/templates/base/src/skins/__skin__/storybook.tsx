import type { Decorator } from "@storybook/react";
import "./styles/tokens.css";

/** Storybook setup owned by the __Section__ skin. */
export const __skinVar__Storybook = {
  section: "__Section__",
  surface: "__skin__-surface",
  globalTypes: {},
  initialGlobals: {},
  decorator: ((Story) => <Story />) satisfies Decorator,
};
