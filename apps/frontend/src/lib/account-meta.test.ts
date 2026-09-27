import { describe, expect, it } from "vitest";

import { getBrokerSyncFromMeta, getOriginLabel, type BrokerSyncMarker } from "./account-meta";

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

  it("parses v2 fields (through/origin/originDetail)", () => {
    const meta = JSON.stringify({ brokerSync: {
      source: "caitong", at: "2026-09-25T23:03:52.267Z", status: "CLEAN",
      through: "2026-09-14", origin: "pdf_watch_folder", originDetail: "财通对账单 PDF",
    } });
    expect(getBrokerSyncFromMeta(meta)).toEqual({
      at: "2026-09-25T23:03:52.267Z", source: "caitong", status: "CLEAN",
      through: "2026-09-14", origin: "pdf_watch_folder", originDetail: "财通对账单 PDF",
    });
  });

  it("v1 markers parse unchanged (new fields undefined)", () => {
    const meta = JSON.stringify({ brokerSync: { source: "caitong", at: "2026-09-19T07:00:12.345Z", status: "APPLIED" } });
    const m = getBrokerSyncFromMeta(meta)!;
    expect(m.through).toBeUndefined();
    expect(m.origin).toBeUndefined();
    expect(m.originDetail).toBeUndefined();
  });

  it("malformed through is dropped, not passed through", () => {
    const meta = JSON.stringify({ brokerSync: { at: "2026-09-19T07:00:12.345Z", through: "20260914" } });
    expect(getBrokerSyncFromMeta(meta)!.through).toBeUndefined();
  });
});

describe("getOriginLabel", () => {
  const t = (key: string) => `[${key}]`;
  const marker = (fields: Partial<BrokerSyncMarker>) => ({ at: "2026-09-25T23:03:52.267Z", ...fields });

  it("known vocabulary kinds resolve through t with the right i18n key", () => {
    expect(getOriginLabel(marker({ origin: "openapi_statements" }), t)).toBe(
      "[account:origin_openapi_statements]",
    );
    expect(getOriginLabel(marker({ origin: "flex_query" }), t)).toBe("[account:origin_flex_query]");
    expect(getOriginLabel(marker({ origin: "pdf_watch_folder" }), t)).toBe(
      "[account:origin_pdf_watch_folder]",
    );
    expect(getOriginLabel(marker({ origin: "gmail_statements" }), t)).toBe(
      "[account:origin_gmail_statements]",
    );
  });

  it("known kind wins over detail (detail is the fallback, never an override)", () => {
    expect(
      getOriginLabel(marker({ origin: "pdf_watch_folder", originDetail: "财通对账单 PDF" }), t),
    ).toBe("[account:origin_pdf_watch_folder]");
  });

  it("unknown kind + detail → the engine-authored detail", () => {
    expect(getOriginLabel(marker({ origin: "some_new_kind", originDetail: "财通对账单 PDF" }), t)).toBe(
      "财通对账单 PDF",
    );
  });

  it("unknown kind + no detail → the raw kind, verbatim", () => {
    expect(getOriginLabel(marker({ origin: "some_new_kind" }), t)).toBe("some_new_kind");
  });

  it("marker without origin/originDetail → null (no origin line)", () => {
    expect(getOriginLabel(marker({}), t)).toBeNull();
  });
});
