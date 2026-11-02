/** One shared domain, as a skin's card generator sees it (scripts/domains.js). */
export interface DomainDescription {
  name: string;
  Name: string;
  CONST: string;
  words: string;
  Label: string;
  domains: string[];
  id?: string;
  kind: "control" | "reading";
  actions: string[];
  summary: string;
  options: string[];
  fixtureId: string;
}
export function describeDomain(name: string): DomainDescription;
export function describeDomains(): Record<string, DomainDescription>;
/** The scaffolder's copy of every description, relative to the repo. */
export const domainsFile: string;
export function domainsJson(): string;
