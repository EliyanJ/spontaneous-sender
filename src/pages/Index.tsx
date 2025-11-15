import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SearchCompanies } from "@/components/dashboard/SearchCompanies";
import { JobOffers } from "@/components/dashboard/JobOffers";
import { Statistics } from "@/components/dashboard/Statistics";
import { Pipeline } from "@/components/dashboard/Pipeline";
import { Notifications } from "@/components/dashboard/Notifications";
import { Support } from "@/components/dashboard/Support";
import { EmailSearch } from "@/components/dashboard/EmailSearch";
import { ContactEmails } from "@/components/dashboard/ContactEmails";
import { EmailComposer } from "@/components/dashboard/EmailComposer";
import { ScheduledEmails } from "@/components/dashboard/ScheduledEmails";
import { Campaigns } from "@/components/dashboard/Campaigns";
import CompanyDetails from "@/components/dashboard/CompanyDetails";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const { user, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState("search");

  useEffect(() => {
    const tab = searchParams.get("tab");
    if (tab) {
      setActiveTab(tab);
      // Nettoyer l'URL après avoir défini l'onglet
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  // Traiter le callback OAuth directement sur le dashboard
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

    // Une fois sur le dashboard, la session doit être prête
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
      } else {
        console.warn('Aucun token Gmail détecté dans le hash ni la session.');
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
          <header className="border-b bg-card">
            <div className="flex items-center justify-between p-4">
              <div>
                <h1 className="font-display text-xl font-bold">API recherche-entreprises.api.gouv.fr</h1>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">{user?.email}</span>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Déconnexion
                </Button>
              </div>
            </div>
          </header>
          
          <main className="flex-1 p-6">
            <div className={activeTab === "search" ? "block" : "hidden"}>
              <SearchCompanies />
            </div>
            <div className={activeTab === "pipeline" ? "block" : "hidden"}>
              <Pipeline />
            </div>
            <div className={activeTab === "jobs" ? "block" : "hidden"}>
              <JobOffers />
            </div>
            <div className={activeTab === "statistics" ? "block" : "hidden"}>
              <Statistics />
            </div>
            <div className={activeTab === "email-search" ? "block" : "hidden"}>
              <EmailSearch onNavigateToContacts={() => setActiveTab("contact-emails")} />
            </div>
            <div className={activeTab === "contact-emails" ? "block" : "hidden"}>
              <ContactEmails />
            </div>
            <div className={activeTab === "email-composer" ? "block" : "hidden"}>
              <EmailComposer />
            </div>
            <div className={activeTab === "scheduled-emails" ? "block" : "hidden"}>
              <ScheduledEmails />
            </div>
            <div className={activeTab === "campaigns" ? "block" : "hidden"}>
              <Campaigns />
            </div>
            <div className={activeTab === "company-details" ? "block" : "hidden"}>
              <div className="p-6">
                <h2 className="text-2xl font-bold mb-6">Détails des Entreprises</h2>
                <CompanyDetails />
              </div>
            </div>
            <div className={activeTab === "notifications" ? "block" : "hidden"}>
              <Notifications />
            </div>
            <div className={activeTab === "support" ? "block" : "hidden"}>
              <Support />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
