import { Header } from "@/components/layout/header";
import SettingsClient from "@/components/dashboard/settings-client";

export const metadata = {
  title: "Settings",
};

export default function SettingsPage() {
  return (
    <>
      <Header title="Global Settings" />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6">
          <SettingsClient />
        </div>
      </main>
    </>
  );
}
