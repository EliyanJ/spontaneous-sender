import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AuthDialog } from "@/components/AuthDialog";
import { ArrowRight, Building2, Mail, Search, Zap, Moon, Sun } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const Landing = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl animate-float" />
      </div>

      <div className="relative z-10">
        {/* Header */}
        <header className="container mx-auto flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/20">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">Cronos</span>
          </div>
          <nav className="flex items-center gap-3">
            {/* Theme Toggle */}
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="rounded-full w-10 h-10 hover:bg-accent"
            >
              {isDark ? (
                <Moon className="h-5 w-5" />
              ) : (
                <Sun className="h-5 w-5" />
              )}
            </Button>
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
              className="btn-premium bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              Commencer
            </Button>
          </nav>
        </header>

        {/* Hero Section */}
        <main className="container mx-auto px-6 py-16 md:py-24 text-center">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-fade-in">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm text-primary font-medium">Candidatures spontanées intelligentes</span>
            </div>

            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-tight text-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Décrochez votre
              <br />
              <span className="gradient-text bg-gradient-to-r from-primary via-primary to-blue-400 bg-clip-text text-transparent">prochain emploi</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Trouvez les entreprises qui correspondent à votre profil, découvrez automatiquement les contacts RH, et envoyez vos candidatures personnalisées.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                size="lg" 
                onClick={() => setAuthOpen(true)}
                className="btn-premium bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-14 text-base font-semibold shadow-xl shadow-primary/30 transition-all duration-300"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            {/* Features Grid */}
            <div className="grid gap-4 pt-16 md:grid-cols-3 animate-fade-in" style={{ animationDelay: '0.4s' }}>
              {[
                { icon: Search, title: "Recherche ciblée", desc: "Identifiez les entreprises qui recrutent dans votre secteur" },
                { icon: Mail, title: "Contacts automatiques", desc: "L'IA trouve les emails RH et recruteurs" },
                { icon: Zap, title: "Emails personnalisés", desc: "Envoyez des candidatures adaptées en quelques clics" },
              ].map((feature, i) => (
                <div 
                  key={i} 
                  className="group card-glow rounded-2xl p-6 text-left bg-card border border-border/50 hover:border-primary/30 transition-all duration-300"
                  style={{ animationDelay: `${0.4 + i * 0.1}s` }}
                >
                  <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                    <feature.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-foreground group-hover:text-primary transition-colors duration-300">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.desc}</p>
                </div>
              ))}
            </div>

            {/* Stats */}
            <div className="glass rounded-2xl p-8 mt-8 animate-fade-in border border-border/50" style={{ animationDelay: '0.5s' }}>
              <div className="grid gap-8 md:grid-cols-3 text-center">
                {[
                  { value: "10k+", label: "Entreprises prospectées" },
                  { value: "5k+", label: "Emails trouvés" },
                  { value: "95%", label: "Taux de précision" },
                ].map((stat, i) => (
                  <div key={i} className="group">
                    <div className="text-4xl font-bold gradient-text bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent group-hover:scale-110 transition-transform duration-300">{stat.value}</div>
                    <div className="text-sm text-muted-foreground mt-2">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm mt-16">
          <div className="container mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                <span className="font-display font-semibold text-foreground">Cronos</span>
              </div>
              <div className="flex gap-6 text-sm text-muted-foreground">
                <a href="/privacy-policy" className="hover:text-primary transition-colors duration-300">Confidentialité</a>
                <a href="/privacy-policy-en" className="hover:text-primary transition-colors duration-300">Privacy (EN)</a>
                <a href="/terms-of-service" className="hover:text-primary transition-colors duration-300">Conditions</a>
                <a href="/mentions-legales" className="hover:text-primary transition-colors duration-300">Mentions légales</a>
              </div>
              <p className="text-sm text-muted-foreground">© 2025 Cronos</p>
            </div>
          </div>
        </footer>

        <AuthDialog open={authOpen} onOpenChange={setAuthOpen} />
      </div>
    </div>
  );
};

export default Landing;
