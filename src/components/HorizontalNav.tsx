import React from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, Briefcase, Mail, Send, Shield, Lock, UserSearch, History } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const menuItems = [
  { title: "Recherche d'entreprise", icon: Search, value: "search" },
  { title: "Recherche de contact", icon: UserSearch, value: "emails", section: "search" },
  { title: "Campagnes", icon: Send, value: "emails", section: "send" },
  { title: "Historiques & relances", icon: History, value: "campaigns" },
  { title: "Entreprises", icon: Building2, value: "entreprises" },
  { title: "Offres d'emploi", icon: Briefcase, value: "jobs", premium: true },
];

interface HorizontalNavProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const HorizontalNav = ({ activeTab, onTabChange }: HorizontalNavProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  const { features } = usePlanFeatures();

  const handleTabClick = (item: typeof menuItems[0]) => {
    // Check if this is a premium feature and user doesn't have access
    if (item.premium && !features.canAccessJobOffers) {
      navigate('/pricing');
      return;
    }
    
    // Set section in sessionStorage if specified
    if (item.section) {
      sessionStorage.setItem('emails_initial_section', item.section);
    }
    
    onTabChange(item.value);
  };

  return (
    <nav className="flex items-center gap-1 px-2 py-1 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl overflow-x-auto max-w-[calc(100vw-8rem)] md:max-w-none scrollbar-hide">
      {menuItems.map((item) => {
        // For emails tab, check if this specific button is active based on section
        const isEmailSection = item.value === 'emails';
        const currentSection = sessionStorage.getItem('emails_initial_section');
        const isActive = isEmailSection 
          ? activeTab === 'emails' && currentSection === item.section
          : activeTab === item.value;
        const isLocked = item.premium && !features.canAccessJobOffers;
        
        const button = (
          <button
            key={`${item.value}-${item.section || 'default'}`}
            onClick={() => handleTabClick(item)}
            className={cn(
              "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shrink-0",
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : isLocked
                  ? "text-muted-foreground/50 cursor-pointer"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            style={isActive ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}
          >
            {isLocked ? (
              <Lock className="h-4 w-4" />
            ) : (
              <item.icon className="h-4 w-4" />
            )}
            <span className="hidden lg:inline">{item.title}</span>
          </button>
        );

        if (isLocked) {
          return (
            <Tooltip key={`${item.value}-${item.section || 'default'}`}>
              <TooltipTrigger asChild>
                {button}
              </TooltipTrigger>
              <TooltipContent>
                <p>Fonctionnalité Premium - Cliquez pour voir les plans</p>
              </TooltipContent>
            </Tooltip>
          );
        }

        return button;
      })}
      
      {/* Admin button - only visible for admins */}
      {isAdmin && (
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shrink-0 text-primary hover:bg-primary/10 border border-primary/30 ml-auto"
        >
          <Shield className="h-4 w-4" />
          <span className="hidden lg:inline">Admin</span>
        </button>
      )}
    </nav>
  );
};
