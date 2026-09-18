/**
 * Account-level position-panel display config (cc fork).
 *
 * Stored on the account's free-form `meta` JSON bag under `display`:
 *   { "display": { "positionTitle": "name", "positionSubtitle": "symbol" } }
 * Absent or invalid → the upstream rendering (title = symbol, subtitle = name).
 * The pair is kept complementary: flipping one field flips the other, so a
 * row never renders the same text twice.
 */

export type PositionLabelField = "symbol" | "name";

export interface PositionDisplayConfig {
  positionTitle: PositionLabelField;
  positionSubtitle: PositionLabelField;
}

export const DEFAULT_POSITION_DISPLAY: PositionDisplayConfig = {
  positionTitle: "symbol",
  positionSubtitle: "name",
};

function asField(value: unknown, fallback: PositionLabelField): PositionLabelField {
  return value === "symbol" || value === "name" ? value : fallback;
}

export function getPositionDisplayFromMeta(meta?: string | null): PositionDisplayConfig {
  if (!meta) return DEFAULT_POSITION_DISPLAY;
  try {
    const parsed = JSON.parse(meta) as { display?: { positionTitle?: unknown; positionSubtitle?: unknown } };
    const display = parsed.display;
    if (!display || typeof display !== "object") return DEFAULT_POSITION_DISPLAY;
    return {
      positionTitle: asField(display.positionTitle, DEFAULT_POSITION_DISPLAY.positionTitle),
      positionSubtitle: asField(display.positionSubtitle, DEFAULT_POSITION_DISPLAY.positionSubtitle),
    };
  } catch {
    return DEFAULT_POSITION_DISPLAY;
  }
}

/** Merge-write the display config into the account meta JSON, preserving all
 *  other meta keys and keeping title/subtitle on different fields. */
export function setPositionDisplayInMeta(
  meta: string | null | undefined,
  patch: Partial<PositionDisplayConfig>,
): string {
  let parsed: Record<string, unknown> = {};
  if (meta) {
    try {
      parsed = JSON.parse(meta) as Record<string, unknown>;
    } catch {
      // unparseable meta: keep only what we write
    }
  }
  const merged = { ...getPositionDisplayFromMeta(meta), ...patch };
  if (merged.positionTitle === merged.positionSubtitle) {
    merged.positionSubtitle = merged.positionTitle === "symbol" ? "name" : "symbol";
  }
  const display = {
    ...(typeof parsed.display === "object" && parsed.display !== null
      ? (parsed.display as Record<string, unknown>)
      : {}),
    positionTitle: merged.positionTitle,
    positionSubtitle: merged.positionSubtitle,
  };
  return JSON.stringify({ ...parsed, display });
}

/** What a position row renders. Falls back to the symbol when the chosen
 *  field has no value (unnamed instruments), and drops a subtitle that would
 *  duplicate the title. Cash and option rows keep their special subtitles at
 *  the call sites — this pair applies to plain securities. */
export function positionLabelPair(
  config: PositionDisplayConfig,
  symbol: string,
  name?: string | null,
): { primary: string; secondary: string | null } {
  const pick = (field: PositionLabelField): string | null =>
    field === "name" ? (name ?? null) : symbol;
  let primary = pick(config.positionTitle);
  let secondary = pick(config.positionSubtitle);
  if (!primary) {
    primary = symbol;
    if (secondary === primary) secondary = null;
  }
  return { primary, secondary: secondary === primary ? null : secondary };
}
