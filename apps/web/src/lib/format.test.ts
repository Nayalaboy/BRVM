import { describe, expect, it } from "vitest";
import {
  formatCompactFCFA,
  formatFCFA,
  formatNumber,
  formatPercent,
  NNBSP,
} from "./format";

describe("formatFCFA", () => {
  it("formats with French thousands separators", () => {
    expect(formatFCFA(1_250_000)).toBe(`1${NNBSP}250${NNBSP}000${NNBSP}FCFA`);
  });

  it("formats small amounts", () => {
    expect(formatFCFA(950)).toBe(`950${NNBSP}FCFA`);
  });

  it("supports decimals with a French comma", () => {
    expect(formatFCFA(1546.5, 2)).toBe(`1${NNBSP}546,5${NNBSP}FCFA`);
  });
});

describe("formatNumber", () => {
  it("groups thousands", () => {
    expect(formatNumber(100_000_000)).toBe(`100${NNBSP}000${NNBSP}000`);
  });
});

describe("formatCompactFCFA", () => {
  it("uses millions", () => {
    expect(formatCompactFCFA(12_500_000)).toBe(`12,5${NNBSP}M${NNBSP}FCFA`);
  });
  it("uses billions", () => {
    expect(formatCompactFCFA(3_200_000_000)).toBe(`3,2${NNBSP}Md${NNBSP}FCFA`);
  });
  it("falls back to plain FCFA below one million", () => {
    expect(formatCompactFCFA(950_000)).toBe(`950${NNBSP}000${NNBSP}FCFA`);
  });
});

describe("formatPercent", () => {
  it("formats a ratio with a French comma", () => {
    expect(formatPercent(0.064)).toBe(`6,4${NNBSP}%`);
  });
});
