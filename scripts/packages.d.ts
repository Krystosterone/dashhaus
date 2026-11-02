/** Types for scripts/packages.js, the generators' one package map. */
export const root: string;
export const workspaces: string[];

export interface PackageEntry {
  dir: string;
  name: string;
  exports: Record<string, string>;
}

export const packages: Record<"core" | "dashboard" | "deploy", PackageEntry>;
export function packageFile(packageName: keyof typeof packages, path?: string): string;
export function packageSpecifier(packageName: keyof typeof packages, subpath?: string): string;

/** The templates every skin starts from, owned by the scaffolder; each folder is laid out from a skin's root. */
export const skinTemplates: { package: string; writer: string; skin: string; card: string };
export const referenceSkins: Record<"orb" | "field", { dir: string }>;

export const generated: {
  workspace: string;
  exports: Record<string, string>;
  files: {
    manifest: string;
    entry: string;
    tokens: string;
    lovelaceCard: string;
    registry: string;
    storybook: string;
  };
  dir(skin: string): string;
  name(skin: string): string;
  file(skin: string, path?: string): string;
  specifier(skin: string, subpath?: string): string;
};

export function skinDir(skin: string): string;

/** The toolbar global a study's stories are drawn with in the site's light and dark look. */
export interface StudyTheme {
  global: string;
  light: string;
  dark: string;
}

export interface StudyMarker {
  study: { theme: StudyTheme };
}

export const studies: {
  group: "Studies";
  section(Section: string): string;
  marker(theme: StudyTheme): StudyMarker;
  is(manifest: unknown): boolean;
  designDoc(skin: string): string;
  record(skin: string): string;
  captures(skin: string): string;
};

export function storySection(storybookSource: string): string | undefined;

export function generatedManifest(skin: string, options?: { study?: boolean; Section?: string; theme?: StudyTheme }): {
  name: string;
  version: string;
  description?: string;
  private: boolean;
  type: "module";
  sideEffects: string[];
  exports: Record<string, string>;
  dependencies: Record<string, string>;
  peerDependencies: Record<string, string>;
  dashhaus?: StudyMarker;
};

export const seams: {
  preview: string;
  lovelaceEntry: string;
  generatedSkins: string;
  agents: string;
  cardsDoc: string;
  deployDoc: string;
  fieldDoc: string;
  skinDoc(skin: string): string;
  orb: { config: string; renderer: string; auto: string; rulebook: string };
  field: { config: string; dashboard: string };
};

export const markers: Record<string, string>;
