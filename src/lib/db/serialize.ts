/**
 * Helpers for serializing between the SQLite-friendly `tagsJson` (string)
 * column and the array view used by application code.
 */

export function parseTags(tagsJson: string | null | undefined): string[] {
  if (!tagsJson) return [];
  try {
    const parsed = JSON.parse(tagsJson);
    return Array.isArray(parsed) ? parsed.filter((t) => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function serializeTags(tags: string[]): string {
  return JSON.stringify(tags ?? []);
}
