import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  LayoutGrid, 
  Building2, 
  Target, 
  CreditCard, 
  Zap, 
  Users,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DataOverview } from "./data/DataOverview";
import { DataCandidatures } from "./data/DataCandidatures";
import { DataTracking } from "./data/DataTracking";
import { DataAbonnements } from "./data/DataAbonnements";
import { DataEngagement } from "./data/DataEngagement";
import { DataDemographics } from "./data/DataDemographics";

const sections = [
  { id: "overview", label: "Vue d'ensemble", icon: LayoutGrid },
  { id: "candidatures", label: "Candidatures", icon: Building2 },
  { id: "tracking", label: "Tracking", icon: Target },
  { id: "abonnements", label: "Abonnements", icon: CreditCard },
  { id: "engagement", label: "Engagement", icon: Zap },
  { id: "demographics", label: "Démographie", icon: Users },
];

const periodOptions = [
  { value: "7d", label: "7 jours" },
  { value: "30d", label: "30 jours" },
  { value: "90d", label: "90 jours" },
  { value: "all", label: "Tout" },
];

export const AdminDataCenter = () => {
  const [activeSection, setActiveSection] = useState("overview");
  const [period, setPeriod] = useState("30d");
  const [navCollapsed, setNavCollapsed] = useState(false);

  const renderSection = () => {
    switch (activeSection) {
      case "overview": return <DataOverview period={period} />;
      case "candidatures": return <DataCandidatures period={period} />;
      case "tracking": return <DataTracking period={period} />;
      case "abonnements": return <DataAbonnements period={period} />;
      case "engagement": return <DataEngagement period={period} />;
      case "demographics": return <DataDemographics period={period} />;
      default: return <DataOverview period={period} />;
    }
  };

  return (
    <div className="flex gap-6 min-h-[calc(100vh-8rem)]">
      {/* Side Navigation */}
      <div className={cn(
        "shrink-0 transition-all duration-300",
        navCollapsed ? "w-14" : "w-52"
      )}>
        <Card className="bg-card/50 border-border/50 sticky top-24">
          <CardContent className="p-2">
            <div className="flex justify-end mb-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setNavCollapsed(!navCollapsed)}
              >
                {navCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </Button>
            </div>
            <nav className="space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    activeSection === section.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <section.icon className="h-4 w-4 shrink-0" />
                  {!navCollapsed && <span>{section.label}</span>}
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="flex-1 space-y-6">
        {/* Period Filter */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">
            {sections.find(s => s.id === activeSection)?.label}
          </h1>
          <div className="flex items-center gap-1 bg-card/50 border border-border/50 rounded-lg p-1">
            {periodOptions.map((opt) => (
              <Button
                key={opt.value}
                variant={period === opt.value ? "default" : "ghost"}
                size="sm"
                onClick={() => setPeriod(opt.value)}
                className="text-xs"
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>

        {renderSection()}
      </div>
    </div>
  );
};
