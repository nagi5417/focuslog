export default function ReportsLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden animate-pulse">
      {/* ヘッダースケルトン */}
      <div
        className="px-7 pt-5 pb-4 border-b shrink-0"
        style={{ borderColor: "var(--fl-border)" }}
      >
        <div
          className="h-5 w-32 rounded"
          style={{ background: "var(--fl-hover)" }}
        />
        <div
          className="mt-2 h-3 w-64 rounded"
          style={{ background: "var(--fl-hover)" }}
        />
      </div>

      <div className="flex-1 overflow-hidden">
        {/* ツールバースケルトン */}
        <div
          className="flex items-center gap-3 px-7 py-3 border-b"
          style={{ borderColor: "var(--fl-border-subtle)" }}
        >
          <div
            className="h-8 w-40 rounded-lg"
            style={{ background: "var(--fl-hover)" }}
          />
          <div
            className="h-8 w-48 rounded-lg"
            style={{ background: "var(--fl-hover)" }}
          />
        </div>

        {/* 統計カードスケルトン */}
        <div className="stats-grid stats-grid-2">
          {[0, 1].map((i) => (
            <div
              key={i}
              className="stat-card"
              style={{ background: "var(--fl-hover)" }}
            />
          ))}
        </div>

        {/* 週ビュースケルトン */}
        <div
          className="mx-7 rounded-[10px] border overflow-hidden"
          style={{
            borderColor: "var(--fl-border)",
            background: "var(--fl-panel)",
            height: 400,
          }}
        />
      </div>
    </div>
  );
}
