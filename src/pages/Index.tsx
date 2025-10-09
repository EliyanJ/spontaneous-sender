import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center justify-between p-4">
          <h1 className="text-2xl font-bold">Prospection Entreprises</h1>
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
        <div className="text-center">
          <h2 className="mb-4 text-3xl font-bold">Bienvenue !</h2>
          <p className="text-muted-foreground">
            Votre plateforme de prospection d'entreprises est prête.
          </p>
        </div>
      </main>
    </div>
  );
};

export default Index;
