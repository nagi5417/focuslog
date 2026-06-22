import { getSetting } from "@/lib/actions/setting";
import { ThemeSelector } from "@/components/settings";

export default async function SettingsPage() {
  const setting = await getSetting();

  return (
    <div className="flex flex-col h-full overflow-auto">
      <div
        className="px-7 pt-5 pb-4 border-b shrink-0"
        style={{ borderColor: "var(--fl-border)" }}
      >
        <h1
          className="text-base font-semibold"
          style={{ color: "var(--fl-text)" }}
        >
          設定
        </h1>
      </div>
      <div className="px-7 py-6 flex flex-col gap-8 max-w-lg">
        <section>
          <h2
            className="text-sm font-medium mb-3"
            style={{ color: "var(--fl-text-muted)" }}
          >
            テーマ
          </h2>
          <ThemeSelector initialTheme={setting.theme} />
        </section>
      </div>
    </div>
  );
}
