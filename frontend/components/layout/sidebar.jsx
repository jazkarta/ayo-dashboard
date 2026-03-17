"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  FlaskConical,
  FileText,
  Settings,
  ChevronLeft,
  ChevronRight,
  Bell,
  BarChart3,
  ClipboardList,
  HelpCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Participants",
    href: "/dashboard/participants",
    icon: Users,
  },
  {
    title: "Researchers",
    href: "/dashboard/researchers",
    icon: FlaskConical,
  },
  {
    title: "Studies",
    href: "/dashboard/studies",
    icon: ClipboardList,
  },
  {
    title: "Reports",
    href: "/dashboard/reports",
    icon: BarChart3,
  },
  {
    title: "Documents",
    href: "/dashboard/documents",
    icon: FileText,
  },
];

const bottomNavItems = [
  {
    title: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
  {
    title: "Help",
    href: "/dashboard/help",
    icon: HelpCircle,
  },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = React.useState(false);
  const pathname = usePathname();

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "relative flex flex-col h-full bg-sidebar border-r border-sidebar-border transition-all duration-300 ease-in-out",
          collapsed ? "w-[60px]" : "w-[240px]"
        )}
      >
        {/* Logo / Brand */}
        <div
          className={cn(
            "flex items-center h-16 px-4 border-b border-sidebar-border shrink-0",
            collapsed ? "justify-center" : "gap-3"
          )}
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shrink-0">
            <FlaskConical className="w-4 h-4" />
          </div>
          {!collapsed && (
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-sidebar-foreground truncate leading-tight">
                AYO
              </p>
              <p className="text-xs text-muted-foreground truncate">
                Admin Panel
              </p>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button */}
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-[72px] h-6 w-6 rounded-full border  bg-background shadow-sm z-10 hover:bg-accent"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>

        {/* Navigation */}
        <nav className="flex flex-col flex-1 gap-1 p-2 overflow-y-auto scrollbar-thin">
          {/* Main nav section */}
          <div className="flex flex-col gap-1">
            {!collapsed && (
              <p className="px-2 pt-2 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest">
                Main
              </p>
            )}
            {collapsed && <div className="h-3" />}
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));

              return (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                />
              );
            })}
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          <Separator className="my-2" />

          {/* Bottom nav section */}
          <div className="flex flex-col gap-1 pb-2">
            {bottomNavItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <NavItem
                  key={item.href}
                  item={item}
                  isActive={isActive}
                  collapsed={collapsed}
                />
              );
            })}
          </div>
        </nav>
      </aside>
    </TooltipProvider>
  );
}

function NavItem({ item, isActive, collapsed }) {
  const Icon = item.icon;

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href={item.href}
            className={cn(
              "flex items-center justify-center h-9 w-9 mx-auto rounded-md transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            aria-label={item.title}
          >
            <Icon className="h-4 w-4 shrink-0" />
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{item.title}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 h-9 px-3 rounded-md text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-primary text-sidebar-primary-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.title}</span>
    </Link>
  );
}
