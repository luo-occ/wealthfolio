import { describe, expect, it } from "vitest";

import { getBrokerSyncFromMeta } from "./account-meta";

describe("getBrokerSyncFromMeta", () => {
  it("returns null for absent meta", () => {
    expect(getBrokerSyncFromMeta(undefined)).toBeNull();
    expect(getBrokerSyncFromMeta(null)).toBeNull();
    expect(getBrokerSyncFromMeta("")).toBeNull();
  });

  it("parses a valid marker, tolerating optional fields", () => {
    const meta = JSON.stringify({
      display: { positionTitle: "name", positionSubtitle: "symbol" },
      brokerSync: { source: "caitong", at: "2026-09-19T07:00:12.345Z", status: "APPLIED" },
    });
    expect(getBrokerSyncFromMeta(meta)).toEqual({
      source: "caitong",
      at: "2026-09-19T07:00:12.345Z",
      status: "APPLIED",
    });
    expect(getBrokerSyncFromMeta(JSON.stringify({ brokerSync: { at: "2026-09-19T07:00:12Z" } }))).toEqual({
      at: "2026-09-19T07:00:12Z",
      source: undefined,
      status: undefined,
    });
  });

  it("returns null for unparseable meta or malformed markers", () => {
    expect(getBrokerSyncFromMeta("not json")).toBeNull();
    expect(getBrokerSyncFromMeta(JSON.stringify({ allocation: { cashCategoryId: "X" } }))).toBeNull();
    expect(getBrokerSyncFromMeta(JSON.stringify({ brokerSync: { source: "caitong" } }))).toBeNull(); // no `at`
    expect(getBrokerSyncFromMeta(JSON.stringify({ brokerSync: { at: 42 } }))).toBeNull();
    expect(getBrokerSyncFromMeta(JSON.stringify({ brokerSync: "soon" }))).toBeNull();
  });

  it("passes unknown statuses through (UI renders them uncolored, not crashed)", () => {
    const meta = JSON.stringify({ brokerSync: { at: "2026-09-19T07:00:00Z", status: "SOMETHING_NEW" } });
    expect(getBrokerSyncFromMeta(meta)?.status).toBe("SOMETHING_NEW");
  });
});
