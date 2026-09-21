import type { Page, Locator } from "@playwright/test";

type PriorityLabel = "高" | "中" | "低";

/** タスク一覧のセクション種別（UI の見出しと対応） */
export type TaskSection =
  | "overdue"
  | "today"
  | "upcoming"
  | "undated"
  | "done";

const SECTION_TITLES: Record<TaskSection, string> = {
  overdue: "期限切れ",
  today: "今日のタスク",
  upcoming: "今後のタスク",
  undated: "日付未設定のタスク",
  done: "完了したタスク",
};

// 既定で折りたたまれているセクション（行を見るには開く必要がある）
const COLLAPSED_SECTIONS: TaskSection[] = ["upcoming", "undated", "done"];

type CreateTaskOptions = {
  /** 期限日（YYYY-MM-DD）。type=date の入力にそのまま渡す */
  date?: string;
  /** 期限時刻（HH:mm）。date 指定時のみ有効 */
  time?: string;
  /** 優先度ラベル（未指定なら既定の「低」） */
  priority?: PriorityLabel;
};

export class TasksPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto("/tasks");
  }

  async createTask(title: string, options: CreateTaskOptions = {}) {
    // 新規タスクボタンでモーダルを開き、各項目を入力して「追加」で登録する
    await this.page.getByRole("button", { name: "新規タスク" }).click();

    const dialog = this.page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 5_000 });
    await dialog.getByLabel("タイトル").fill(title);

    if (options.date) {
      await dialog.getByLabel("期限日").fill(options.date);
      if (options.time) {
        await dialog.getByLabel(/時刻/).fill(options.time);
      }
    }
    if (options.priority) {
      await dialog.getByRole("button", { name: options.priority }).click();
    }

    await dialog.getByRole("button", { name: /^追加/ }).click();

    // 登録成功でモーダルが閉じるのを待つ
    await dialog.waitFor({ state: "hidden", timeout: 5_000 });
  }

  getTaskRow(title: string): Locator {
    return this.page
      .locator("[data-testid='task-row']")
      .filter({ hasText: title });
  }

  // 指定セクションの要素。見出しボタンの有無で特定する。
  // hasText だと、行のタイトルにセクション名と同じ語が含まれる場合に
  // 別のセクションを誤って掴むため（例: 「期限切れ完了」というタスク名）
  private section(section: TaskSection): Locator {
    return this.page
      .locator("section")
      .filter({ has: this.sectionHeader(section) });
  }

  // 指定セクション内の、タイトル一致タスク行を返す
  sectionRow(section: TaskSection, title: string): Locator {
    return this.section(section)
      .locator("[data-testid='task-row']")
      .filter({ hasText: title });
  }

  // 指定セクションの見出しボタン（クリックで開閉）。
  // 見出しは「<セクション名> <件数>」という名前になる。部分一致にすると
  // 行内の「『○○』を編集」ボタン（タスク名にセクション名が含まれる場合）も
  // 拾ってしまうため、前後を固定して厳密に一致させる
  sectionHeader(section: TaskSection): Locator {
    return this.page.getByRole("button", {
      name: new RegExp(`^${SECTION_TITLES[section]}\\s+\\d+$`),
    });
  }

  // 指定セクションを開いてアニメーション完了まで待つ
  async expandSection(section: TaskSection) {
    await this.sectionHeader(section).click();
    await this.page.waitForTimeout(500);
  }

  // 検索を開いてクエリを入力する（⌘K でも開けるが UI ボタン経由で安定化）
  async search(query: string) {
    await this.page.getByTestId("task-search-open").click();
    const input = this.page.getByPlaceholder("タイトルで検索…");
    await input.waitFor({ state: "visible", timeout: 3_000 });
    await input.fill(query);
  }

  async clearSearch() {
    await this.page.getByRole("button", { name: "検索を閉じる" }).click();
  }

  // ショートカット F で検索欄を開く
  async openSearchWithShortcut() {
    await this.page.keyboard.press("f");
  }

  searchInput(): Locator {
    return this.page.getByPlaceholder("タイトルで検索…");
  }

  private popover(): Locator {
    return this.page.locator("[data-slot='popover-content']");
  }

  // 優先度フィルタのポップオーバーを開き、指定ラベルのトグルをクリックする
  async filterByPriority(labels: PriorityLabel[]) {
    await this.page.getByTestId("task-filter-open").click();
    const popover = this.popover();
    await popover.waitFor({ state: "visible", timeout: 3_000 });
    for (const label of labels) {
      // label 要素全体がチェックボックスを内包するためクリックで toggle される
      await popover.locator("label", { hasText: label }).click();
    }
    await this.page.keyboard.press("Escape");
    await popover.waitFor({ state: "hidden", timeout: 3_000 });
  }

  async clearPriorityFilter() {
    await this.page.getByTestId("task-filter-open").click();
    const popover = this.popover();
    await popover.waitFor({ state: "visible", timeout: 3_000 });
    await popover.getByRole("button", { name: "クリア" }).click();
    await this.page.keyboard.press("Escape");
    await popover.waitFor({ state: "hidden", timeout: 3_000 });
  }

  // タスク行の経過時間テキスト（"–" or "HH:MM"）
  async getElapsedText(title: string): Promise<string | null> {
    return this.getTaskRow(title)
      .locator("[data-testid='task-elapsed']")
      .textContent();
  }

  async toggleDone(title: string) {
    const row = this.getTaskRow(title);
    await this.revealRow(row);

    // チェックボックスは 2 番目のボタン（1 番目はタイマーボタン）
    // overflow-hidden / overflow-y-auto の組み合わせで Playwright のスクロールが
    // 干渉するため JS で直接クリック
    await row
      .locator("button")
      .nth(1)
      .evaluate((el: HTMLElement) => el.click());
  }

  async startTimerFromRow(title: string) {
    const row = this.getTaskRow(title);
    await row.getByTitle("計測開始").click();
  }

  // 行が折りたたまれたセクションにある場合、見つかるまで順に開いて可視化する
  private async revealRow(row: Locator) {
    if (await row.isVisible()) return;

    for (const section of COLLAPSED_SECTIONS) {
      await this.expandSection(section);
      if (await row.isVisible()) return;
    }

    await row.waitFor({ state: "visible", timeout: 3_000 });
  }

  // 行の編集ボタン（ホバー表示）から編集ダイアログを開く。
  // can-hover で opacity 制御されるが JS クリックは可視性に依存しないため evaluate で押す
  async openEditDialog(title: string) {
    const row = this.getTaskRow(title);
    await this.revealRow(row);
    await row
      .getByTestId("task-edit")
      .evaluate((el: HTMLElement) => el.click());
    await this.page
      .getByRole("dialog")
      .waitFor({ state: "visible", timeout: 5_000 });
  }

  // 行の削除ボタン → 確認ダイアログの「削除」で削除を確定する
  async deleteTask(title: string) {
    const row = this.getTaskRow(title);
    await this.revealRow(row);
    await row
      .getByTestId("task-delete")
      .evaluate((el: HTMLElement) => el.click());
    const dialog = this.page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 5_000 });
    await dialog.getByRole("button", { name: "削除" }).click();
    await dialog.waitFor({ state: "hidden", timeout: 5_000 });
  }
}
