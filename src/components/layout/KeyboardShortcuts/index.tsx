"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { resumeLastTimer, stopTimer } from "@/lib/actions/timer";
import {
  isDialogOpen,
  isInteractiveTarget,
  isTypingTarget,
} from "@/lib/utils/keyboard";
import { useSearchShortcutStore } from "@/stores/search-shortcut-store";
import { useTaskPageUiStore } from "@/stores/task-page-ui-store";
import { useTimerStore } from "@/stores/timer-store";

const TASKS_PATH = "/tasks";
const REPORTS_PATH = "/reports";
// G を押してから R を受け付ける時間
const SEQUENCE_TIMEOUT_MS = 1_000;

/**
 * 全画面共通のキーボードショートカット（サイドバーの一覧と対応）。
 *
 * - N: 新規タスクの作成を開く（タスク画面以外ならタスク画面へ移動して開く）
 * - Space: 計測中なら停止、していなければ直前に計測していた未完了タスクを再開
 * - G → R: レポート画面へ移動（⌘R / Ctrl+R はブラウザの再読み込みなので使わない）
 * - F: 検索欄のある画面でだけ、その画面の検索を開く
 *
 * どれも修飾キーなしにそろえている。⌘F / Ctrl+F などブラウザの操作は奪わない。
 *
 * 文字入力中・IME 変換中・ダイアログ表示中は反応しない。
 * 設定で無効にしている（enabled=false）ときはキー入力を一切受け付けない。
 * 画面を持たないため何も描画しない。
 */
export function KeyboardShortcuts({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  // G を押した時刻（G → R の2段階入力用）
  const pendingGAt = useRef<number | null>(null);
  // Space の連打で開始・停止の処理が重ならないようにする
  const isTogglingTimer = useRef(false);

  // タスク画面を離れたら作成モーダルの開閉をリセットする（開いたままだと、
  // 次にタスク画面へ来たときに勝手に開くため）。
  // TasksPageClient のアンマウント時に行うと、開発環境の Strict Mode がマウント直後に
  // 後処理を1回挟むため、他画面から「開いて」遷移してきた直後に打ち消されてしまう。
  // URL の変化で判定すれば、遷移先がタスク画面のときは何もしないので打ち消さない。
  useEffect(() => {
    if (pathname === TASKS_PATH) return;
    useTaskPageUiStore.setState({ isCreateOpen: false });
  }, [pathname]);

  useEffect(() => {
    // 無効ならリスナー自体を登録しない（1文字のキーが誤って反応しないようにする）
    if (!enabled) return;

    function openOnTasksPage(open: () => void) {
      open();
      if (pathname !== TASKS_PATH) router.push(TASKS_PATH);
    }

    async function toggleTimer() {
      if (isTogglingTimer.current) return;
      isTogglingTimer.current = true;
      try {
        const { runningTaskId, start, stop } = useTimerStore.getState();
        if (runningTaskId) {
          // TimerBar の停止ボタンと同じフロー
          await stopTimer();
          stop();
          return;
        }
        const result = await resumeLastTimer();
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        if (!result.data) {
          toast.info("再開できるタスクがありません");
          return;
        }
        start(result.data.taskId, result.data.title, result.data.startedAtMs);
      } finally {
        isTogglingTimer.current = false;
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      // IME 変換中（日本語入力の確定など）とキーの押しっぱなしは無視する
      if (e.isComposing || e.repeat || e.defaultPrevented) return;
      if (isDialogOpen()) return;

      const key = e.key.toLowerCase();

      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;

      if (key === "g") {
        pendingGAt.current = Date.now();
        return;
      }
      const isAfterG =
        pendingGAt.current !== null &&
        Date.now() - pendingGAt.current <= SEQUENCE_TIMEOUT_MS;
      pendingGAt.current = null;

      if (key === "r" && isAfterG) {
        e.preventDefault();
        router.push(REPORTS_PATH);
        return;
      }

      if (key === "n") {
        e.preventDefault();
        openOnTasksPage(() =>
          useTaskPageUiStore.getState().setCreateOpen(true),
        );
        return;
      }

      // F は検索欄のある画面が登録しているときだけ受け付ける（登録がなければ何もしない）
      if (key === "f") {
        const openSearch = useSearchShortcutStore.getState().openSearch;
        if (!openSearch) return;
        // 次のフレームでフォーカスする検索欄に「f」が入力されないよう、既定の動作を止める
        e.preventDefault();
        openSearch();
        return;
      }

      // ボタンやチェックボックスにフォーカスがあるときは、それらの標準操作を優先する
      if (e.key === " " && !isInteractiveTarget(e.target)) {
        e.preventDefault(); // ページのスクロールを止める
        void toggleTimer();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, pathname, router]);

  return null;
}
