import React from "react";
import { useNavigate } from "react-router-dom";
import { 
  Search, Building2, Briefcase, Send, Shield, 
  Menu, Moon, Sun, FileBarChart
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

// Grouped menu structure
const menuGroups = [
  {
    title: "Recherche",
    icon: Search,
    items: [
      { title: "Nouvelle recherche", value: "search" },
      { title: "Entreprises trouvées", value: "entreprises" },
      { title: "Recherche de contact", value: "emails", section: "search" },
    ]
  },
  {
    title: "Campagnes",
    icon: Send,
    items: [
      { title: "Envoyer une campagne", value: "emails", section: "send" },
      { title: "Historiques & relances", value: "campaigns" },
    ]
  },
  {
    title: "Offres d'emploi",
    icon: Briefcase,
    value: "jobs",
    premium: true,
  }
];

interface MobileNavProps {
  activeTab: string;
  onTabChange: (value: string, section?: string) => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const MobileNav = ({ activeTab, onTabChange, isDark, onToggleTheme }: MobileNavProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  const { features } = usePlanFeatures();
  const [open, setOpen] = React.useState(false);

  const currentSection = sessionStorage.getItem('emails_initial_section');

  const handleTabClick = (value: string, section?: string) => {
    onTabChange(value, section);
    setOpen(false);
  };

  const handleAdminClick = () => {
    navigate('/admin');
    setOpen(false);
  };

  const handlePremiumClick = () => {
    navigate('/pricing');
    setOpen(false);
  };

  const isItemActive = (value: string, section?: string) => {
    if (value === 'emails' && section) {
      return activeTab === 'emails' && currentSection === section;
    }
    return activeTab === value;
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
          {menuGroups.map((group) => {
            // Handle simple items (like Jobs)
            if (group.value) {
              const isLocked = group.premium && !features.canAccessJobOffers;
              const isActive = activeTab === group.value;
              
              return (
                <button
                  key={group.value}
                  onClick={() => isLocked ? handlePremiumClick() : handleTabClick(group.value!)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left",
                    isActive 
                      ? "bg-primary text-primary-foreground" 
                      : isLocked
                        ? "text-muted-foreground/50"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <group.icon className="h-5 w-5 shrink-0" />
                  <span>{group.title}</span>
                  {isLocked && <span className="ml-auto text-xs">Premium</span>}
                </button>
              );
            }

            // Handle grouped items
            return (
              <div key={group.title} className="mb-2">
                <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                  <group.icon className="h-4 w-4" />
                  {group.title}
                </div>
                <div className="space-y-1">
                  {group.items?.map((item) => {
                    const isActive = isItemActive(item.value, item.section);
                    return (
                      <button
                        key={`${item.value}-${item.section || 'default'}`}
                        onClick={() => handleTabClick(item.value, item.section)}
                        className={cn(
                          "flex items-center gap-3 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left ml-2",
                          isActive 
                            ? "bg-primary text-primary-foreground" 
                            : "text-muted-foreground hover:text-foreground hover:bg-accent"
                        )}
                      >
                        <span>{item.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          
          {/* Admin: Score CV */}
          {isAdmin && (
            <button
              onClick={() => handleTabClick('cv-score')}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-sm transition-all duration-200 w-full text-left",
                activeTab === 'cv-score' 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <FileBarChart className="h-5 w-5 shrink-0" />
              <span>Score CV</span>
            </button>
          )}

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
