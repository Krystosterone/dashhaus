import { describe, expect, it } from "vitest";
import { airBand, airFigure, airWord, dysonAir, dysonSeverity, dysonWarning, filtersFact } from "./air";
import { WARNING_WORD_MAX } from "../severity";
import type { DysonEntity } from "./types";

const e = (air: DysonEntity["air"], filters: DysonEntity["filters"] = []) => ({ state: "on" as const, air, filters });

describe("Dyson's air bands", () => {
  it("bands each reading on Dyson's own scale", () => {
    expect(airBand("pm25", 35)).toBe("good");
    expect(airBand("pm25", 36)).toBe("fair");
    expect(airBand("pm25", 62)).toBe("poor");
    expect(airBand("pm25", 71)).toBe("very_poor");
    expect(airBand("voc", 3)).toBe("good");
    expect(airBand("no2", 9)).toBe("very_poor");
    expect(airBand("hcho", 0.12)).toBe("fair");
  });

  it("takes the air overall from its worst reading, the first on a tie, and none without a number", () => {
    expect(dysonAir(e([{ pollutant: "pm25", value: 8 }, { pollutant: "voc", value: 5 }, { pollutant: "no2", value: 4 }]))).toMatchObject({ band: "fair", lead: { pollutant: "voc" } });
    expect(dysonAir(e([{ pollutant: "pm25", value: null }]))).toBeUndefined();
    expect(dysonAir({ ...e([{ pollutant: "pm25", value: 80 }]), state: "unavailable" })).toBeUndefined();
    expect(airWord(dysonAir(e([{ pollutant: "pm25", value: 8 }])))).toBe("Air good");
  });

  it("says a figure as Dyson's app does", () => {
    expect(airFigure({ pollutant: "pm25", value: 7.6 })).toBe("8");
    expect(airFigure({ pollutant: "voc", value: 2.25 })).toBe("2.3");
    expect(airFigure({ pollutant: "hcho", value: 0.031 })).toBe("0.03");
    expect(airFigure({ pollutant: "pm10", value: null })).toBe("—");
  });
});

describe("dysonWarning", () => {
  it("leads with poor air, then a worn filter, advisory, its word inside a row", () => {
    const poor = dysonWarning(e([{ pollutant: "pm25", value: 62, unit: "µg/m³" }], [{ kind: "hepa", percent: 4 }]));
    expect(poor).toEqual({ kind: "air", word: "Poor air", said: "Poor air: Fine particles 62 µg/m³" });
    expect(dysonWarning(e([{ pollutant: "pm25", value: 999 }]))!.word).toBe("Very poor air");
    const filter = dysonWarning(e([{ pollutant: "pm25", value: 8 }], [{ kind: "hepa", percent: 6 }, { kind: "carbon", percent: 4 }]));
    expect(filter).toEqual({ kind: "filter", word: "Change filter", said: "Change filter: HEPA filter at 6%, Carbon filter at 4%" });
    for (const w of [poor, filter, dysonWarning(e([{ pollutant: "no2", value: 10 }]))]) expect(w!.word.length).toBeLessThanOrEqual(WARNING_WORD_MAX);
    expect(dysonSeverity(e([{ pollutant: "pm25", value: 62 }]))).toBe("advisory");
  });

  it("is quiet while the air is fair and the filters have life, or while unavailable", () => {
    expect(dysonWarning(e([{ pollutant: "pm25", value: 41 }], [{ kind: "combined", percent: 38 }, { kind: "hepa", percent: null }]))).toBeUndefined();
    expect(dysonWarning({ state: "unavailable", air: [{ pollutant: "pm25", value: 99 }], filters: [{ kind: "hepa", percent: 0 }] })).toBeUndefined();
    expect(dysonSeverity(e([]))).toBeUndefined();
  });

  it("says each filter's life for the small print", () => {
    expect(filtersFact([{ kind: "hepa", percent: 72 }, { kind: "carbon", percent: 64.4 }, { kind: "combined", percent: null }])).toBe("HEPA filter 72% · Carbon filter 64%");
    expect(filtersFact([])).toBeUndefined();
  });
});
