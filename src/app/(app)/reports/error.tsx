"use client";

export default function ReportsError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <p className="text-[13px]" style={{ color: "var(--fl-text-muted)" }}>
        レポートの読み込みに失敗しました
      </p>
      <p
        className="text-[11px] font-mono"
        style={{ color: "var(--fl-text-subtle)" }}
      >
        {error.message}
      </p>
      <button
        onClick={reset}
        className="h-[32px] px-4 rounded-[7px] text-[12px] font-[500] cursor-pointer"
        style={{ background: "var(--fl-brand)", color: "var(--fl-on-brand)" }}
      >
        再試行
      </button>
    </div>
  );
}
