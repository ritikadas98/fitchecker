/**
 * Brace-counting JSON extractor for hydration-data globals.
 *
 * Indian fashion retailers (Myntra, Ajio, and likely H&M) hydrate their SPAs
 * by writing large JS object literals into inline <script> tags:
 *
 *     window.__myx = {...big object...};                 (Myntra)
 *     window.__PRELOADED_STATE__ = {...big object...};   (Ajio)
 *
 * `JSON.parse` can't handle these directly because the surrounding script
 * is JavaScript, not JSON — and the object can contain escaped quotes,
 * backslashes, and braces inside string values. So we walk the source
 * character-by-character starting at the first `{` after the assignment
 * marker, tracking string boundaries (with escape support) and brace
 * depth. When depth returns to zero we have the complete object literal,
 * which (by retailer convention) is also valid JSON.
 *
 * Returns the JSON substring on success, or null if no marker is found
 * or the braces never close (truncated/malformed page).
 */

export function extractAssignedJson(text: string, markers: string[]): string | null {
  // Find the earliest occurrence of any marker. Some retailers write
  // multiple variants ("window.__x = " vs "window.__x="), and the first
  // one wins. Scanning all markers per call is cheap; the script bodies
  // we run against are large but the marker strings are short.
  let startIdx = -1;
  let markerLen = 0;
  for (const c of markers) {
    const i = text.indexOf(c);
    if (i !== -1 && (startIdx === -1 || i < startIdx)) {
      startIdx = i;
      markerLen = c.length;
    }
  }
  if (startIdx === -1) return null;

  const jsonStart = startIdx + markerLen;
  // The marker should be immediately followed by '{'. If we don't see one
  // we're looking at something else (a different assignment, a string,
  // etc.) — bail out rather than guessing.
  if (text[jsonStart] !== "{") return null;

  // Walk the source character-by-character. Track:
  //   - escape: true if we just saw a backslash inside a string (next
  //     char is consumed verbatim — handles \" \\ \n etc.)
  //   - inString: true between unescaped " quotes (braces inside
  //     strings must NOT count toward depth)
  //   - depth: current nesting level. We start at 0, see the opening
  //     `{` to go to 1, and return when we close back to 0.
  let depth = 0;
  let inString = false;
  let escape = false;
  for (let i = jsonStart; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === "\\") { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.substring(jsonStart, i + 1);
    }
  }
  // Reached end of text with unclosed braces — page truncated, or marker
  // pointed at non-object content.
  return null;
}

/**
 * Find a hydration JSON across all <script> tags in a document. Tries
 * each script body in DOM order and returns the first match.
 */
export function findHydrationJson(doc: Document, markers: string[]): string | null {
  const scripts = Array.from(doc.querySelectorAll("script"));
  for (const s of scripts) {
    const text = s.textContent ?? "";
    const found = extractAssignedJson(text, markers);
    if (found) return found;
  }
  return null;
}
