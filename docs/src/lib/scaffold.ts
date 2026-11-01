/**
 * What `create-dashhaus-skin my-skin` writes for one template: the scaffolder's own placeholders, filled for the
 * skin the author guide builds. `verify/docs.test.ts` runs the real scaffolder and holds every file the site shows
 * from a template to its output, so this map can't drift from `packages/create-dashhaus-skin/src/index.js`.
 */
export const SKIN = "my-skin";

const TOKENS: Record<string, string> = {
  __skin__: "my-skin",
  __Skin__: "MySkin",
  __Section__: "My Skin",
  __SKIN_CONST__: "MY_SKIN",
  __card_type__: "dashhaus-my-skin",
};

/** A template's path or text with the placeholders filled. */
export function fill(text: string): string {
  return Object.entries(TOKENS).reduce((source, [token, value]) => source.replaceAll(token, value), text);
}
