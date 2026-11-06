/** One Lovelace bundle the build writes: its entry and the file it becomes. */
export interface BundleBuild {
  entry: string;
  file: string;
}
export const root: string;
export const COMBINED: BundleBuild;
export const SKIN_BUNDLES: BundleBuild[];
export function buildBundleFile(outDir: string, bundle?: BundleBuild): Promise<string>;
export function buildSkinFiles(outDir: string): Promise<string[]>;
export function buildBundlePackage(outRoot?: string): Promise<string>;
