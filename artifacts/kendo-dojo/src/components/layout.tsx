import React from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { LogOut, LayoutDashboard, Calendar, Users, Megaphone, CalendarDays, Eye, Shield } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const { member, logout } = useAuth();
  const [location] = useLocation();

  const handleLogout = async () => {
    await logout();
  };

  const isAdmin = member?.role === "admin";
  const isCourseAdmin = member?.role === "course_admin";
  const isMember = member?.role === "member";

  const homeHref = isAdmin
    ? "/admin/announcements"
    : isCourseAdmin
    ? "/admin/courses"
    : "/announcements";

  const navItems = isAdmin
    ? [
        { label: "公告管理", path: "/admin/announcements", icon: Megaphone },
        { label: "控制台", path: "/admin", icon: LayoutDashboard },
        { label: "会员管理", path: "/admin/members", icon: Users },
        { label: "课程管理", path: "/admin/courses", icon: Calendar },
      ]
    : isCourseAdmin
    ? [
        { label: "课程管理", path: "/admin/courses", icon: Calendar },
      ]
    : [
        { label: "道场公告", path: "/announcements", icon: Megaphone },
        { label: "我的道场", path: "/dashboard", icon: LayoutDashboard },
        { label: "课程预约", path: "/courses", icon: Calendar },
        { label: "我的预约", path: "/bookings", icon: CalendarDays },
      ];

  const memberViewItems = [
    { label: "会员主页", path: "/dashboard", icon: LayoutDashboard },
    { label: "课程预约", path: "/courses", icon: Calendar },
    { label: "我的预约", path: "/bookings", icon: CalendarDays },
    { label: "道场公告", path: "/announcements", icon: Megaphone },
  ];

  const roleLabel = isAdmin
    ? "超级管理员"
    : isCourseAdmin
    ? "课程管理员"
    : "会员";

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background">
      <aside className="w-full md:w-64 bg-card border-b md:border-b-0 md:border-r border-border flex flex-col">
        <Link href={homeHref} className="flex items-center gap-3 p-5 border-b border-border hover:opacity-80 transition-opacity">
          <img
            src="/logo-transparent.png"
            alt="长安剑士会"
            className="w-10 h-10 object-contain shrink-0 drop-shadow-[0_0_8px_rgba(37,99,188,0.5)]"
          />
          <div>
            <h1 className="text-base font-bold tracking-wider text-primary leading-tight">长安剑士会</h1>
            <p className="text-[10px] text-muted-foreground tracking-widest uppercase">Chang'an Kendo</p>
          </div>
        </Link>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}

          {(isAdmin || isCourseAdmin) && (
            <div className="pt-4">
              <div className="flex items-center gap-2 px-4 py-2 mb-1">
                <Eye className="w-3.5 h-3.5 text-muted-foreground/60" />
                <span className="text-[11px] text-muted-foreground/60 uppercase tracking-widest font-medium">会员视图</span>
              </div>
              {memberViewItems.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-md transition-colors text-sm ${
                      isActive
                        ? "bg-primary/20 text-primary font-medium"
                        : "text-muted-foreground/70 hover:text-foreground hover:bg-accent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </nav>
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{member?.name}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {(isAdmin || isCourseAdmin) && <Shield className="w-3 h-3 text-primary shrink-0" />}
                <p className="text-xs text-muted-foreground">{roleLabel}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
      <main className="flex-1 p-6 md:p-10 overflow-y-auto">
        <div className="max-w-5xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
