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
      {/* Soft sky blue gradient like Cluely */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#5B9FD8] via-[#E8F4FD] to-[#A8D5F2]"></div>
      {/* Mountains image overlay with low opacity */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-15"
        style={{ backgroundImage: `url(${mountainsBg})` }}
      ></div>
      <div className="relative z-10">
      {/* Header */}
      <header className="container mx-auto flex items-center justify-between px-6 py-6">
        <div className="flex items-center gap-3">
          <span className="font-display text-2xl font-bold text-gray-900">ProspectAI</span>
        </div>
        <nav className="hidden items-center gap-8 md:flex">
          <a href="#features" className="text-sm text-gray-800 transition hover:text-blue-600">
            Fonctionnalités
          </a>
          <a href="#how-it-works" className="text-sm text-gray-800 transition hover:text-blue-600">
            Comment ça marche
          </a>
          <Button 
            variant="default" 
            size="sm"
            onClick={() => setAuthOpen(true)}
            className="rounded-full bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Se connecter
          </Button>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-6 py-20 text-center">
        <div className="mx-auto max-w-4xl space-y-8">
          <h1 className="font-display text-5xl font-bold leading-tight text-gray-900 md:text-7xl animate-fade-in">
            Votre assistant IA
            <br />
            <span className="text-blue-600">pour la prospection</span>
          </h1>
          
          <p className="mx-auto max-w-2xl text-lg text-gray-700 md:text-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
            Trouvez les entreprises qui correspondent à vos critères, découvrez automatiquement les emails de contact, et lancez vos campagnes de prospection en quelques clics.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <Button 
              size="lg" 
              onClick={() => setAuthOpen(true)}
              className="rounded-full bg-blue-600 text-white hover:bg-blue-700 font-semibold text-base px-8 h-12 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          {/* Features Grid */}
          <div id="features" className="grid gap-6 pt-20 md:grid-cols-3">
            <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 text-gray-900 shadow-lg transition hover:shadow-xl animate-fade-in hover:scale-105 duration-300" style={{ animationDelay: '0.6s' }}>
              <div className="mb-4 inline-block rounded-full bg-blue-100 p-3">
                <Search className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Recherche intelligente</h3>
              <p className="text-gray-600">
                Filtrez par secteur, taille, localisation et trouvez vos prospects idéaux
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 text-gray-900 shadow-lg transition hover:shadow-xl animate-fade-in hover:scale-105 duration-300" style={{ animationDelay: '0.8s' }}>
              <div className="mb-4 inline-block rounded-full bg-blue-100 p-3">
                <Mail className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Emails automatiques</h3>
              <p className="text-gray-600">
                L'IA scanne les sites web et trouve automatiquement les emails de contact
              </p>
            </div>

            <div className="rounded-2xl bg-white/80 backdrop-blur-sm p-8 text-gray-900 shadow-lg transition hover:shadow-xl animate-fade-in hover:scale-105 duration-300" style={{ animationDelay: '1s' }}>
              <div className="mb-4 inline-block rounded-full bg-blue-100 p-3">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <h3 className="mb-2 text-xl font-semibold">Campagnes rapides</h3>
              <p className="text-gray-600">
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
