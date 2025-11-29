import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/AuthDialog";
import { ArrowRight, Building2, Mail, Search, Zap, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl animate-float" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold text-foreground">Connexions</span>
          </div>
          <nav className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setAuthOpen(true)}
              className="text-muted-foreground hover:text-foreground"
            >
              Se connecter
            </Button>
            <Button 
              size="sm"
              onClick={() => setAuthOpen(true)}
              className="bg-primary hover:bg-primary/90"
            >
              Commencer
            </Button>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 py-20 text-center">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-fade-in">
              <Zap className="h-4 w-4 text-primary" />
              <span className="text-sm text-primary font-medium">Candidatures spontanées intelligentes</span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Décrochez votre
              <br />
              <span className="gradient-text">prochain emploi</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Trouvez les entreprises qui correspondent à votre profil, découvrez automatiquement les contacts RH, et envoyez vos candidatures personnalisées.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                size="lg" 
                onClick={() => setAuthOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12 text-base font-medium shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid gap-4 pt-20 md:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              {[
                { icon: Search, title: "Recherche ciblée", desc: "Identifiez les entreprises qui recrutent dans votre secteur" },
                { icon: Mail, title: "Contacts automatiques", desc: "L'IA trouve les emails RH et recruteurs" },
                { icon: Zap, title: "Emails personnalisés", desc: "Envoyez des candidatures adaptées en quelques clics" },
              ].map((feature, i) => (
                <div key={i} className="group glass-hover rounded-2xl p-6 text-left">
                  <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="glass rounded-2xl p-8 mt-12 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="grid gap-8 md:grid-cols-3 text-center">
                {[
                  { value: "10k+", label: "Entreprises prospectées" },
                  { value: "5k+", label: "Emails trouvés" },
                  { value: "95%", label: "Taux de précision" },
                ].map((stat, i) => (
                  <div key={i}>
                    <div className="text-3xl font-bold text-primary">{stat.value}</div>
                    <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border bg-card/30 backdrop-blur-sm mt-20">
          <div className="container mx-auto px-6 py-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-display font-semibold text-foreground">Connexions</span>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <a href="/privacy-policy" className="hover:text-foreground transition">Confidentialité</a>
                <a href="/terms-of-service" className="hover:text-foreground transition">Conditions</a>
              </div>
              <p className="text-sm text-muted-foreground">© 2025 Connexions</p>
            </div>
          </div>
        </footer>

        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    </div>
  );
};

export default Landing;
