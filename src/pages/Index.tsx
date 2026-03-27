import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import { SearchCompanies } from "@/components/dashboard/SearchCompanies";
import { Emails } from "@/components/dashboard/Emails";
import { CampaignsHub } from "@/components/dashboard/CampaignsHub";
import { Settings } from "@/components/dashboard/Settings";
import { DashboardOverview } from "@/components/dashboard/DashboardOverview";
import { CVComparator } from "@/components/dashboard/CVComparator";

import { AppSidebar } from "@/components/AppSidebar";
import { MobileNav } from "@/components/MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { Logo } from "@/components/Logo";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("overview");
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const gmailRefresh = searchParams.get("gmailRefresh");

    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }

    if (gmailRefresh === "true") {
      window.dispatchEvent(new CustomEvent("gmail-connected"));
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("gmailRefresh");
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleTabChange = (newTab: string) => {
    if (newTab === "cv-builder") {
      navigate("/cv-builder");
      return;
    }
    if (newTab === "cv-comparator") {
      navigate("/score-cv");
      return;
    }
    setActiveTab(newTab);
    setSearchParams({ tab: newTab });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return <DashboardOverview onNavigateToTab={handleTabChange} />;
      case "search":
        return <SearchCompanies onNavigateToTab={handleTabChange} />;
      case "emails":
        return <Emails onNavigateToTab={handleTabChange} />;
      case "suivi":
        return <CampaignsHub defaultTab="suivi" />;
      case "relance":
        return <CampaignsHub defaultTab="relance" />;
      case "cv-comparator":
        return <CVComparator />;
      case "settings":
        return <Settings />;
      default:
        return <DashboardOverview onNavigateToTab={handleTabChange} />;
    }
  };

  return (
    <SidebarProvider defaultOpen={!isMobile}>
      <div className="min-h-screen flex w-full bg-background overflow-x-hidden">
        {/* Sidebar — desktop only */}
        {!isMobile && (
          <AppSidebar activeTab={activeTab} onTabChange={handleTabChange} />
        )}

        {/* Main column */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
            <div className="px-3 sm:px-4 h-14 flex items-center justify-between gap-2">
              {/* Left: mobile menu + logo */}
              <div className="flex items-center gap-2">
                {isMobile && (
                  <MobileNav activeTab={activeTab} onTabChange={handleTabChange} />
                )}
                {isMobile && <Logo height={26} />}
                {!isMobile && (
                  /* Desktop trigger inside header for quick access */
                  <SidebarTrigger className="h-8 w-8 rounded-lg hover:bg-accent text-muted-foreground" />
                )}
              </div>

              {/* Right: credits, profile, theme */}
              <div className="flex items-center gap-2 shrink-0">
                <CreditsDisplay />
                <ProfileDropdown onNavigateToSettings={() => handleTabChange("settings")} />
                {isMobile && <ThemeToggle />}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 px-4 sm:px-6 py-4 sm:py-6 overflow-x-hidden">
            <div key={activeTab} className="animate-fade-in">
              {renderContent()}
            </div>
          </main>

          {/* Footer */}
          <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm mt-auto">
            <div className="px-4 py-3">
              <div className="flex flex-col items-center gap-2">
                <div className="flex items-center gap-2">
                  <Logo height={18} />
                  <span className="font-semibold text-foreground text-sm hidden sm:inline">Cronos</span>
                </div>
                <div className="flex flex-wrap justify-center gap-4 text-xs text-muted-foreground">
                  <a href="/privacy-policy" className="hover:text-primary transition-colors">Confidentialité</a>
                  <a href="/terms-of-service" className="hover:text-primary transition-colors">Conditions d'Utilisation</a>
                  <a href="/mentions-legales" className="hover:text-primary transition-colors">Mentions légales</a>
                </div>
                <p className="text-xs text-muted-foreground">© 2025 Cronos</p>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
