import React, { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { SearchCompanies } from "@/components/dashboard/SearchCompanies";
import { JobOffers } from "@/components/dashboard/JobOffers";
import { Entreprises } from "@/components/dashboard/Entreprises";
import { Emails } from "@/components/dashboard/Emails";
import { CampaignsHub } from "@/components/dashboard/CampaignsHub";
import { Settings } from "@/components/dashboard/Settings";
import { Pipeline } from "@/components/dashboard/Pipeline";
import { HorizontalNav } from "@/components/HorizontalNav";
import { ThemeToggle } from "@/components/ThemeToggle";
import cronosLogo from "@/assets/cronos-logo.png";

const Index = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("search");
  const [isDark, setIsDark] = useState(true);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");
  const prevTabRef = useRef(activeTab);

  const tabOrder = ["search", "entreprises", "emails", "campaigns", "jobs", "suivi", "settings"];

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab");
    const emailsSectionFromUrl = searchParams.get("emailsSection");
    if (tabFromUrl) {
      setActiveTab(tabFromUrl);
    }
    // Store emailsSection for Emails component
    if (emailsSectionFromUrl) {
      sessionStorage.setItem('emails_initial_section', emailsSectionFromUrl);
    }
  }, [searchParams]);

  // Handle OAuth callback
  useEffect(() => {
    const expectedReturn = sessionStorage.getItem("oauth_return_expected");
    const hash = window.location.hash;
    if (!expectedReturn || !hash) return;

    let providerToken: string | null = null;
    let providerRefreshToken: string | null = null;
    try {
      const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.substring(1) : hash);
      providerToken = hashParams.get('provider_token');
      providerRefreshToken = hashParams.get('provider_refresh_token');
    } catch (e) {
      console.warn('Impossible de parser le hash OAuth:', e);
    } finally {
      window.history.replaceState({}, '', window.location.pathname + window.location.search);
    }

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) return;

      const anySession = session as any;
      const token = providerToken || anySession?.provider_token || null;
      const refresh = providerRefreshToken || anySession?.provider_refresh_token || null;

      if (token) {
        const { error } = await supabase.functions.invoke('store-gmail-tokens', {
          headers: { Authorization: `Bearer ${session.access_token}` },
          body: {
            provider_token: token,
            provider_refresh_token: refresh,
          },
        });
        if (error) {
          console.error('Erreur stockage tokens:', error);
          toast.error('Erreur lors de la configuration Gmail');
        } else {
          toast.success('Connexion Google réussie !');
        }
      }

      sessionStorage.removeItem('oauth_return_expected');
      sessionStorage.removeItem('post_oauth_redirect');
      sessionStorage.removeItem('post_login_redirect');
    });
  }, []);

  // Theme toggle
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleTabChange = (newTab: string) => {
    const currentIndex = tabOrder.indexOf(activeTab);
    const newIndex = tabOrder.indexOf(newTab);
    setSlideDirection(newIndex > currentIndex ? "right" : "left");
    prevTabRef.current = activeTab;
    setActiveTab(newTab);
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
        return <Emails onNavigateToTab={handleTabChange} />;
      case "campaigns":
        return <CampaignsHub />;
      case "suivi":
        return <Pipeline />;
      case "settings":
        return <Settings />;
      default:
        return <SearchCompanies onNavigateToTab={handleTabChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Fixed Header */}
      <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src={cronosLogo} alt="Cronos" className="w-8 h-8 rounded-lg" />
            <span className="font-semibold text-foreground hidden sm:inline">Cronos</span>
          </div>

          {/* Navigation */}
          <HorizontalNav activeTab={activeTab} onTabChange={handleTabChange} />

          {/* Theme Toggle */}
          <ThemeToggle isDark={isDark} onToggle={() => setIsDark(!isDark)} />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6 pb-20 flex-1">
        <div 
          key={activeTab}
          className={slideDirection === "right" ? "animate-slide-in-right" : "animate-slide-in-left"}
        >
          {renderContent()}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm mt-auto">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img src={cronosLogo} alt="Cronos" className="h-5 w-5" />
              <span className="font-display font-semibold text-foreground">Cronos</span>
            </div>
            <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
              <a href="/privacy-policy" className="hover:text-primary transition-colors duration-300">Confidentialité</a>
              <a href="/privacy-policy-en" className="hover:text-primary transition-colors duration-300">Privacy</a>
              <a href="/terms-of-service" className="hover:text-primary transition-colors duration-300">Conditions</a>
              <a href="/terms-of-service-en" className="hover:text-primary transition-colors duration-300">Terms</a>
              <a href="/mentions-legales" className="hover:text-primary transition-colors duration-300">Mentions légales</a>
              <a href="/legal-notice" className="hover:text-primary transition-colors duration-300">Legal Notice</a>
            </div>
            <p className="text-sm text-muted-foreground">© 2025 Cronos</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
