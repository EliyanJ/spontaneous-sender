import React from "react";
import { Search, Building2, Briefcase, Mail, Send, Settings, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { title: "Recherche", icon: Search, value: "search" },
  { title: "Entreprises", icon: Building2, value: "entreprises" },
  { title: "Emails", icon: Mail, value: "emails" },
  { title: "Campagnes", icon: Send, value: "campaigns" },
  { title: "Offres d'emploi", icon: Briefcase, value: "jobs" },
  { title: "Suivi", icon: TrendingUp, value: "suivi" },
  { title: "Paramètres", icon: Settings, value: "settings" },
];

interface HorizontalNavProps {
  activeTab: string;
  onTabChange: (value: string) => void;
}

export const HorizontalNav = ({ activeTab, onTabChange }: HorizontalNavProps) => {
  return (
    <nav className="flex items-center gap-1 px-2 py-1 bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl">
      {menuItems.map((item) => {
        const isActive = activeTab === item.value;
        return (
          <button
            key={item.value}
            onClick={() => onTabChange(item.value)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all duration-300",
              isActive 
                ? "bg-primary text-primary-foreground shadow-lg" 
                : "text-muted-foreground hover:text-foreground hover:bg-accent"
            )}
            style={isActive ? { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' } : {}}
          >
            <item.icon className="h-4 w-4" />
            <span className="hidden md:inline">{item.title}</span>
          </button>
        );
      })}
    </nav>
  );
};
