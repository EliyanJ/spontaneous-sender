import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Building2, Briefcase, Mail, Send, Settings, TrendingUp, Shield, 
  Menu, X, Moon, Sun 
} from "lucide-react";
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
  { title: "Recherche", icon: Search, value: "search" },
  { title: "Entreprises", icon: Building2, value: "entreprises" },
  { title: "Emails", icon: Mail, value: "emails" },
  { title: "Campagnes", icon: Send, value: "campaigns" },
  { title: "Offres d'emploi", icon: Briefcase, value: "jobs" },
  { title: "Suivi", icon: TrendingUp, value: "suivi" },
  { title: "Paramètres", icon: Settings, value: "settings" },
];

interface MobileNavProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const MobileNav = ({ activeTab, onTabChange, isDark, onToggleTheme }: MobileNavProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  const [open, setOpen] = React.useState(false);

  const handleTabClick = (value: string) => {
    onTabChange(value);
    setOpen(false);
  };

  const handleAdminClick = () => {
    navigate('/admin');
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
      <SheetContent side="left" className="w-[280px] p-0">
        <SheetHeader className="p-4 border-b border-border/50">
          <SheetTitle className="text-left">Navigation</SheetTitle>
        </SheetHeader>
        
        <nav className="flex flex-col p-2">
          {menuItems.map((item) => {
            const isActive = activeTab === item.value;
            return (
              <button
                key={item.value}
                onClick={() => handleTabClick(item.value)}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left",
                  isActive 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.title}</span>
              </button>
            );
          })}
          
          {/* Admin button */}
          {isAdmin && (
            <button
              onClick={handleAdminClick}
              className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left text-primary hover:bg-primary/10 border border-primary/30 mt-2"
            >
              <Shield className="h-5 w-5 shrink-0" />
              <span>Admin</span>
            </button>
          )}
        </nav>

        {/* Theme toggle at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border/50">
          <button
            onClick={onToggleTheme}
            className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left text-muted-foreground hover:text-foreground hover:bg-accent"
          >
            {isDark ? (
              <>
                <Sun className="h-5 w-5 shrink-0" />
                <span>Mode clair</span>
              </>
            ) : (
              <>
                <Moon className="h-5 w-5 shrink-0" />
                <span>Mode sombre</span>
              </>
            )}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
