import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { SearchCompanies } from "@/components/dashboard/SearchCompanies";
import { JobOffers } from "@/components/dashboard/JobOffers";
import { Entreprises } from "@/components/dashboard/Entreprises";
import { Emails } from "@/components/dashboard/Emails";
import { CampaignsHub } from "@/components/dashboard/CampaignsHub";
import { Settings } from "@/components/dashboard/Settings";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Settings as SettingsIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // OAuth callback handler
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <div className="flex-1 flex flex-col">
          {/* Header simplifié */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
            <div className="flex items-center justify-between px-6 py-4">
              <div className="flex items-center gap-4">
                <SidebarTrigger className="lg:hidden" />
              </div>
              
              <h1 className="font-display text-xl font-semibold text-foreground">
                Connexions
              </h1>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveTab("settings")}
                className="text-muted-foreground hover:text-foreground"
              >
                <SettingsIcon className="h-5 w-5" />
              </Button>
            </div>
          </header>
          
          <main className="flex-1 p-6 overflow-auto">
            <div className={activeTab === "search" ? "block" : "hidden"}>
              <SearchCompanies />
            </div>
            <div className={activeTab === "entreprises" ? "block" : "hidden"}>
              <Entreprises />
            </div>
            <div className={activeTab === "jobs" ? "block" : "hidden"}>
              <JobOffers />
            </div>
            <div className={activeTab === "emails" ? "block" : "hidden"}>
              <Emails />
            </div>
            <div className={activeTab === "campaigns" ? "block" : "hidden"}>
              <CampaignsHub />
            </div>
            <div className={activeTab === "settings" ? "block" : "hidden"}>
              <Settings />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
