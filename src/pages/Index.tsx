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
            <h1 className="font-display text-2xl font-bold">Prospection Entreprises</h1>
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
      
      <main className="container mx-auto p-6 space-y-6">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary/90 to-accent p-8 shadow-lg">
          <div className="absolute inset-0 bg-grid-white/10"></div>
          <div className="relative">
            <h2 className="font-display text-4xl font-bold text-white mb-3">
              Accélérez votre prospection B2B
            </h2>
            <p className="text-lg text-white/90 max-w-2xl">
              Recherchez, enregistrez et trouvez automatiquement les emails de contact des entreprises ciblées avec 20 salariés minimum.
            </p>
          </div>
        </section>
        <Tabs defaultValue="search" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-auto p-1.5 bg-card shadow-sm">
            <TabsTrigger 
              value="search" 
              className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Search className="h-5 w-5" />
              <span className="text-xs font-medium">Recherche</span>
            </TabsTrigger>
            <TabsTrigger 
              value="companies" 
              className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Building2 className="h-5 w-5" />
              <span className="text-xs font-medium">Entreprises</span>
            </TabsTrigger>
            <TabsTrigger 
              value="campaigns" 
              className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Mail className="h-5 w-5" />
              <span className="text-xs font-medium">Campagnes</span>
            </TabsTrigger>
            <TabsTrigger 
              value="blacklist" 
              className="flex flex-col items-center gap-1.5 py-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all"
            >
              <Ban className="h-5 w-5" />
              <span className="text-xs font-medium">Blacklist</span>
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
