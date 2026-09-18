"use client";

import { create } from "zustand";

/**
 * ⌘F / Ctrl+F で検索欄を開くための登録先。
 *
 * 検索欄を持つ画面が、表示している間だけ「開き方」を登録する。
 * 登録のない画面では ⌘F を奪わず、ブラウザ標準のページ内検索をそのまま使えるようにする。
 * 画面ごとに判定を書き足さずに済むよう、「検索欄がある画面だけ」という規則を登録の有無で表す。
 */
type SearchShortcutStore = {
  openSearch: (() => void) | null;
  // 登録し、解除用の関数を返す（useEffect の後処理にそのまま渡せる形）
  registerSearch: (open: () => void) => () => void;
};

export const useSearchShortcutStore = create<SearchShortcutStore>(
  (set, get) => ({
    openSearch: null,
    registerSearch: (open) => {
      set({ openSearch: open });
      return () => {
        // 後から別の画面が登録していた場合に消してしまわないよう、自分の登録だけ解除する
        if (get().openSearch === open) set({ openSearch: null });
      };
    },
  }),
);
