import { describe, it, expect } from "vitest";
import { taskInputSchema } from "@/lib/validations/task";

describe("taskInputSchema", () => {
  it("正常な入力で parse が成功すること", () => {
    const result = taskInputSchema.safeParse({
      title: "テストタスク",
      priority: 1,
    });
    expect(result.success).toBe(true);
  });

  it("タイトルが空文字のとき parse エラーになること", () => {
    const result = taskInputSchema.safeParse({ title: "", priority: 0 });
    expect(result.success).toBe(false);
  });

  it("タイトルが 201 文字のとき parse エラーになること", () => {
    const result = taskInputSchema.safeParse({
      title: "あ".repeat(201),
      priority: 0,
    });
    expect(result.success).toBe(false);
  });

  it("タイトルが 200 文字のとき parse が成功すること", () => {
    const result = taskInputSchema.safeParse({
      title: "あ".repeat(200),
      priority: 0,
    });
    expect(result.success).toBe(true);
  });

  it("priority が -1 のとき parse エラーになること", () => {
    const result = taskInputSchema.safeParse({ title: "タスク", priority: -1 });
    expect(result.success).toBe(false);
  });

  it("priority が 4 のとき parse エラーになること", () => {
    const result = taskInputSchema.safeParse({ title: "タスク", priority: 4 });
    expect(result.success).toBe(false);
  });

  it("priority が 0〜3 の範囲内で parse が成功すること", () => {
    for (const p of [0, 1, 2, 3]) {
      const result = taskInputSchema.safeParse({
        title: "タスク",
        priority: p,
      });
      expect(result.success).toBe(true);
    }
  });

  it("description が 2001 文字のとき parse エラーになること", () => {
    const result = taskInputSchema.safeParse({
      title: "タスク",
      priority: 0,
      description: "a".repeat(2001),
    });
    expect(result.success).toBe(false);
  });

  it("dueDate を省略しても parse が成功すること", () => {
    const result = taskInputSchema.safeParse({ title: "タスク", priority: 0 });
    expect(result.success).toBe(true);
  });
});
