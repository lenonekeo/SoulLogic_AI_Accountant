import Fuse from "fuse.js";

interface MatchCandidate {
  id: string;
  name: string;
}

// ── Fuzzy match a name against a list of candidates using Fuse.js ──
export function fuzzyMatch(
  query: string,
  candidates: MatchCandidate[],
  threshold = 0.4
): MatchCandidate | null {
  if (!query || candidates.length === 0) return null;

  const fuse = new Fuse(candidates, {
    keys: ["name"],
    threshold, // 0.0 = exact match, 1.0 = match anything
    includeScore: true,
  });

  const results = fuse.search(query);

  if (results.length === 0) return null;

  const best = results[0];
  if (!best.score || best.score > threshold) return null;

  return best.item;
}

// ── Fuzzy match returning multiple results with scores ──
export function fuzzyMatchAll(
  query: string,
  candidates: MatchCandidate[],
  limit = 5,
  threshold = 0.4
): Array<MatchCandidate & { score: number }> {
  if (!query || candidates.length === 0) return [];

  const fuse = new Fuse(candidates, {
    keys: ["name"],
    threshold,
    includeScore: true,
  });

  const results = fuse.search(query, { limit });
  return results
    .filter((r) => r.score !== undefined && r.score <= threshold)
    .map((r) => ({ ...r.item, score: r.score! }));
}
