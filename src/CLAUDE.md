# src/ — ソースコード配下のコンテキスト

## ディレクトリ構成

- `app/` — App Router のページとレイアウト（API Routes は使わない）
- `components/` — React コンポーネント（機能別サブディレクトリ）
- `components/ui/` — shadcn/ui ベースの汎用 UI コンポーネント
- `hooks/` — カスタム React hooks
- `lib/actions/` — Server Actions（機能別: task.ts, timer.ts, log.ts）
- `lib/validations/` — Zod スキーマ（フロント/サーバー共有）
- `lib/` — ユーティリティ関数、DB クライアント、共有ロジック
- `types/` — 共有型定義

## 命名規約

- コンポーネント: PascalCase（`UserProfile.tsx`）
- hooks: camelCase + `use` プレフィックス（`useAuth.ts`）
- ユーティリティ: camelCase（`formatDate.ts`）
- 型定義: PascalCase（`User.ts`）
- Server Actions: `lib/actions/<feature>.ts`（機能別集約）
- バリデーション: `lib/validations/<feature>.ts`（Zod スキーマ共有）

## インポートルール

- パスエイリアス `@/` を使用（`@/components/...`, `@/lib/...`）
- 相対パスは同一ディレクトリ内のみ許可
- バレルエクスポート（`index.ts`）を活用してインポートを簡潔に
- 順序: react → next → 外部ライブラリ → @/ 内部パス → ./ 相対パス

## コードスタイル補足

- イベントハンドラは `handle` プレフィックス（handleClick, handleSubmit）
- コンポーネントは関数コンポーネント + hooks のみ
- コードスタイルは ESLint と Prettier で強制。リンターエラーが出たらその出力に従って修正すること
- インポート順序: react → next → 外部ライブラリ → @/ 内部パス → ./ 相対パス
