import { describe, it, expect } from "vitest";
import { timeEntryEditSchema } from "@/lib/validations/log";

const PAST_DATE = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2時間前
const EARLIER = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3時間前

describe("timeEntryEditSchema", () => {
  it("正常な入力で parse が成功すること", () => {
    const result = timeEntryEditSchema.safeParse({
      id: "clxxxxxxxxxxxxxxxxxxxxxx",
      startedAt: EARLIER,
      endedAt: PAST_DATE,
    });
    expect(result.success).toBe(true);
  });

  it("endedAt が startedAt より前のとき parse エラーになること", () => {
    const result = timeEntryEditSchema.safeParse({
      id: "clxxxxxxxxxxxxxxxxxxxxxx",
      startedAt: PAST_DATE,
      endedAt: EARLIER,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("endedAt");
    }
  });

  it("endedAt が未来のとき parse エラーになること", () => {
    const future = new Date(Date.now() + 60 * 60 * 1000);
    const result = timeEntryEditSchema.safeParse({
      id: "clxxxxxxxxxxxxxxxxxxxxxx",
      startedAt: EARLIER,
      endedAt: future,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toContain("endedAt");
    }
  });

  it("id が cuid 形式でなければ parse エラーになること", () => {
    const result = timeEntryEditSchema.safeParse({
      id: "not-a-cuid",
      startedAt: EARLIER,
      endedAt: PAST_DATE,
    });
    expect(result.success).toBe(false);
  });
});
