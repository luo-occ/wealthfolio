/**
 * Readers for the cc pipeline's account meta bag (cc fork).
 *
 * The statement engine stamps freshness markers onto `accounts.meta` (see
 * docs/BROKER-SYNC-INDICATOR-DEV-DESIGN.md in cc-dashboard); these helpers
 * parse them for the UI. All readers are tolerant: absent, unparseable or
 * shape-mismatched meta yields null/default — manual accounts are unaffected.
 */

export interface BrokerSyncMarker {
  /** cc-dashboard statement-source id that ran (e.g. "caitong"). */
  source?: string;
  /** ISO timestamp of the last completed engine run. */
  at: string;
  /** Engine run status (CLEAN | APPLIED | GATE_FAILED | DEFECT | FAILED). */
  status?: string;
  /** Ingest frontier (ISO YYYY-MM-DD) — "latest data" the ledger is built through. */
  through?: string;
  /** Data-mechanism vocabulary key (marker v2). */
  origin?: string;
  originDetail?: string;
}

export function getBrokerSyncFromMeta(meta?: string | null): BrokerSyncMarker | null {
  if (!meta) return null;
  try {
    const parsed = JSON.parse(meta) as { brokerSync?: Record<string, unknown> };
    const marker = parsed.brokerSync;
    if (!marker || typeof marker !== "object") return null;
    const at = marker.at;
    if (typeof at !== "string" || at === "") return null;
    return {
      at,
      source: typeof marker.source === "string" ? marker.source : undefined,
      status: typeof marker.status === "string" ? marker.status : undefined,
      through:
        typeof marker.through === "string" && /^\d{4}-\d{2}-\d{2}$/.test(marker.through)
          ? marker.through
          : undefined,
      origin: typeof marker.origin === "string" ? marker.origin : undefined,
      originDetail: typeof marker.originDetail === "string" ? marker.originDetail : undefined,
    };
  } catch {
    return null;
  }
}

/** Marker v2 origin label: localized label for a known vocabulary kind,
 * else the engine-authored detail, else the raw kind. Unknown kinds
 * surface verbatim rather than disappearing. */
export function getOriginLabel(
  marker: BrokerSyncMarker,
  t: (key: string, params?: Record<string, unknown>) => string,
): string | null {
  // channel names are technical phrases (not prose) — they interpolate into
  // the ONE localized template instead of one i18n key per kind
  const CHANNELS: Record<string, string> = {
    openapi_statements: "broker OpenAPI statements",
    flex_query: "IBKR Flex query",
    pdf_watch_folder: "statement PDFs (owner-dropped)",
    gmail_statements: "statement emails (Gmail)",
  };
  if (marker.origin && CHANNELS[marker.origin]) {
    return t("account:origin_source", { source: CHANNELS[marker.origin] });
  }
  return marker.originDetail ?? marker.origin ?? null;
}
