/**
 * A stylesheet imported for its side effect. Vite folds it into the build; TypeScript needs the module's name to
 * resolve, as `noUncheckedSideEffectImports` (on since TypeScript 6) refuses an import it has no declaration for.
 */
declare module "*.css";
