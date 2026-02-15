import React from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  BarChart3, 
  Activity, 
  UserCog, 
  ArrowLeft,
  Shield,
  MessageSquare,
  Database,
  FileText,
  Search
} from "lucide-react";
import { cn } from "@/lib/utils";
import cronosLogo from "@/assets/cronos-logo.png";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useState, useEffect } from "react";

const adminNavItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { title: "Utilisateurs", icon: Users, path: "/admin/users" },
  { title: "Data", icon: Database, path: "/admin/data" },
  { title: "Tickets", icon: MessageSquare, path: "/admin/tickets" },
  { title: "Analytics", icon: BarChart3, path: "/admin/analytics" },
  { title: "Activité", icon: Activity, path: "/admin/activity" },
  { title: "Équipe", icon: UserCog, path: "/admin/team" },
  { title: "CMS", icon: FileText, path: "/admin/cms" },
  { title: "SEO", icon: Search, path: "/admin/seo" },
];

export const AdminLayout = () => {
  const navigate = useNavigate();
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo & Back */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Retour</span>
            </button>
            <div className="flex items-center gap-2">
              <img src={cronosLogo} alt="Cronos" className="w-8 h-8 rounded-lg" />
              <span className="font-semibold text-foreground">Admin</span>
              <Shield className="h-4 w-4 text-primary" />
            </div>
          </div>

          {/* Admin Nav */}
          <nav className="flex items-center gap-1 px-2 py-1 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl overflow-x-auto">
            {adminNavItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/admin"}
                className={({ isActive }) =>
                  cn(
                    "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shrink-0",
                    isActive 
                      ? "bg-primary text-primary-foreground shadow-lg" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )
                }
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden lg:inline">{item.title}</span>
              </NavLink>
            ))}
          </nav>

          {/* Theme Toggle */}
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 flex-1">
        <Outlet />
      </main>
    </div>
  );
};
