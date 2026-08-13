import { Outlet } from "react-router-dom";
import { BottomNav } from "@/components/nav/BottomNav";
import { Sidebar } from "@/components/nav/Sidebar";
import { TopBar } from "@/components/nav/TopBar";

export function AppShell() {
  return (
    <div className="flex min-h-screen w-full bg-surface-alt">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar userName="Peter Mwangi" />
        <main className="mx-auto w-full min-w-0 max-w-full flex-1 overflow-x-hidden px-3 pb-24 pt-2 sm:max-w-content sm:px-4 md:px-6 md:pb-10 md:pt-6">
          <Outlet />
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
