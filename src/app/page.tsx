import { redirect } from "next/navigation";

// ルートアクセスはタスク画面へ集約する。
// 未認証の場合は proxy.ts が先に /login へ退避させるため、ここに到達するのは認証済みユーザーのみ。
export default function Home() {
  redirect("/tasks");
}
