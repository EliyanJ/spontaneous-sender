import React from "react";
import { useNavigate } from "react-router-dom";
import { Search, Building2, Briefcase, Send, Shield, Lock, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface HorizontalNavProps {
  activeTab: string;
  onTabChange: (value: string, section?: string) => void;
}

export const HorizontalNav = ({ activeTab, onTabChange }: HorizontalNavProps) => {
  const navigate = useNavigate();
  const { isAdmin } = useAdminCheck();
  const { features } = usePlanFeatures();

  const currentSection = sessionStorage.getItem('emails_initial_section');

  // Check if current tab is in a dropdown group
  const isSearchGroupActive = activeTab === 'search' || activeTab === 'entreprises' || 
    (activeTab === 'emails' && currentSection === 'search');
  const isCampaignGroupActive = (activeTab === 'emails' && currentSection !== 'search') || activeTab === 'campaigns';

  const handleTabClick = (value: string, section?: string) => {
    onTabChange(value, section);
  };

  const isJobsLocked = !features.canAccessJobOffers;

  return (
    <nav className="flex items-center gap-1 px-2 py-1 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl">
      {/* Recherche d'entreprise Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shrink-0",
              isSearchGroupActive 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            style={isSearchGroupActive ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}
          >
            <Search className="h-4 w-4" />
            <span className="hidden lg:inline">Recherche</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-popover border border-border shadow-lg z-50">
          <DropdownMenuItem 
            onClick={() => handleTabClick('search')}
            className={cn("cursor-pointer", activeTab === 'search' && "bg-accent")}
          >
            <Search className="mr-2 h-4 w-4" />
            Nouvelle recherche
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleTabClick('entreprises')}
            className={cn("cursor-pointer", activeTab === 'entreprises' && "bg-accent")}
          >
            <Building2 className="mr-2 h-4 w-4" />
            Entreprises trouvées
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleTabClick('emails', 'search')}
            className={cn("cursor-pointer", activeTab === 'emails' && currentSection === 'search' && "bg-accent")}
          >
            <Search className="mr-2 h-4 w-4" />
            Recherche de contact
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Campagnes Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shrink-0",
              isCampaignGroupActive 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            style={isCampaignGroupActive ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}
          >
            <Send className="h-4 w-4" />
            <span className="hidden lg:inline">Campagnes</span>
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 bg-popover border border-border shadow-lg z-50">
          <DropdownMenuItem 
            onClick={() => handleTabClick('emails', 'send')}
            className={cn("cursor-pointer", activeTab === 'emails' && currentSection === 'send' && "bg-accent")}
          >
            <Send className="mr-2 h-4 w-4" />
            Envoyer une campagne
          </DropdownMenuItem>
          <DropdownMenuItem 
            onClick={() => handleTabClick('campaigns')}
            className={cn("cursor-pointer", activeTab === 'campaigns' && "bg-accent")}
          >
            <Send className="mr-2 h-4 w-4" />
            Historiques & relances
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Offres d'emploi - Simple button */}
      {isJobsLocked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => navigate('/pricing')}
              className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shrink-0 text-muted-foreground/50 cursor-pointer"
            >
              <Lock className="h-4 w-4" />
              <span className="hidden lg:inline">Offres</span>
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Fonctionnalité Premium - Cliquez pour voir les plans</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        <button
          onClick={() => handleTabClick('jobs')}
          className={cn(
            "flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-xl font-medium text-sm transition-all duration-300 shrink-0",
            activeTab === 'jobs' 
              ? "bg-primary text-primary-foreground shadow-lg" 
              : "text-muted-foreground hover:text-foreground hover:bg-accent"
          )}
          style={activeTab === 'jobs' ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}
        >
          <Briefcase className="h-4 w-4" />
          <span className="hidden lg:inline">Offres</span>
        </button>
      )}
      
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
