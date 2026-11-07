/** One skin's own Marketplace repository (scripts/skin-repositories.js). */
export interface SkinRepository {
  skin: "orb" | "field";
  name: string;
  icon: string;
  description: string;
  repository: string;
  package: string;
  page: string;
}

export const OWNER: string;
export const SKIN_REPOSITORIES: SkinRepository[];
export const SITE: string;
export function assetName(entry: Pick<SkinRepository, "repository">): string;
export function pageUrl(entry: Pick<SkinRepository, "page">): string;
export function repositoryUrl(entry: Pick<SkinRepository, "repository">): string;
export function myLink(entry: Pick<SkinRepository, "repository">): string;
