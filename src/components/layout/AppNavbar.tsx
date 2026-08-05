"use client";

// المسار: src/components/layout/AppNavbar.tsx
// استبدل الملف الحالي بهذا الكامل
// التغييرات:
//   - يستخدم useAlerts() من Context بدل fetch مستقل للعدد
//   - يجلب قائمة التنبيهات عند فتح القائمة فقط (لا عند كل render)
//   - أضفنا زر "View all" في footer القائمة

import { useState, useEffect } from "react";
import { UserButton } from "@clerk/nextjs";
import { Bell, Loader2, Sun, Moon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/components/providers/alerts-context";

const routeLabels: Record<string, string> = {
  dashboard: "Dashboard",
  products: "Products",
  stock: "Stock",
  movements: "Movements",
  orders: "Orders",
  alerts: "Alerts",
  categories: "Categories",
  suppliers: "Suppliers",
  reports: "Reports",
  users: "Users",
};

function useBreadcrumbs() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);
  return segments.map((seg, i) => ({
    label: routeLabels[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1),
    href: "/" + segments.slice(0, i + 1).join("/"),
    isLast: i === segments.length - 1,
  }));
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
}

export function AppNavbar() {
  const router = useRouter();
  const breadcrumbs = useBreadcrumbs();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // ← عدد التنبيهات من Context المشترك مع Sidebar
  const { unreadCount, markRead, markAllRead } = useAlerts();

  useEffect(() => {
    setMounted(true);
  }, []);

  // جلب آخر 10 تنبيهات عند فتح القائمة فقط
  useEffect(() => {
    if (!open) return;
    setLoadingList(true);
    fetch("/api/alerts?limit=10")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(
          (data.alerts ?? []).map((a: any) => ({
            id: a.id,
            title: a.type === "LOW_STOCK" ? "Low Stock Alert" : a.type === "EXPIRY" ? "Expiry Alert" : a.type === "ORDER" ? "Order Update" : "Notification",
            description: a.message,
            time: new Date(a.createdAt).toLocaleString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }),
            unread: !a.isRead,
          })),
        );
      })
      .catch(() => {})
      .finally(() => setLoadingList(false));
  }, [open]);

  const handleNotificationClick = async (n: NotificationItem) => {
    if (n.unread) {
      await markRead(n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, unread: false } : x)));
    }
    setOpen(false);
    router.push("/alerts");
  };

  const handleMarkAllAsRead = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  return (
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
      <SidebarTrigger className="-ml-1 h-8 w-8" />
      <Separator orientation="vertical" className="mr-2 h-full" />

      <Breadcrumb className="flex-1">
        <BreadcrumbList className="hidden sm:flex">
          {breadcrumbs.map((crumb, i) => (
            <span key={crumb.href} className="flex items-center gap-1.5">
              {i > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {crumb.isLast ? (
                  <BreadcrumbPage className="text-sm font-medium text-foreground">{crumb.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink href={crumb.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {crumb.label}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Toggle theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}>
          {mounted && resolvedTheme === "dark" ? <Sun className="h-4 w-4 transition-all" /> : <Moon className="h-4 w-4 transition-all" />}
        </Button>

        {/* Notifications bell */}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger render={<Button variant="ghost" size="icon" className="relative h-8 w-8 text-muted-foreground hover:text-foreground" aria-label="Notifications" />}>
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
            )}
          </PopoverTrigger>

          <PopoverContent align="end" className="w-80 p-0 shadow-lg" sideOffset={8}>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {unreadCount} new
                </Badge>
              )}
            </div>

            {/* List */}
            <div className="max-h-72 overflow-y-auto divide-y divide-border">
              {loadingList ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} onClick={() => handleNotificationClick(n)} className={cn("flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/50 cursor-pointer", n.unread && "bg-primary/5")}>
                    {n.unread ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary" /> : <span className="mt-1.5 h-2 w-2 shrink-0" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground leading-snug">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-2">{n.description}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{n.time}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="border-t border-border p-2 flex gap-1">
                {unreadCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={handleMarkAllAsRead} className="flex-1 text-xs text-muted-foreground">
                    Mark all read
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    router.push("/alerts");
                  }}
                  className="flex-1 text-xs text-muted-foreground"
                >
                  View all
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <UserButton
          appearance={{
            elements: { avatarBox: "h-7 w-7 rounded-full ring-2 ring-border" },
          }}
        />
      </div>
    </header>
  );
}
