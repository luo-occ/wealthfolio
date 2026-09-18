import { describe, expect, it } from "vitest";

import {
  DEFAULT_POSITION_DISPLAY,
  getPositionDisplayFromMeta,
  positionLabelPair,
  setPositionDisplayInMeta,
} from "./position-display";

describe("getPositionDisplayFromMeta", () => {
  it("defaults to the upstream rendering on absent meta", () => {
    expect(getPositionDisplayFromMeta(undefined)).toEqual(DEFAULT_POSITION_DISPLAY);
    expect(getPositionDisplayFromMeta(null)).toEqual(DEFAULT_POSITION_DISPLAY);
    expect(getPositionDisplayFromMeta("")).toEqual(DEFAULT_POSITION_DISPLAY);
  });

  it("reads the display bag", () => {
    expect(getPositionDisplayFromMeta(JSON.stringify({ display: { positionTitle: "name", positionSubtitle: "symbol" } }))).toEqual({
      positionTitle: "name",
      positionSubtitle: "symbol",
    });
  });

  it("survives unparseable meta and invalid values", () => {
    expect(getPositionDisplayFromMeta("not json")).toEqual(DEFAULT_POSITION_DISPLAY);
    expect(
      getPositionDisplayFromMeta(JSON.stringify({ display: { positionTitle: "ticker", positionSubtitle: 42 } })),
    ).toEqual(DEFAULT_POSITION_DISPLAY);
    expect(getPositionDisplayFromMeta(JSON.stringify({ allocation: { cashCategoryId: "X" } }))).toEqual(
      DEFAULT_POSITION_DISPLAY,
    );
  });
});

describe("setPositionDisplayInMeta", () => {
  it("merges into existing meta, preserving other keys", () => {
    const meta = JSON.stringify({ allocation: { cashCategoryId: "FIXED_INCOME" }, custom: 1 });
    const updated = setPositionDisplayInMeta(meta, { positionTitle: "name" });
    expect(JSON.parse(updated)).toEqual({
      allocation: { cashCategoryId: "FIXED_INCOME" },
      custom: 1,
      display: { positionTitle: "name", positionSubtitle: "symbol" },
    });
  });

  it("keeps the pair complementary: flipping the title flips the subtitle", () => {
    const meta = setPositionDisplayInMeta(null, { positionTitle: "name" });
    expect(JSON.parse(meta).display).toEqual({ positionTitle: "name", positionSubtitle: "symbol" });
    // demanding title === subtitle collapses back to the complementary pair
    const meta2 = setPositionDisplayInMeta(meta, { positionSubtitle: "name" });
    expect(JSON.parse(meta2).display).toEqual({ positionTitle: "name", positionSubtitle: "symbol" });
  });

  it("round-trips through getPositionDisplayFromMeta", () => {
    const meta = setPositionDisplayInMeta(undefined, { positionTitle: "name", positionSubtitle: "symbol" });
    expect(getPositionDisplayFromMeta(meta)).toEqual({ positionTitle: "name", positionSubtitle: "symbol" });
  });
});

describe("positionLabelPair", () => {
  it("defaults to symbol primary, name secondary", () => {
    expect(positionLabelPair(DEFAULT_POSITION_DISPLAY, "000858", "五粮液")).toEqual({
      primary: "000858",
      secondary: "五粮液",
    });
  });

  it("swaps with the config — the Chinese name replaces the number", () => {
    expect(positionLabelPair({ positionTitle: "name", positionSubtitle: "symbol" }, "000858", "五粮液")).toEqual({
      primary: "五粮液",
      secondary: "000858",
    });
  });

  it("falls back to the symbol when the chosen field has no name", () => {
    expect(positionLabelPair({ positionTitle: "name", positionSubtitle: "symbol" }, "000858", null)).toEqual({
      primary: "000858",
      secondary: null,
    });
  });

  it("never renders the same text twice", () => {
    expect(positionLabelPair(DEFAULT_POSITION_DISPLAY, "000858", null)).toEqual({
      primary: "000858",
      secondary: null,
    });
  });
});
