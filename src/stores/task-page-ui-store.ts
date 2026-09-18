"use client";

import { create } from "zustand";

/**
 * タスク画面の「新規作成モーダル」と「検索欄」の開閉状態。
 *
 * キーボードショートカット（N / ⌘K）は全画面で受け付け、タスク画面以外で押された場合は
 * タスク画面へ遷移してから開く。遷移をまたいで「開いて」を受け渡すため、
 * コンポーネントのローカル state ではなくストアで持つ。
 */
type TaskPageUiStore = {
  isCreateOpen: boolean;
  isSearchOpen: boolean;
  setCreateOpen: (open: boolean) => void;
  setSearchOpen: (open: boolean) => void;
};

export const useTaskPageUiStore = create<TaskPageUiStore>((set) => ({
  isCreateOpen: false,
  isSearchOpen: false,
  setCreateOpen: (open) => set({ isCreateOpen: open }),
  setSearchOpen: (open) => set({ isSearchOpen: open }),
}));
