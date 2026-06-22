import { handlers } from "@/lib/auth/auth";

// Auth.js の OAuth コールバック等を処理する catch-all ルート。
// 「API Route は使わない」規約に対し、OAuth に必須なフレームワーク例外として handlers を再 export する。
export const { GET, POST } = handlers;
