/**
 * Bilingual (Hebrew/English) search normalisation and scoring.
 * Handles niqqud, geresh/gershayim variants (ג'/ג׳/ג), final letters, punctuation and case.
 */

const NIQQUD = /[֑-ׇ]/g;
const FINALS: Record<string, string> = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };

export function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(NIQQUD, "")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[׳'`´’״"]/g, "") // geresh / gershayim / quotes: ג׳ימני = ג'ימני = גימני
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
    .replace(/[-_/.,()*+]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Strips separators fully, for compact comparison ("d-max" ~ "dmax", "4 x 4" ~ "4x4"). */
export function compact(input: string): string {
  return normalize(input).replace(/[\s\-_/.]/g, "");
}

export type Searchable = { terms: (string | null | undefined)[] };

/**
 * Scores how well `query` matches a set of terms. 0 = no match.
 * Every query token must match some term (AND semantics) so "רנגלר רוביקון" narrows results.
 */
export function scoreMatch(query: string, terms: (string | null | undefined)[]): number {
  const q = normalize(query);
  if (!q) return 1;
  const tokens = q.split(" ").filter(Boolean);
  const normTerms = terms.filter((t): t is string => !!t).map((t) => normalize(t));
  const compactTerms = normTerms.map((t) => t.replace(/\s/g, ""));
  let score = 0;
  for (const tok of tokens) {
    let best = 0;
    const ctok = tok.replace(/\s/g, "");
    for (let i = 0; i < normTerms.length; i++) {
      const t = normTerms[i];
      const words = t.split(" ");
      if (t === tok || compactTerms[i] === ctok) best = Math.max(best, 10);
      else if (words.some((w) => w === tok)) best = Math.max(best, 8);
      else if (words.some((w) => w.startsWith(tok))) best = Math.max(best, 6);
      else if (tok.length >= 2 && (t.includes(tok) || compactTerms[i].includes(ctok))) best = Math.max(best, 4);
    }
    if (best === 0) return 0;
    score += best;
  }
  return score;
}

export function searchItems<T>(items: T[], query: string, getTerms: (item: T) => (string | null | undefined)[]): T[] {
  if (!normalize(query)) return items;
  return items
    .map((item) => ({ item, s: scoreMatch(query, getTerms(item)) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.item);
}
