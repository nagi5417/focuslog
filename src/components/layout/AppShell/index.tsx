import { Sidebar } from "@/components/layout/Sidebar";
import { TopbarMobile } from "@/components/layout/TopbarMobile";
import { MobileNav } from "@/components/layout/MobileNav";
import { TimerBar } from "@/components/layout/TimerBar";
import { UserSettingSync } from "@/components/layout/UserSettingSync";

type User = { name?: string | null; email?: string | null };
type InitialActiveTimer = {
  taskId: string;
  taskTitle: string;
  startedAtMs: number;
} | null;
type Theme = "light" | "dark" | "system";

export function AppShell({
  children,
  user,
  todayTaskCount,
  hasActiveTimer,
  initialActiveTimer,
  initialTheme,
}: {
  children: React.ReactNode;
  user?: User;
  todayTaskCount: number;
  hasActiveTimer: boolean;
  initialActiveTimer: InitialActiveTimer;
  initialTheme: Theme;
}) {
  return (
    <div
      className="grid h-screen overflow-hidden
        md:[grid-template-columns:224px_1fr] md:[grid-template-rows:auto_1fr]
        max-md:grid-cols-1 max-md:[grid-template-rows:auto_auto_1fr_auto]"
      style={{ background: "var(--fl-bg)" }}
    >
      <UserSettingSync theme={initialTheme} />

      {/* Sidebar — desktop only, col-1 spans all rows */}
      <div className="hidden md:flex flex-col md:[grid-row:1/-1]">
        <Sidebar
          user={user}
          todayTaskCount={todayTaskCount}
          hasActiveTimer={hasActiveTimer}
        />
      </div>

      {/* Mobile topbar — row 1, mobile only */}
      <div className="md:hidden">
        <TopbarMobile />
      </div>

      {/* Timer bar — col-2 row-1 desktop, row-2 mobile.
          floating はデスクトップのみ適用（モバイルは通常の上部固定バーにフォールバック） */}
      <div className="md:[grid-column:2] md:[grid-row:1] max-md:[grid-row:2]">
        <TimerBar timerStyle="floating" initialActiveTimer={initialActiveTimer} />
      </div>

      {/* Main content — col-2 row-2 desktop, row-3 mobile */}
      <main
        className="min-w-0 min-h-0 overflow-hidden flex flex-col
          md:[grid-column:2] md:[grid-row:2] max-md:[grid-row:3]"
        style={{ background: "var(--fl-bg)" }}
      >
        {children}
      </main>

      {/* Mobile nav — row-4, mobile only */}
      <div className="md:hidden max-md:[grid-row:4]">
        <MobileNav />
      </div>
    </div>
  );
}
