import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Settings as SettingsIcon } from "lucide-react";
import { SearchCompanies } from "@/components/dashboard/SearchCompanies";
import { JobOffers } from "@/components/dashboard/JobOffers";
import { Entreprises } from "@/components/dashboard/Entreprises";
import { ContactSearch } from "@/components/dashboard/ContactSearch";
import { UnifiedEmailSender } from "@/components/dashboard/UnifiedEmailSender";
import { CampaignsHub } from "@/components/dashboard/CampaignsHub";
import { Settings } from "@/components/dashboard/Settings";

import { HorizontalNav } from "@/components/HorizontalNav";
import { MobileNav } from "@/components/MobileNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CreditsDisplay } from "@/components/CreditsDisplay";
import { ProfileDropdown } from "@/components/ProfileDropdown";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import cronosLogo from "@/assets/cronos-logo.png";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("search");
  const [emailsSection, setEmailsSection] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const prevTabRef = useRef(activeTab);
  const isMobile = useIsMobile();

  const tabOrder = ["search", "entreprises", "emails", "campaigns", "jobs", "settings"];

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const emailsSectionFromUrl = searchParams.get("emailsSection");
    const gmailRefresh = searchParams.get("gmailRefresh");
    
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
    // Store emailsSection for Emails component
    if (emailsSectionFromUrl) {
      sessionStorage.setItem('emails_initial_section', emailsSectionFromUrl);
      setEmailsSection(emailsSectionFromUrl);
    } else {
      // Read from sessionStorage if not in URL
      const storedSection = sessionStorage.getItem('emails_initial_section');
      setEmailsSection(storedSection);
    }
    
    // Handle Gmail refresh parameter - dispatch event and clean URL
    if (gmailRefresh === 'true') {
      console.log('[Index] Gmail refresh detected, dispatching event');
      window.dispatchEvent(new CustomEvent('gmail-connected'));
      
      // Clean the URL parameter
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('gmailRefresh');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Note: OAuth callback/token extraction for Gmail is handled exclusively by /connect-gmail/callback.
  // We intentionally do not store any Gmail/provider tokens on regular app login to keep the flows separated.


  // Theme toggle
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleTabChange = (newTab: string, section?: string) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(newTab);
    setSlideDirection(newIndex > currentIndex ? "right" : "left");
    prevTabRef.current = activeTab;
    setActiveTab(newTab);
    
    // Update emails section if provided
    if (section) {
      sessionStorage.setItem('emails_initial_section', section);
      setEmailsSection(section);
    }
    
    setSearchParams({ tab: newTab });
  };

  const renderContent = () => {
    switch (activeTab) {
      case "search":
        return <SearchCompanies onNavigateToTab={handleTabChange} />;
      case "entreprises":
        return <Entreprises onNavigateToTab={handleTabChange} />;
      case "jobs":
        return <JobOffers />;
      case "emails":
        // Use React state for emailsSection instead of reading sessionStorage directly
        if (emailsSection === 'search') {
          return <ContactSearch onNavigateToTab={handleTabChange} />;
        }
        // Default to send/campaign view
        return <UnifiedEmailSender />;
      case "campaigns":
        return <CampaignsHub />;
      case "settings":
        return <Settings />;
      default:
        return <SearchCompanies onNavigateToTab={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-2 sm:px-4 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Mobile Menu */}
          {isMobile && (
            <MobileNav 
              activeTab={activeTab} 
              onTabChange={handleTabChange} 
              isDark={isDark}
              onToggleTheme={() => setIsDark(!isDark)}
            />
          )}

          {/* Logo - hidden on mobile to make room for navigation */}
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <img src={cronosLogo} alt="Cronos" className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg" />
            <span className="font-semibold text-foreground hidden sm:inline">Cronos</span>
          </div>
          
          {/* Mobile: Credits and logo on the right side */}
          {isMobile && (
            <div className="flex items-center gap-2">
              <CreditsDisplay />
              <img src={cronosLogo} alt="Cronos" className="w-7 h-7 rounded-lg" />
            </div>
          )}

          {/* Navigation - Desktop only */}
          {!isMobile && (
            <HorizontalNav activeTab={activeTab} onTabChange={handleTabChange} />
          )}

          {/* Credits, Profile, Settings & Theme Toggle - Desktop only */}
          {!isMobile && (
            <div className="flex items-center gap-2 shrink-0">
              <CreditsDisplay />
              <ProfileDropdown onNavigateToSettings={() => handleTabChange('settings')} />
              <button
                onClick={() => handleTabChange('settings')}
                className={cn(
                  "flex items-center justify-center p-2 rounded-lg transition-all duration-200",
                  activeTab === 'settings'
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                title="Paramètres"
              >
                <SettingsIcon className="h-4 w-4" />
              </button>
              <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-3 sm:py-6 pb-4 flex-1 overflow-x-hidden">
        <div 
          key={activeTab}
          className={slideDirection === "right" ? "animate-slide-in-right" : "animate-slide-in-left"}
        >
          {renderContent()}
        </div>
      </main>

      {/* Footer - Compact on mobile */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4">
          <div className="flex flex-col items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <img src={cronosLogo} alt="Cronos" className="h-4 w-4 sm:h-5 sm:w-5" />
              <span className="font-display font-semibold text-foreground text-sm sm:text-base">Cronos</span>
            </div>
            <div className="flex flex-wrap justify-center gap-2 sm:gap-4 md:gap-6 text-[10px] sm:text-sm text-muted-foreground">
              <a href="/privacy-policy" className="hover:text-primary transition-colors duration-300">Confidentialité</a>
              <a href="/terms-of-service" className="hover:text-primary transition-colors duration-300">Conditions d'Utilisation</a>
              <a href="/mentions-legales" className="hover:text-primary transition-colors duration-300">Mentions légales</a>
            </div>
            <p className="text-[10px] sm:text-sm text-muted-foreground">© 2025 Cronos</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
