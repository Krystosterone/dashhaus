/** One resource this repository builds (scripts/resources.js). */
export interface Resource {
  /** The skin's id (`orb`). */
  id: string;
  /** The module the build starts from, from the repository's root. */
  entry: string;
  /** The file it writes. */
  file: string;
  /** The package whose version names the build in its console line. */
  version: string;
  /** The skin package that ships it in its `dist/`, beside a `resource.js` naming it. */
  dir?: string;
  /** The Marketplace repository that mirrors it: `Krystosterone/<repository>`. */
  repository?: string;
}

export const SKIN_RESOURCES: Resource[];
export const GENERATED_RESOURCES: Resource[];
export const RESOURCES: Resource[];
export function resource(id: string): Resource;
export const NOTICE: string;
