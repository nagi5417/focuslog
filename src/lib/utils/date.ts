// JST（UTC+9）ベースの日付ユーティリティ
// Server・Client どちらからも import 可能（"use server" 非依存）

/** UTC Date を JST にシフトした Date を返す（getUTCHours 等で JST の値が読める） */
export function toJstDate(utc: Date): Date {
  return new Date(utc.getTime() + 9 * 60 * 60 * 1000);
}

/**
 * 指定日を含む週の月曜 0:00（UTC）を返す
 * 例: 火曜に呼ぶと → その週の月曜 0:00 JST = 前日 15:00 UTC
 */
export function jstStartOfWeek(ref: Date): Date {
  const jst = toJstDate(ref);
  const dow = jst.getUTCDay(); // 0=Sun
  const mondayOffset = dow === 0 ? -6 : 1 - dow;
  const monday = new Date(
    Date.UTC(
      jst.getUTCFullYear(),
      jst.getUTCMonth(),
      jst.getUTCDate() + mondayOffset,
      0,
      0,
      0,
      0,
    ),
  );
  return new Date(monday.getTime() - 9 * 60 * 60 * 1000);
}

/** JST の現在時刻を「0:00 からの分数」で返す */
export function getNowMinJst(): number {
  const jst = toJstDate(new Date());
  return jst.getUTCHours() * 60 + jst.getUTCMinutes();
}

/**
 * weekStart（UTC）から i 日後の「JST 日付 Date」を返す
 * getUTCDate()/getUTCMonth()/getUTCFullYear() で JST の日付値が読める
 */
export function weekDateAt(weekStartUtc: Date, i: number): Date {
  const utc = new Date(weekStartUtc.getTime() + i * 24 * 60 * 60 * 1000);
  return toJstDate(utc);
}

/**
 * 今日の JST 曜日を 0=月 〜 6=日 のインデックスで返す
 */
export function todayWeekIdx(): number {
  const dow = toJstDate(new Date()).getUTCDay(); // 0=Sun
  return dow === 0 ? 6 : dow - 1;
}
