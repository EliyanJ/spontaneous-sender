import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  LayoutDashboard, Search, Mail, Send, Activity, RefreshCw, 
  GitCompare, FileText, Settings, Shield, Menu
} from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const menuItems = [
  { title: "Dashboard",      icon: LayoutDashboard, value: "overview" },
  { title: "Recherche",      icon: Search,          value: "search" },
  { title: "Envoi d'email",  icon: Mail,            value: "emails" },
  { title: "Suivi",          icon: Activity,        value: "suivi" },
  { title: "Comparateur CV", icon: GitCompare,      value: "cv-comparator" },
  { title: "Créateur CV",    icon: FileText,        value: "cv-builder", route: "/cv-builder" },
  { title: "Paramètres",     icon: Settings,        value: "settings" },
];

interface MobileNavProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const MobileNav = ({ activeTab, onTabChange }: MobileNavProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  const [open, setOpen] = React.useState(false);

  const handleClick = (value: string, route?: string) => {
    if (route) {
      navigate(route);
    } else {
      onTabChange(value);
    }
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[260px] p-0">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col p-2 gap-0.5">
          {menuItems.map((item) => {
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => handleClick(item.value, item.route)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left",
                  isActive
                    ? "bg-primary/10 text-primary border border-primary/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span>{item.title}</span>
              </button>
            );
          })}

          {isAdmin && (
            <button
              onClick={() => { navigate("/admin"); setOpen(false); }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left text-primary hover:bg-primary/10 border border-primary/30 mt-2"
            >
              <Shield className="h-4 w-4 shrink-0" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-2">
            <ThemeToggle />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
