import { auth } from "@/lib/auth/auth";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("認証が必要です");
  }
  return session.user;
}
