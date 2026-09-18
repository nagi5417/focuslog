import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSearchShortcutStore } from "@/stores/search-shortcut-store";

beforeEach(() => {
  useSearchShortcutStore.setState({ openSearch: null });
});

describe("useSearchShortcutStore", () => {
  it("登録すると開き方が保存され、解除すると消えること", () => {
    const open = vi.fn();

    const unregister = useSearchShortcutStore.getState().registerSearch(open);
    expect(useSearchShortcutStore.getState().openSearch).toBe(open);

    unregister();
    expect(useSearchShortcutStore.getState().openSearch).toBeNull();
  });

  it("後から別の画面が登録していた場合、古い登録の解除では消さないこと", () => {
    const openOld = vi.fn();
    const openNew = vi.fn();

    const unregisterOld = useSearchShortcutStore.getState().registerSearch(openOld);
    useSearchShortcutStore.getState().registerSearch(openNew);
    // 画面遷移で新しい画面のマウントが先、古い画面のアンマウントが後になる場合
    unregisterOld();

    expect(useSearchShortcutStore.getState().openSearch).toBe(openNew);
  });
});
