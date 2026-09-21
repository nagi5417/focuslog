import { describe, expect, it } from "vitest";
import { settingUpdateSchema } from "@/lib/validations/setting";

describe("settingUpdateSchema", () => {
  it("ショートカットのオン・オフだけの更新を受け付けること", () => {
    expect(settingUpdateSchema.safeParse({ shortcutsEnabled: false }).success).toBe(
      true,
    );
  });

  it("真偽値以外は拒否すること", () => {
    expect(settingUpdateSchema.safeParse({ shortcutsEnabled: "false" }).success).toBe(
      false,
    );
  });

  it("更新する項目が1つもなければ拒否すること", () => {
    expect(settingUpdateSchema.safeParse({}).success).toBe(false);
  });
});
