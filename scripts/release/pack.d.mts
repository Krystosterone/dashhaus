// The pack command is JavaScript so the build runs without type stripping.

export interface PackedPackage {
  package: string;
  version: string;
  tarball: string;
  size: number;
}

export function pack(outDir?: string, buildRoot?: string): Promise<PackedPackage[]>;
