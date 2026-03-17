import { Header } from "@/components/layout/header";

export const metadata = {
  title: "Help",
};

export default function HelpPage() {
  return (
    <>
      <Header title="Help" />
      <main className="flex-1 overflow-y-auto scrollbar-thin">
        <div className="p-6">
          <p className="text-muted-foreground text-sm">
            This page is coming soon.
          </p>
        </div>
      </main>
    </>
  );
}
