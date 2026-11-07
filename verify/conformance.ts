/**
 * What the repo's conformance tests read the skins' source and docs with, outside every skin; only tests import it.
 * The generic card checks live in `@dashhaus/core/lovelace/conformance`; these are the repo's own readers and the rule
 * that keeps a card's presentation away from the Home Assistant slice.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import ts from "typescript";

export const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
export const exists = (path: string) => existsSync(join(process.cwd(), path));
export const uncomment = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, "");

/** The body of a top-level `const <name> … = { … };` object in a source file. */
export const object = (source: string, name: string) => source.match(new RegExp(`const ${name}\\b[^{]*\\{([\\s\\S]*?)\\n\\};`))?.[1] ?? "";

/**
 * A card's presentation never reaches the Home Assistant slice: the store entry, its websocket, demo, testing or
 * fixture subpaths, or a skin's connected folder.
 */
export const reachesHa = (specifier: string) =>
  specifier === "@dashhaus/core" ||
  /^@dashhaus\/core\/(?:websocket|demo|testing|fixtures)(?:\/|$)/.test(specifier) ||
  /^(?:\.\.\/)+ha\//.test(specifier);

/* ---------- A card extends a shared part only generically (spec/skins.md → Rules every skin keeps) ----------
   A part's prop that one card alone passes is drawn in the skin's Foundations → Parts story, or it is the card's own.
   These read the parts' props with the type checker and the elements each source draws with the parser, so a prop is
   counted on the part it is passed to, never on another that happens to take the same name. */

/** Where a source's files are read from: the repository, or a test's own sources by path. */
export type Sources = (path: string) => string | undefined;
const fromDisk: Sources = (path) => (exists(path) ? read(path) : undefined);

/** One element a component draws: its tag, the attributes written on it, and whether it spreads props into it. */
interface Drawn { tag: string; attrs: string[]; spread: boolean }

/** The elements each top-level component of a TSX source draws, by its name; what is drawn outside one is under "". */
function drawings(source: string): Map<string, Drawn[]> {
  const file = ts.createSourceFile("source.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out = new Map<string, Drawn[]>();
  const visit = (node: ts.Node, owner: string) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const props = node.attributes.properties;
      if (!out.has(owner)) out.set(owner, []);
      out.get(owner)!.push({
        tag: node.tagName.getText(file),
        attrs: props.filter(ts.isJsxAttribute).map((a) => a.name.getText(file)),
        spread: props.some(ts.isJsxSpreadAttribute),
      });
    }
    ts.forEachChild(node, (child) => visit(child, owner));
  };
  for (const statement of file.statements) {
    const declared = ts.isFunctionDeclaration(statement) ? statement.name
      : ts.isVariableStatement(statement) ? statement.declarationList.declarations[0]?.name : undefined;
    const name = declared && ts.isIdentifier(declared) && /^[A-Z]/.test(declared.text) ? declared.text : "";
    visit(statement, name);
  }
  return out;
}

/** The names a source imports from a relative module, each with that module's path. */
function relativeImports(source: string, from: string, sources: Sources): Map<string, string> {
  const file = ts.createSourceFile("source.tsx", source, ts.ScriptTarget.Latest, false, ts.ScriptKind.TSX);
  const out = new Map<string, string>();
  for (const statement of file.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;
    const named = statement.importClause?.namedBindings;
    if (!specifier.startsWith(".") || !named || !ts.isNamedImports(named)) continue;
    const base = join(dirname(from), specifier);
    const path = [".tsx", ".ts", "/index.tsx", "/index.ts"].map((ext) => base + ext).find((p) => sources(p) != null);
    if (path) for (const element of named.elements) out.set(element.name.text, path);
  }
  return out;
}

/**
 * Each exported component's optional props in a parts file, from its props type as the type checker reads it
 * (inherited and picked props included): what a card may add to it. A required prop is the part itself, not an
 * extension, and a `data-*` attribute is passed through by the part's index signature, so neither is listed.
 */
