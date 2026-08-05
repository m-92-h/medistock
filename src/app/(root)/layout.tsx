import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AppNavbar } from "@/components/layout/AppNavbar";
import { DemoBanner } from "@/components/auth/DemoBanner";
import { AlertsProvider } from "@/components/providers/alerts-context";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth();
  if (!userId) redirect("/sign-in");

  const isDemo = (sessionClaims?.metadata as { isDemo?: boolean })?.isDemo;

  return (
    <AlertsProvider>
      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        <SidebarInset className="flex flex-col min-h-screen overflow-hidden">
          {isDemo ? <DemoBanner /> : null}
          <AppNavbar />
          <main className="flex-1 overflow-y-auto">
            <div className="container mx-auto max-w-7xl p-6">{children}</div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AlertsProvider>
  );
}
