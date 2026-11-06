/** A skin that installs on its own, from a Marketplace (HACS) repository of its own. */
export interface SkinRepository {
  skin: "orb" | "field";
  name: string;
  repository: string;
  page: string;
  icon: string;
  description: string;
}
export const OWNER: string;
export const SKIN_REPOSITORIES: SkinRepository[];
export const SITE: string;
export function assetName(entry: Pick<SkinRepository, "repository">): string;
export function entryPath(entry: Pick<SkinRepository, "skin">): string;
export function pageUrl(entry: Pick<SkinRepository, "page">): string;
export function myLink(entry: Pick<SkinRepository, "repository">): string;
