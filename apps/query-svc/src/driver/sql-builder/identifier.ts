// Defence-in-depth: Trino identifiers go through a strict whitelist
// before any string interpolation. Anything that isn't a plain ASCII
// identifier is rejected immediately — no backslash escapes, no quotes
// in names, no SQL keywords as identifiers. Catalog/schema/table/col
// all use the same rule.
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

export function quoteIdent(name: string): string {
  if (!IDENT.test(name)) {
    throw new Error(`unsafe identifier: ${JSON.stringify(name)}`);
  }
  return `"${name}"`;
}

export function quoteFqn(parts: string[]): string {
  return parts.map(quoteIdent).join('.');
}
