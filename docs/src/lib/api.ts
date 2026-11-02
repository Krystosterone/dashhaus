/**
 * The API lists on the site, read from the packages' TypeScript at build time: a type's members with their types and
 * doc comments, and a function's signature. Nothing here is written by hand, so a renamed option or a changed return
 * type changes the page, and a name that no longer exists fails the build.
 *
 * The program is the one `npm run typecheck` checks for the site's examples (`docs/examples/tsconfig.json`), plus the
 * entries named below, so the site and the examples resolve every `@dashhaus/*` specifier the same way.
 */
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import ts from "typescript";

/** The module specifiers a page may read from. `./api-types` is the examples' own file of named helper types. */
const ENTRIES = [
  "@dashhaus/core",
  "@dashhaus/core/entities",
  ...["light", "climate", "cover", "toggle", "humidifier", "sound", "alarm", "sensor", "weather", "owlet", "lock"].map((kind) => `@dashhaus/core/entities/${kind}/types`),
  "@dashhaus/core/hooks",
  "@dashhaus/core/primitives",
  "@dashhaus/core/testing",
  "@dashhaus/core/demo",
  "@dashhaus/core/websocket",
  "@dashhaus/dashboard/skin",
  "@dashhaus/dashboard/card",
  "@dashhaus/dashboard/schema",
  "@dashhaus/dashboard/layout",
  "@dashhaus/deploy/config",
  "@dashhaus/orb",
  "@dashhaus/field",
];

export interface Member {
  name: string;
  optional: boolean;
  type: string;
  doc: string;
}

export interface Signature {
  name: string;
  text: string;
  doc: string;
}

/** `docs/` whether the build runs there (`npm run build -w docs`) or at the repository root. */
function docsRoot(): string {
  const cwd = process.cwd();
  if (existsSync(join(cwd, "examples", "tsconfig.json"))) return cwd;
  if (existsSync(join(cwd, "docs", "examples", "tsconfig.json"))) return join(cwd, "docs");
  throw new Error(`api: no examples/tsconfig.json under ${cwd}`);
}

interface Loaded {
  checker: ts.TypeChecker;
  modules: Map<string, ts.Symbol>;
}

let loaded: Loaded | undefined;

function load(): Loaded {
  if (loaded) return loaded;
  const examples = join(docsRoot(), "examples");
  const configFile = join(examples, "tsconfig.json");
  const parsed = ts.getParsedCommandLineOfConfigFile(configFile, {}, {
    ...ts.sys,
    onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
      throw new Error(ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"));
    },
  });
  if (!parsed) throw new Error(`api: could not read ${configFile}`);
  const from = join(examples, "index.ts");
  const files = new Map<string, string>();
  for (const specifier of [...ENTRIES, "./api-types"]) {
    const resolved = ts.resolveModuleName(specifier, from, parsed.options, ts.sys).resolvedModule;
    if (!resolved) throw new Error(`api: ${specifier} does not resolve from docs/examples`);
    files.set(specifier, resolve(resolved.resolvedFileName));
  }
  const program = ts.createProgram({ rootNames: [...parsed.fileNames, ...files.values()], options: parsed.options });
  const checker = program.getTypeChecker();
  const modules = new Map<string, ts.Symbol>();
  for (const [specifier, file] of files) {
    const source = program.getSourceFile(file);
    const symbol = source && checker.getSymbolAtLocation(source);
    if (!symbol) throw new Error(`api: ${specifier} (${file}) has no module symbol`);
    modules.set(specifier, symbol);
  }
  loaded = { checker, modules };
  return loaded;
}

function exported(from: string, name: string): { checker: ts.TypeChecker; symbol: ts.Symbol } {
  const { checker, modules } = load();
  const module = modules.get(from);
  if (!module) throw new Error(`api: "${from}" is not one of the entries in docs/src/lib/api.ts`);
  const found = checker.getExportsOfModule(module).find((symbol) => symbol.name === name);
  if (!found) throw new Error(`api: ${from} exports no ${name}`);
  const symbol = found.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(found) : found;
  return { checker, symbol };
}

