/**
 * JST（日本標準時, UTC+9）固定の日時変換ヘルパー。
 *
 * このアプリの期限・集計表示はすべて JST 基準で行う（task-transform 参照）。
 * `<input type="date">` / `<input type="time">` の値は「JST のカレンダー上の日付・時刻」
 * として扱い、保存時は UTC ISO 文字列へ、表示時は ISO → JST 入力値へ変換する。
 *
 * ブラウザのローカル TZ に依存する素朴な `new Date(\`${date}T${time}\`)` は使わない
 * （実行環境の TZ で結果がぶれ、JST 固定の表示・集計とずれるため）。
 */

const JST_OFFSET = 9 * 60 * 60 * 1000;

// UTC ISO → JST の "yyyy-MM-dd"
export function toJstDateInput(iso: string): string {
  const jst = new Date(new Date(iso).getTime() + JST_OFFSET);
  const y = jst.getUTCFullYear();
  const mo = String(jst.getUTCMonth() + 1).padStart(2, "0");
  const d = String(jst.getUTCDate()).padStart(2, "0");
  return `${y}-${mo}-${d}`;
}

// UTC ISO → JST の "HH:mm"
export function toJstTimeInput(iso: string): string {
  const jst = new Date(new Date(iso).getTime() + JST_OFFSET);
  const hh = String(jst.getUTCHours()).padStart(2, "0");
  const mm = String(jst.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

// JST の "yyyy-MM-dd" + "HH:mm" → UTC ISO 文字列
export function jstInputsToIso(date: string, time: string): string {
  const [y, mo, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  // JST の年月日時分を UTC へ（-9h）。Date.UTC は引数を UTC として解釈するので JST 分を引く
  const utcMs = Date.UTC(y, mo - 1, d, hh, mm) - JST_OFFSET;
  return new Date(utcMs).toISOString();
}

// --- 計測ログ編集用（TimeEntry の UTC ms を扱う。内部は上の ISO 版を再利用）---

// UTC ms → JST の "HH:mm"
export function toJstHM(utcMs: number): string {
  return toJstTimeInput(new Date(utcMs).toISOString());
}

// "HH:mm"(JST) を referenceUtcMs と同じ JST 日付の UTC Date に変換
export function parseJstTimeToUtc(
  timeStr: string,
  referenceUtcMs: number,
): Date {
  const date = toJstDateInput(new Date(referenceUtcMs).toISOString());
  return new Date(jstInputsToIso(date, timeStr));
}
