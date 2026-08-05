"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import {
  LayoutDashboard, Package, ArrowLeftRight, ShoppingCart,
  Bell, Tags, Truck, BarChart3, Users, type LucideIcon,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarGroupContent, SidebarGroupLabel, SidebarHeader,
  SidebarMenu, SidebarMenuBadge, SidebarMenuButton,
  SidebarMenuItem, SidebarRail,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { useAlerts } from "@/components/providers/alerts-context";

type Role = "admin" | "employee" | "supplier";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: Role[];
  showAlertBadge?: boolean;
}

const navGroups: { label: string; roles: Role[]; items: NavItem[] }[] = [
  {
    label: "Overview",
    roles: ["admin", "employee", "supplier"],
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: LayoutDashboard,
        roles: ["admin", "employee", "supplier"],
      },
    ],
  },
  {
    label: "Inventory",
    roles: ["admin", "employee"],
    items: [
      {
        label: "Products",
        href: "/products",
        icon: Package,
        roles: ["admin", "employee"],
      },
      {
        label: "Stock Movements",
        href: "/stock/movements",
        icon: ArrowLeftRight,
        roles: ["admin", "employee"],
      },
      {
        label: "Alerts",
        href: "/alerts",
        icon: Bell,
        roles: ["admin", "employee"],
        showAlertBadge: true,
      },
    ],
  },
  {
    label: "Procurement",
    roles: ["admin", "employee", "supplier"],
    items: [
      {
        label: "Purchase Orders",
        href: "/orders",
        icon: ShoppingCart,
        roles: ["admin", "employee"],
      },
      {
        label: "My Orders",
        href: "/orders",
        icon: ShoppingCart,
        roles: ["supplier"],
      },
    ],
  },
  {
    label: "Management",
    roles: ["admin"],
    items: [
      { label: "Categories", href: "/categories", icon: Tags,      roles: ["admin"] },
      { label: "Suppliers",  href: "/suppliers",  icon: Truck,     roles: ["admin"] },
      { label: "Reports",    href: "/reports",    icon: BarChart3, roles: ["admin"] },
      { label: "Users",      href: "/users",      icon: Users,     roles: ["admin"] },
    ],
  },
];

const roleMeta: Record<Role, { label: string; variant: "default" | "secondary" | "outline" }> = {
  admin:    { label: "Administrator",   variant: "default"   },
  employee: { label: "Warehouse Staff", variant: "secondary" },
  supplier: { label: "Supplier",        variant: "outline"   },
};

export function AppSidebar() {
  const pathname = usePathname();
  const { sessionClaims } = useAuth();
  const role = (sessionClaims?.metadata as { role?: string })?.role as Role | undefined;

  const { unreadCount } = useAlerts();

  const visibleGroups = navGroups
    .filter((g) => role && g.roles.includes(role))
    .map((g) => ({
      ...g,
      items: g.items.filter((item) => role && item.roles.includes(role)),
    }))
    .filter((g) => g.items.length > 0);

  return (
    <Sidebar collapsible="icon" side="left">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <Image src="/images/logo.svg" alt="logo" width={40} height={40} priority />
          <div className="flex flex-col leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">MediStock</span>
            <span className="text-xs text-muted-foreground">Medical Inventory</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3">
        {visibleGroups.map((group, groupIndex) => (
          <SidebarGroup key={group.label} className={cn(groupIndex > 0 && "mt-1")}>
            <SidebarGroupLabel className="px-2 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
              {group.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  const Icon = item.icon;
                  const badge = item.showAlertBadge && unreadCount > 0 ? String(unreadCount) : undefined;

                  return (
                    <SidebarMenuItem key={item.href + item.label}>
                      <SidebarMenuButton
                        isActive={isActive}
                        tooltip={item.label}
                        className={cn(
                          "h-8 my-0.5 rounded-lg transition-all",
                          isActive
                            ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                            : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                        )}
                      >
                        <Link href={item.href} className="flex items-center gap-2 w-full">
                          <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                          <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                        </Link>
                      </SidebarMenuButton>

                      {badge && (
                        <SidebarMenuBadge className="bg-destructive/10 text-destructive text-xs font-medium">
                          {badge}
                        </SidebarMenuBadge>
                      )}
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="border-b border-sidebar-border p-3">
        {role && (
          <div className="group-data-[collapsible=icon]:hidden px-1">
            <Badge variant={roleMeta[role].variant} className="text-xs font-medium w-full justify-center py-1">
              {roleMeta[role].label}
            </Badge>
          </div>
        )}
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}