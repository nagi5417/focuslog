import { auth } from "@/lib/auth/auth";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return <AppShell user={session?.user}>{children}</AppShell>;
}
