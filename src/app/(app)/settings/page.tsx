import { getSetting } from "@/lib/actions/setting";
import { requireUser } from "@/lib/auth/helpers";
import { SettingsPageClient } from "@/components/settings";

export default async function SettingsPage() {
  const [setting, user] = await Promise.all([getSetting(), requireUser()]);

  return <SettingsPageClient setting={setting} user={user} />;
}