export function optionalProps(path: string, sources: Sources = fromDisk): Map<string, string[]> {
  const text = sources(path) ?? "";
  const options: ts.CompilerOptions = { noResolve: true, noEmit: true, jsx: ts.JsxEmit.Preserve, target: ts.ScriptTarget.ES2022, lib: ["lib.es2022.d.ts"], types: [] };
  const host = ts.createCompilerHost(options);
  const own = join(process.cwd(), path);
  const getSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (name, version, ...rest) => (name === own ? ts.createSourceFile(name, text, version, true, ts.ScriptKind.TSX) : getSourceFile(name, version, ...rest));
  const program = ts.createProgram({ rootNames: [own], options, host });
  const checker = program.getTypeChecker();
  const out = new Map<string, string[]>();
  for (const statement of program.getSourceFile(own)?.statements ?? []) {
    if (!ts.isFunctionDeclaration(statement) || !statement.name || !/^[A-Z]/.test(statement.name.text)) continue;
    if (!(ts.getCombinedModifierFlags(statement) & ts.ModifierFlags.Export)) continue;
    const param = statement.parameters[0];
    if (!param) continue;
    const props = checker.getPropertiesOfType(checker.getTypeAtLocation(param));
    out.set(statement.name.text, props.filter((p) => p.flags & ts.SymbolFlags.Optional).map((p) => p.name));
  }
  return out;
}

/** Every file under a directory of the repository, by its path from the root. */
const files = (dir: string): string[] => {
  const abs = join(process.cwd(), dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs).flatMap((name) => (statSync(join(abs, name)).isDirectory() ? files(join(dir, name)) : [join(dir, name)]));
};

/**
 * What a Parts story draws on each part: the props it writes on the part, on a component of its own that spreads its
 * props into the part (Field's `Frame`), and on the parts inside the card components it draws from `cards/` (the
 * tracks with each card's own fill), followed through the components they draw.
 */
function shownOn(story: string, parts: Set<string>, sources: Sources): Map<string, Set<string>> {
  const shown = new Map<string, Set<string>>();
  const show = (part: string, attrs: string[]) => {
    if (!shown.has(part)) shown.set(part, new Set());
    for (const attr of attrs) shown.get(part)!.add(attr);
  };
  const seen = new Set<string>();
  const follow = (path: string, component?: string) => {
    if (seen.has(`${path}#${component ?? ""}`)) return;
    seen.add(`${path}#${component ?? ""}`);
    const source = sources(path) ?? "";
    const drawn = drawings(source);
    const imported = relativeImports(source, path, sources);
    /** The part a component of this source spreads its props into, if one. */
    const spreads = (name: string, at: string) => (at === path ? drawn : drawings(sources(at) ?? "")).get(name)?.find((el) => el.spread && parts.has(el.tag))?.tag;
    for (const el of component == null ? [...drawn.values()].flat() : drawn.get(component) ?? []) {
      if (parts.has(el.tag)) { show(el.tag, el.attrs); continue; }
      const at = drawn.has(el.tag) ? path : imported.get(el.tag);
      if (!at || (at !== path && !/\/cards\//.test(at))) continue;
      const alias = spreads(el.tag, at);
      if (alias) show(alias, el.attrs);
      follow(at, el.tag);
    }
  };
  follow(story);
  return shown;
}

/**
 * spec/skins.md → A card extends a shared part only generically: every optional prop of a part in `<skin>/shared/ui.tsx`
 * (or of the `parts` named) that one card folder alone passes and `<skin>/stories/Parts.stories.tsx` never draws, as
 * `<Part prop> (card)`. A card's own files count, not its stories, tests or demo seeds; `cards` names them instead, for
 * sources that aren't the repository's.
 */
export function undrawnProps(skin: string, { parts, cards, sources = fromDisk }: { parts?: string[]; cards?: Record<string, string[]>; sources?: Sources } = {}): string[] {
  const declared = optionalProps(`${skin}/shared/ui.tsx`, sources);
  const names = new Set(parts ?? declared.keys());
  const byCard = cards ?? Object.fromEntries(readdirSync(join(process.cwd(), skin, "cards"))
    .filter((card) => statSync(join(process.cwd(), skin, "cards", card)).isDirectory())
    .map((card) => [card, files(`${skin}/cards/${card}`).filter((p) => p.endsWith(".tsx") && !/\.(stories|test)\.tsx$/.test(p) && !p.includes("/demo/"))]));
  const passed = new Map<string, Set<string>>();
  for (const [card, paths] of Object.entries(byCard)) {
    for (const el of paths.flatMap((path) => [...drawings(sources(path) ?? "").values()].flat())) {
      if (!names.has(el.tag)) continue;
      for (const attr of el.attrs) {
        const key = `${el.tag} ${attr}`;
        if (!passed.has(key)) passed.set(key, new Set());
        passed.get(key)!.add(card);
      }
    }
  }
  const shown = shownOn(`${skin}/stories/Parts.stories.tsx`, names, sources);
  return [...names].flatMap((part) => (declared.get(part) ?? [])
    .filter((prop) => passed.get(`${part} ${prop}`)?.size === 1 && !shown.get(part)?.has(prop))
    .map((prop) => `<${part} ${prop}> (${[...passed.get(`${part} ${prop}`)!][0]})`));
}
