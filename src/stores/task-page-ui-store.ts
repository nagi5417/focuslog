"use client";

import { create } from "zustand";

/**
 * タスク画面の「新規作成モーダル」の開閉状態。
 *
 * キーボードショートカット N は全画面で受け付け、タスク画面以外で押された場合は
 * タスク画面へ遷移してから開く。遷移をまたいで「開いて」を受け渡すため、
 * コンポーネントのローカル state ではなくストアで持つ。
 * （検索欄は ⌘F が検索欄のある画面でだけ効き、画面をまたがないため、ここには置かない）
 */
type TaskPageUiStore = {
  isCreateOpen: boolean;
  setCreateOpen: (open: boolean) => void;
};

export const useTaskPageUiStore = create<TaskPageUiStore>((set) => ({
  isCreateOpen: false,
  setCreateOpen: (open) => set({ isCreateOpen: open }),
}));
