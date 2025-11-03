import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { SearchCompanies } from "@/components/dashboard/SearchCompanies";
import { Blacklist } from "@/components/dashboard/Blacklist";
import { Statistics } from "@/components/dashboard/Statistics";
import { Notifications } from "@/components/dashboard/Notifications";
import { Support } from "@/components/dashboard/Support";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("search");

  const renderContent = () => {
    switch (activeTab) {
      case "search":
        return <SearchCompanies />;
      case "statistics":
        return <Statistics />;
      case "blacklist":
        return <Blacklist />;
      case "notifications":
        return <Notifications />;
      case "support":
        return <Support />;
      default:
        return <SearchCompanies />;
    }
  };

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
            {renderContent()}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