const FORMAT = ts.TypeFormatFlags.NoTruncation | ts.TypeFormatFlags.UseAliasDefinedOutsideCurrentScope;

function docOf(checker: ts.TypeChecker, symbol: ts.Symbol): string {
  return ts.displayPartsToString(symbol.getDocumentationComment(checker)).replace(/\s+/g, " ").trim();
}

/** The members of an exported interface or type alias, in declaration order (own members before inherited ones). */
export function members(from: string, name: string, { only, omit }: { only?: string[]; omit?: string[] } = {}): Member[] {
  const { checker, symbol } = exported(from, name);
  const type = checker.getDeclaredTypeOfSymbol(symbol);
  const all = checker.getPropertiesOfType(type).map((property): Member => {
    const declaration = property.valueDeclaration ?? property.declarations?.[0];
    const optional = (property.flags & ts.SymbolFlags.Optional) !== 0;
    let text = declaration
      ? checker.typeToString(checker.getTypeOfSymbolAtLocation(property, declaration), undefined, FORMAT)
      : checker.typeToString(checker.getTypeOfSymbol(property), undefined, FORMAT);
    if (optional) text = text.replace(/ \| undefined$/, "").replace(/^undefined \| /, "");
    // An optional function prints as `((x) => void) | undefined`; without the undefined, the parentheses are noise.
    text = text.replace(/^\((\(.*\) => .*)\)$/, "$1");
    return { name: property.name, optional, type: text, doc: docOf(checker, property) };
  });
  for (const wanted of [...(only ?? []), ...(omit ?? [])]) {
    if (!all.some((member) => member.name === wanted)) throw new Error(`api: ${from} ${name} has no member ${wanted}`);
  }
  return all.filter((member) => (!only || only.includes(member.name)) && !omit?.includes(member.name));
}

/** An inferred return type; an object too long to read in one line is named by its keys (`{ value, rootProps, … }`). */
function inferred(checker: ts.TypeChecker, type: ts.Type): string {
  const text = checker.typeToString(type, undefined, FORMAT);
  if (text.length <= 100) return text;
  const keys = checker.getPropertiesOfType(type).map((property) => property.name);
  if (keys.length === 0) return text;
  return `{ ${keys.slice(0, 8).join(", ")}${keys.length > 8 ? ", …" : ""} }`;
}

/** An exported function's signature as a reader would write the call: `useHaLight(entityId: string, options?: HaLightOptions): HaLightResult`. */
export function signature(from: string, name: string): Signature {
  const { checker, symbol } = exported(from, name);
  const declaration = symbol.declarations?.find(ts.isFunctionDeclaration);
  if (!declaration) throw new Error(`api: ${from} ${name} is not a function declaration`);
  const generics = declaration.typeParameters?.length ? `<${declaration.typeParameters.map((parameter) => parameter.getText()).join(", ")}>` : "";
  const parameters = declaration.parameters.map((parameter, index) => {
    const label = ts.isIdentifier(parameter.name) ? parameter.name.text : index === declaration.parameters.length - 1 ? "options" : `arg${index}`;
    const optional = parameter.questionToken != null || parameter.initializer != null;
    const type = parameter.type
      ? parameter.type.getText()
      : checker.typeToString(checker.getTypeAtLocation(parameter), undefined, FORMAT);
    return `${label}${optional ? "?" : ""}: ${type}`;
  });
  const signatureType = checker.getSignatureFromDeclaration(declaration);
  const returns = declaration.type ? declaration.type.getText() : signatureType ? inferred(checker, signatureType.getReturnType()) : "void";
  return { name, text: `${name}${generics}(${parameters.join(", ")}): ${returns}`, doc: docOf(checker, symbol) };
}

/** Where the examples live, for the components that read them. */
export const examplesDir = () => join(docsRoot(), "examples");
export const repoRoot = () => dirname(docsRoot());
