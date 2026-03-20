import React from "react";
import { Outlet, NavLink, useNavigate, useMatch } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  UserCog, 
  ArrowLeft,
  Shield,
  MessageSquare,
  Database,
  FileText,
  Search,
  Tag,
  Bot,
  LayoutTemplate,
  Star,
  ScrollText,
  Mail,
  Lightbulb,
  Building2
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";


const adminNavItems = [
  { title: "Dashboard", icon: LayoutDashboard, path: "/admin" },
  { title: "Utilisateurs", icon: Users, path: "/admin/users" },
  { title: "Data", icon: Database, path: "/admin/data" },
  { title: "Tickets", icon: MessageSquare, path: "/admin/tickets" },
  { title: "Promos", icon: Tag, path: "/admin/promos" },
  { title: "ATS", icon: Shield, path: "/admin/ats" },
  { title: "Équipe", icon: UserCog, path: "/admin/team" },
  { title: "CMS", icon: FileText, path: "/admin/cms" },
  { title: "SEO", icon: Search, path: "/admin/seo" },
  { title: "Chatbot", icon: Bot, path: "/admin/chatbot" },
  { title: "Prompts IA", icon: Bot, path: "/admin/ai-generation" },
  { title: "Qualité Emails", icon: Mail, path: "/admin/email-quality" },
  { title: "Secteurs IA", icon: Lightbulb, path: "/admin/sector-insights" },
  { title: "Entreprises", icon: Building2, path: "/admin/companies-data" },
  { title: "Templates CV", icon: LayoutTemplate, path: "/admin/cv-templates" },
  { title: "Templates LM", icon: ScrollText, path: "/admin/cover-letter-templates" },
];

export const AdminLayout = () => {
  const navigate = useNavigate();
  const isTemplateBuilder = useMatch("/admin/cv-templates/:id");

  return (
    <div className={cn(
      "bg-background flex flex-col",
      isTemplateBuilder ? "h-screen overflow-hidden" : "min-h-screen"
    )}>
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
              <Logo height={32} />
              <span className="font-semibold text-foreground hidden sm:inline">Admin</span>
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
          <ThemeToggle />
        </div>
      </header>

      {/* Main Content */}
      <main className={cn(
        "flex-1",
        isTemplateBuilder
          ? "overflow-hidden flex flex-col min-h-0"
          : "container mx-auto px-4 py-6"
      )}>
        <Outlet />
      </main>
    </div>
  );
};
