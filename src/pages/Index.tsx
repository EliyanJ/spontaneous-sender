import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Search, Mail, Building2, Ban } from "lucide-react";
import { SearchCompanies } from "@/components/dashboard/SearchCompanies";
import { SavedCompanies } from "@/components/dashboard/SavedCompanies";
import { Campaigns } from "@/components/dashboard/Campaigns";
import { Blacklist } from "@/components/dashboard/Blacklist";

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between p-4">
          <div>
            <h1 className="text-2xl font-bold">Prospection Entreprises</h1>
            <p className="text-sm text-muted-foreground">API recherche-entreprises.api.gouv.fr</p>
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
      
      <main className="container mx-auto p-6">
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Recherche
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Entreprises
            </TabsTrigger>
            <TabsTrigger value="campaigns" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Campagnes
            </TabsTrigger>
            <TabsTrigger value="blacklist" className="flex items-center gap-2">
              <Ban className="h-4 w-4" />
              Blacklist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="search">
            <SearchCompanies />
          </TabsContent>

          <TabsContent value="companies">
            <SavedCompanies />
          </TabsContent>

          <TabsContent value="campaigns">
            <Campaigns />
          </TabsContent>

          <TabsContent value="blacklist">
            <Blacklist />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Index;
