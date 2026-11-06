export const root: string;
/** One resource into `outDir/<file>`, in a Node process of its own; resolves to the file's path. */
export function buildResourceFile(id: string, outDir: string): Promise<string>;
/** Orb's and Field's resources into their packages' `dist/` under `outRoot`. */
export function buildSkinResources(outRoot?: string): Promise<void>;
