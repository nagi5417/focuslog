// キーボードショートカットを「反応させてよい状況か」判定する関数群。

// 文字を入力している要素か。ここで N などを奪うと入力文字にならなくなる。
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return target.closest("input, textarea, select") !== null;
}

// Space で標準の操作（押下・チェックの切り替え）が起きる要素か。
// こうした要素にフォーカスがあるときは、ショートカットより標準の操作を優先する。
export function isInteractiveTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.closest(
      'button, a[href], summary, [role="button"], [role="checkbox"], [role="switch"], [role="menuitem"], [role="tab"], [role="option"]',
    ) !== null
  );
}

// ダイアログ・ポップオーバーが開いているか（Radix は role="dialog" を付ける）。
// 開いている間は、その中の操作を優先してショートカットを止める。
export function isDialogOpen(doc: Document = document): boolean {
  return doc.querySelector('[role="dialog"]') !== null;
}
