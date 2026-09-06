import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  AlertTriangle,
  Camera,
  Settings,
  Shield,
  HardHat,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    path: "/",
    icon: Camera,
    label: "Live Monitor",
    description: "Monitor compliance in real-time",
  },
  {
    path: "/dashboard",
    icon: LayoutDashboard,
    label: "Dashboard",
    description: "Overview and analytics",
  },
  {
    path: "/incidents",
    icon: AlertTriangle,
    label: "Incidents",
    description: "Report and manage incidents",
  },
  {
    path: "/workers",
    icon: Users,
    label: "Workers",
    description: "Manage workforce",
  },
  {
    path: "/entry-points",
    icon: Shield,
    label: "Entry Points",
    description: "Manage access points",
  },
  {
    path: "/settings",
    icon: Settings,
    label: "Settings",
    description: "System preferences",
  },
];

export default function Sidebar() {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-screen flex-shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-[88px]" : "w-[320px]"
      )}
    >
      <div
        className={cn(
          "flex h-24 items-center border-b border-sidebar-border",
          collapsed ? "justify-center px-3" : "gap-4 px-6"
        )}
      >
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-primary shadow-lg shadow-primary/30">
          <HardHat className="h-7 w-7 text-primary-foreground" />
        </div>

        {!collapsed && (
          <div className="min-w-0 overflow-hidden">
            <h1 className="truncate text-xl font-bold tracking-tight text-sidebar-foreground">
              AI SafeGuard
            </h1>

            <p className="mt-1 text-xs font-medium uppercase tracking-[0.18em] text-sidebar-foreground/60">
              Gear Compliance
            </p>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-6">
        {navItems.map((item) => {
          const isActive =
            item.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.path);

          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              to={item.path}
              title={collapsed ? item.label : undefined}
              className={cn(
                "group flex min-h-[72px] items-center rounded-xl transition-all duration-200",
                collapsed ? "justify-center px-3" : "gap-4 px-4",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-primary/20"
                  : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-7 w-7 flex-shrink-0 transition-transform duration-200 group-hover:scale-105" />

              {!collapsed && (
                <div className="min-w-0">
                  <div className="truncate text-base font-semibold leading-tight">
                    {item.label}
                  </div>

                  <div
                    className={cn(
                      "mt-1 truncate text-sm leading-tight",
                      isActive
                        ? "text-sidebar-primary-foreground/75"
                        : "text-sidebar-foreground/55"
                    )}
                  >
                    {item.description}
                  </div>
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border px-4 py-4">
        <button
          type="button"
          onClick={() => setCollapsed((current) => !current)}
          className={cn(
            "flex w-full items-center rounded-xl text-sm font-medium text-sidebar-foreground/65 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            collapsed
              ? "justify-center px-3 py-3"
              : "justify-start gap-3 px-4 py-3"
          )}
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <>
              <ChevronLeft className="h-5 w-5" />
              <span>Collapse Menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}