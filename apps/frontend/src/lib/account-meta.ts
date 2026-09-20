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
    };
  } catch {
    return null;
  }
}
