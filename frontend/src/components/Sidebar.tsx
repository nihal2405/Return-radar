'use client';
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  LayoutGrid,
  Timer,
  Package,
  ShieldCheck,
  Bell,
  CheckCircle2,
  Settings,
  User,
  Radar,
  UploadCloud,
  X,
  ExternalLink,
} from "lucide-react";

interface SidebarProps {
  urgentCount?: number;
  totalCount?: number;
  completedCount?: number;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({
  urgentCount = 0,
  totalCount = 0,
  completedCount = 0,
  isOpen = false,
  onClose,
}: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab');

  const monitor = [
    { 
      label: "Dashboard", 
      href: "/", 
      icon: LayoutGrid, 
      badge: urgentCount > 0 ? String(urgentCount) : undefined, 
      active: pathname === "/" && !currentTab // Dashboard is active only if no tab is selected
    },
    { 
      label: "All purchases", 
      href: "/?tab=all", 
      icon: Package, 
      badge: totalCount > 0 ? String(totalCount) : undefined,
      active: pathname === "/" && currentTab === "all"
    },
  ];

  const manage = [
    { 
      label: "Upload receipt", 
      href: "/upload", 
      icon: UploadCloud, 
      active: pathname === "/upload" 
    },
    { 
      label: "Notifications", 
      href: "/?tab=notifications", 
      icon: Bell,
      active: pathname === "/" && currentTab === "notifications"
    },
    { 
      label: "Completed", 
      href: "/?tab=completed", 
      icon: CheckCircle2,
      badge: completedCount > 0 ? String(completedCount) : undefined,
      active: pathname === "/" && currentTab === "completed"
    },
  ];

  const content = (
    <div className="flex h-full flex-col bg-sidebar text-foreground select-none">
      {/* Logo Section */}
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-4 py-3 shrink-0">
        <img src="/logo.png?v=3" alt="ReturnMinder Logo" className="w-16 h-16 object-contain -ml-2" />
        <div className="flex flex-col flex-1 truncate">
          <span className="font-bold text-[#1e2329] tracking-tight leading-tight text-sm">ReturnMinder</span>
          <span className="text-[8px] uppercase tracking-[0.2em] font-medium text-muted-foreground leading-tight truncate">Returns made easy</span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="size-4" />
          </button>
        )}
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 space-y-6 px-3 py-5 overflow-y-auto">
        {/* Monitor Group */}
        <div className="space-y-1">
          <p className="label-mono px-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground/80">Monitor</p>
          {monitor.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                item.active
                  ? "bg-sidebar-accent font-medium text-primary shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge ? (
                <span className="rounded-full bg-accent/15 px-2 py-0.5 font-mono text-[10px] font-semibold text-accent">
                  {item.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>

        {/* Manage Group */}
        <div className="space-y-1">
          <p className="label-mono px-3 pb-1 text-[11px] uppercase tracking-wider text-muted-foreground/80">Manage</p>
          {manage.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={onClose}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 ${
                item.active
                  ? "bg-sidebar-accent font-medium text-primary shadow-xs"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              <item.icon className="size-4 shrink-0" strokeWidth={1.75} />
              <span className="flex-1 truncate">{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* Footer Controls */}
      <div className="border-t border-sidebar-border p-3 space-y-1">
        <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground">
          <div className="size-2 rounded-full bg-safe animate-pulse" />
          <span className="text-xs font-mono text-muted-foreground">Gemini 3.5 Flash Agent Active</span>
        </div>

        <button
          onClick={() => {
            localStorage.removeItem('return_radar_gmail_connected');
            window.location.href = '/';
          }}
          className="flex w-full items-center gap-3 px-3 py-2 text-sm text-critical hover:bg-critical-soft rounded-lg transition-colors font-medium mb-2"
        >
          Sign Out
        </button>
        <div className="flex items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent px-3 py-2.5">
          <div className="grid size-8 shrink-0 place-items-center rounded-md bg-white text-xs font-bold text-primary shadow-sm ring-1 ring-black/5">
            US
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">User</p>
            <p className="truncate text-[11px] text-muted-foreground">Free Tier</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar lg:flex z-30">
        {content}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={onClose}
          />
          <div className="relative flex w-72 max-w-[85vw] flex-1 flex-col shadow-2xl animate-in slide-in-from-left duration-200">
            {content}
          </div>
        </div>
      )}
    </>
  );
}
