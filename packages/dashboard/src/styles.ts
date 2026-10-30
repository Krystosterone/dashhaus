/**
 * Move document-level token rules onto the card's shadow host. tokens.css themes `:root` and its
 * `data-theme` attribute; inside Lovelace the card lives in a shadow root, so the same rules have to
 * target `:host` and read `data-theme` from the host element. Runs on the built CSS, where the minifier
 * may have dropped the attribute's quotes.
 */
export function scopeToHost(css: string): string {
  return css
    .replace(/:root:not\(([^)]*)\)/g, ":host(:not($1))")
    .replace(/:root((?:\[[^\]]*\])+)/g, ":host($1)")
    .replace(/:root\b/g, ":host");
}
