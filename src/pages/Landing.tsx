import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/AuthDialog";
import { ArrowRight, Building2, Mail, Search, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import mountainsBg from "@/assets/mountains-bg.jpg";

const Landing = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Si déjà connecté, rediriger vers le dashboard
  if (user) {
    navigate("/dashboard");
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Background image with mountains */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${mountainsBg})` }}
      ></div>
      {/* Gradient overlay with vivid colors */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/85 via-indigo-600/80 to-purple-600/85"></div>
      <div className="relative z-10">
      {/* Header */}
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <Building2 className="h-8 w-8 text-white" />
          <span className="font-display text-2xl font-bold text-white">ProspectAI</span>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-white/90 transition hover:text-white">
            Fonctionnalités
          </a>
          <a href="#how-it-works" className="text-sm text-white/90 transition hover:text-white">
            Comment ça marche
          </a>
          <Button 
            variant="secondary" 
            size="sm"
            onClick={() => setAuthOpen(true)}
            className="bg-white text-primary hover:bg-white/90"
          >
            Se connecter
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          <h1 className="font-display text-5xl font-bold leading-tight text-white md:text-7xl">
            Votre assistant IA
            <br />
            <span className="text-white/90">pour la prospection</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-white/90 md:text-xl">
            Trouvez les entreprises qui correspondent à vos critères, découvrez automatiquement les emails de contact, et lancez vos campagnes de prospection en quelques clics.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button 
              size="lg" 
              onClick={() => setAuthOpen(true)}
              className="bg-white text-primary hover:bg-white/90 font-semibold text-base px-8 h-12"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid gap-6 pt-20 md:grid-cols-3">
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-8 text-white transition hover:bg-white/15">
              <div className="mb-4 inline-block rounded-full bg-white/20 p-3">
                <Search className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Recherche intelligente</h3>
              <p className="text-white/80">
                Filtrez par secteur, taille, localisation et trouvez vos prospects idéaux
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-8 text-white transition hover:bg-white/15">
              <div className="mb-4 inline-block rounded-full bg-white/20 p-3">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Emails automatiques</h3>
              <p className="text-white/80">
                L'IA scanne les sites web et trouve automatiquement les emails de contact
              </p>
            </div>

            <div className="rounded-2xl bg-white/10 backdrop-blur-sm p-8 text-white transition hover:bg-white/15">
              <div className="mb-4 inline-block rounded-full bg-white/20 p-3">
                <Zap className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Campagnes rapides</h3>
              <p className="text-white/80">
                Lancez vos campagnes d'emailing directement depuis la plateforme
              </p>
            </div>
          </div>
        </div>
      </main>

      <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    </div>
  );
};

export default Landing;
