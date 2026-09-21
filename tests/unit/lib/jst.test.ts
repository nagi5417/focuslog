import { describe, it, expect } from "vitest";
import {
  jstInputsToIso,
  parseJstTimeToUtc,
  toJstDateInput,
  toJstHM,
  toJstTimeInput,
} from "@/lib/jst";

describe("jst 変換ヘルパー", () => {
  describe("toJstDateInput / toJstTimeInput", () => {
    it("UTC ISO を JST の日付・時刻入力値へ変換する", () => {
      // JST 2026-06-13 00:30 = UTC 2026-06-12 15:30
      const iso = "2026-06-12T15:30:00.000Z";
      expect(toJstDateInput(iso)).toBe("2026-06-13");
      expect(toJstTimeInput(iso)).toBe("00:30");
    });

    it("日付境界（JST 0:30）で前日にずれない", () => {
      const iso = "2026-06-12T15:30:00.000Z"; // JST 6/13 00:30
      expect(toJstDateInput(iso)).toBe("2026-06-13");
    });
  });

  describe("jstInputsToIso", () => {
    it("JST の日付・時刻を UTC ISO へ変換する", () => {
      expect(jstInputsToIso("2026-06-13", "00:30")).toBe(
        "2026-06-12T15:30:00.000Z",
      );
    });
  });

  describe("往復一致", () => {
    it("ISO → 入力値 → ISO が元に戻る（分精度）", () => {
      const cases = [
        "2026-06-12T15:30:00.000Z", // JST 6/13 00:30（日付境界）
        "2026-06-13T14:59:00.000Z", // JST 6/13 23:59
        "2026-01-01T00:00:00.000Z", // JST 1/1 09:00
      ];
      for (const iso of cases) {
        const date = toJstDateInput(iso);
        const time = toJstTimeInput(iso);
        expect(jstInputsToIso(date, time)).toBe(iso);
      }
    });
  });

  describe("toJstHM / parseJstTimeToUtc（計測ログ編集用）", () => {
    it("UTC ms → JST HH:mm", () => {
      const ms = Date.parse("2026-06-12T15:30:00.000Z");
      expect(toJstHM(ms)).toBe("00:30");
    });

    it("HH:mm(JST) を基準日と同じ JST 日付の UTC Date に戻す", () => {
      const ref = Date.parse("2026-06-12T15:30:00.000Z"); // JST 6/13 00:30
      const result = parseJstTimeToUtc("01:00", ref);
      // JST 6/13 01:00 = UTC 6/12 16:00
      expect(result.toISOString()).toBe("2026-06-12T16:00:00.000Z");
    });
  });
});
