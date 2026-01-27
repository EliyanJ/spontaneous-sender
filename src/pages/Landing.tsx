import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Moon, 
  Sun, 
  GraduationCap, 
  RefreshCw, 
  Rocket, 
  Repeat,
  Search,
  Mail,
  Send,
  BarChart3,
  CheckCircle,
  Zap,
  Clock,
  Target,
  Eye,
  X,
  Sparkles,
  Gift,
  Crown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import cronosLogo from "@/assets/cronos-logo.png";

const Landing = () => {
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

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const targetAudience = [
    { icon: GraduationCap, title: "Étudiant", desc: "À la recherche d'un stage obligatoire" },
    { icon: RefreshCw, title: "Alternant", desc: "En recherche d'alternance" },
    { icon: Rocket, title: "Jeune diplômé", desc: "Pour ton premier job / CDI" },
    { icon: Repeat, title: "En reconversion", desc: "Avec peu de réponses aux candidatures" },
  ];

  const howItWorks = [
    { step: "1", title: "Définis ce que tu recherches", desc: "Stage, alternance ou emploi — secteur, ville, région, type d'entreprise." },
    { step: "2", title: "Cronos trouve les entreprises & contacts RH", desc: "Recherche intelligente + détection automatique des emails recruteurs." },
    { step: "3", title: "L'IA rédige et envoie tes candidatures", desc: "Emails et lettres de motivation personnalisés, envoyés via ton Gmail." },
    { step: "4", title: "Tu suis tout depuis un dashboard clair", desc: "Réponses, relances, statistiques, pipeline visuel." },
  ];

  const features = [
    {
      icon: Search,
      title: "Prospection intelligente",
      items: ["Recherche IA guidée par poste", "Multi-villes & régions", "Filtres par taille d'entreprise"]
    },
    {
      icon: Mail,
      title: "Emails & lettres IA",
      items: ["Emails RH trouvés automatiquement", "Messages personnalisés par entreprise", "Lettres basées sur ton CV + données réelles"]
    },
    {
      icon: Send,
      title: "Envoi simple & natif",
      items: ["Connexion Gmail sécurisée", "Envoi immédiat ou programmé", "Pièces jointes (CV, LM)"]
    },
    {
      icon: BarChart3,
      title: "Suivi & relances",
      items: ["Pipeline visuel", "Statistiques claires", "Relances automatiques"]
    },
  ];

  const comparison = [
    { cronos: "IA pour emails & lettres", classic: "Rédaction manuelle" },
    { cronos: "Recherche automatique d'emails", classic: "Copier-coller LinkedIn" },
    { cronos: "Scraping intelligent", classic: "Recherche Google" },
    { cronos: "Pipeline visuel", classic: "Excel / Google Sheets" },
    { cronos: "Envoi Gmail natif", classic: "Email par email" },
    { cronos: "Gratuit pour commencer", classic: "Outils pro hors de prix" },
  ];

  const results = [
    { icon: Clock, value: "–90%", label: "de temps sur la recherche et l'envoi" },
    { icon: Send, value: "x10 à x20", label: "candidatures envoyées" },
    { icon: Target, value: "Meilleur taux", label: "de réponse grâce à la personnalisation" },
    { icon: Eye, value: "Opportunités", label: "cachées (sans annonce)" },
  ];

  const stats = [
    { value: "10 000+", label: "Entreprises prospectées" },
    { value: "5 000+", label: "Emails RH trouvés" },
    { value: "95%", label: "Précision" },
  ];

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] rounded-full bg-primary/5 blur-3xl animate-float" />
      </div>

      <div className="relative z-10">
        {/* Header avec navigation horizontale */}
        <header className="container mx-auto flex items-center justify-between px-6 py-6">
          <div className="flex items-center gap-3">
            <img src={cronosLogo} alt="Cronos" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-xl font-bold text-foreground">Cronos</span>
          </div>
          
          {/* Navigation horizontale - style Shopify */}
          <nav className="hidden md:flex items-center gap-8">
            <button 
              onClick={() => scrollToSection('features')}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            >
              Fonctionnalités
            </button>
            <button 
              onClick={() => scrollToSection('how-it-works')}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            >
              Comment ça marche
            </button>
            <button 
              onClick={() => scrollToSection('pricing')}
              className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium"
            >
              Tarification
            </button>
          </nav>

          <nav className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="rounded-full w-10 h-10 hover:bg-accent"
            >
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate("/login")}
              className="text-muted-foreground hover:text-foreground"
            >
              Se connecter
            </Button>
            <Button 
              size="sm"
              onClick={() => navigate("/login")}
              className="btn-premium bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
            >
              Commencer
            </Button>
          </nav>
        </header>

        {/* HERO Section */}
        <section className="container mx-auto px-6 py-16 md:py-24 text-center">
          <div className="mx-auto max-w-4xl space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 animate-fade-in">
              <Zap className="h-4 w-4 text-primary animate-pulse" />
              <span className="text-sm text-primary font-medium">Candidatures spontanées intelligentes</span>
            </div>

            <h1 className="font-display text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Trouve ton stage, ton alternance
              <br />
              ou ton premier job — <span className="gradient-text">plus vite.</span>
            </h1>
            
            <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground animate-fade-in" style={{ animationDelay: '0.2s' }}>
              Cronos automatise les candidatures spontanées : trouve les bonnes entreprises, récupère les contacts RH et envoie des emails personnalisés générés par IA.
            </p>

            <p className="text-primary font-medium text-lg animate-fade-in" style={{ animationDelay: '0.25s' }}>
              👉 Moins de stress. Plus d'opportunités.
            </p>

            <div className="flex flex-col items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                size="lg" 
                onClick={() => navigate("/login")}
                className="btn-premium bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-14 text-base font-semibold shadow-xl shadow-primary/30 transition-all duration-300"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              
              <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-primary" /> Gratuit pour démarrer
                </span>
                <span className="flex items-center gap-1">
                  🇫🇷 100 % français
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-primary" /> Gain de temps immédiat
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* TARGET AUDIENCE Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">À qui s'adresse Cronos ?</h2>
            <p className="text-muted-foreground text-lg">Tu es :</p>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {targetAudience.map((item, i) => (
              <div 
                key={i}
                className="group card-glow rounded-2xl p-6 text-center bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-4 inline-flex p-4 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                  <item.icon className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
          
          <p className="text-center text-xl font-medium text-primary mt-10 animate-fade-in">
            👉 Cronos est fait pour toi.
          </p>
        </section>

        {/* HOW IT WORKS Section */}
        <section id="how-it-works" className="container mx-auto px-6 py-16 bg-card/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Comment ça marche</h2>
            <p className="text-muted-foreground text-lg">Simplement, en 4 étapes</p>
          </div>
          
          <div className="max-w-4xl mx-auto space-y-6">
            {howItWorks.map((step, i) => (
              <div 
                key={i}
                className="flex items-start gap-6 p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
                  {step.step}
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
          
          <p className="text-center text-lg font-medium text-primary mt-10">
            👉 Résultat : plus de candidatures pertinentes, moins de temps perdu.
          </p>
        </section>

        {/* FEATURES Section */}
        <section id="features" className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Tout ce que Cronos fait pour toi</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-6xl mx-auto">
            {features.map((feature, i) => (
              <div 
                key={i}
                className="group card-glow rounded-2xl p-6 bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors duration-300">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-4">{feature.title}</h3>
                <ul className="space-y-2">
                  {feature.items.map((item, j) => (
                    <li key={j} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* COMPARISON Section */}
        <section className="container mx-auto px-6 py-16 bg-card/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Pourquoi Cronos est différent</h2>
          </div>
          
          <div className="max-w-3xl mx-auto">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center p-4 rounded-t-xl bg-primary text-primary-foreground font-semibold">
                Cronos ✅
              </div>
              <div className="text-center p-4 rounded-t-xl bg-muted text-muted-foreground font-semibold">
                Méthodes classiques ❌
              </div>
            </div>
            
            <div className="space-y-2">
              {comparison.map((row, i) => (
                <div key={i} className="grid grid-cols-2 gap-4 animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-primary/10 border border-primary/20">
                    <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                    <span className="text-foreground">{row.cronos}</span>
                  </div>
                  <div className="flex items-center gap-2 p-4 rounded-lg bg-muted/50 border border-border">
                    <X className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <span className="text-muted-foreground">{row.classic}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-center text-xl font-medium text-primary mt-10">
            👉 Cronos = un outil pro, pensé pour les étudiants.
          </p>
        </section>

        {/* RESULTS Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Résultats concrets</h2>
          </div>
          
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {results.map((result, i) => (
              <div 
                key={i}
                className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10">
                  <result.icon className="h-6 w-6 text-primary" />
                </div>
                <div className="text-3xl font-bold gradient-text mb-2">{result.value}</div>
                <p className="text-sm text-muted-foreground">{result.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SOCIAL PROOF Section */}
        <section className="container mx-auto px-6 py-16 bg-card/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ils utilisent déjà Cronos</h2>
          </div>
          
          <div className="glass rounded-2xl p-8 max-w-4xl mx-auto border border-border/50">
            <div className="grid gap-8 md:grid-cols-3 text-center">
              {stats.map((stat, i) => (
                <div key={i} className="group animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="text-4xl md:text-5xl font-bold gradient-text group-hover:scale-110 transition-transform duration-300">
                    {stat.value}
                  </div>
                  <div className="text-muted-foreground mt-2">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-center text-muted-foreground mt-8 italic">
            Bientôt : témoignages étudiants et logos écoles partenaires
          </p>
        </section>

        {/* PRICING Section - Prix corrigés */}
        <section id="pricing" className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Des offres simples</h2>
            <p className="text-muted-foreground text-lg">Choisissez le plan adapté à vos besoins</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Gratuit */}
            <div className="rounded-2xl p-6 bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-muted">
                <Gift className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Gratuit</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Pour découvrir Cronos et faire ses premières candidatures.
              </p>
              <div className="text-2xl font-bold text-foreground mb-4">0€</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  5 envois par mois
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Recherche automatique par département
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Template email générique
                </li>
              </ul>
            </div>
            
            {/* Standard */}
            <div className="rounded-2xl p-6 bg-card border-2 border-primary shadow-lg shadow-primary/10 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Standard</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Pour une recherche sérieuse avec plus de volume.
              </p>
              <div className="text-2xl font-bold text-primary mb-4">14€<span className="text-sm text-muted-foreground font-normal">/mois</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  100 envois par mois
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Recherche automatique par département
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Template email générique
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Suivi des réponses
                </li>
              </ul>
            </div>
            
            {/* Premium */}
            <div className="rounded-2xl p-6 bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in relative" style={{ animationDelay: '0.2s' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                Populaire
              </div>
              <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Premium</h3>
              <p className="text-muted-foreground text-sm mb-4">
                Toutes les fonctionnalités IA pour maximiser tes chances.
              </p>
              <div className="text-2xl font-bold text-foreground mb-4">39€<span className="text-sm text-muted-foreground font-normal">/mois</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  400 envois par mois
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Recherche IA + manuelle par ville
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Emails personnalisés par IA
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Lettres de motivation générées
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-primary" />
                  Accès aux offres d'emploi
                </li>
              </ul>
            </div>
          </div>
          
          <div className="text-center mt-8">
            <Button 
              size="lg" 
              onClick={() => navigate("/login")}
              className="btn-premium bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-12"
            >
              Commencer gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* FINAL CTA Section */}
        <section className="container mx-auto px-6 py-20">
          <div className="max-w-3xl mx-auto text-center glass rounded-3xl p-12 border border-primary/20 animate-glow-pulse">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Prêt à décrocher ton stage, ton alternance ou ton job ?
            </h2>
            <p className="text-muted-foreground text-lg mb-8">
              Moins de candidatures dans le vide. Plus de réponses.
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/login")}
              className="btn-premium bg-primary hover:bg-primary/90 text-primary-foreground px-10 h-14 text-lg font-semibold shadow-xl shadow-primary/30"
            >
              Créer mon compte gratuitement
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-border/50 bg-card/30 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src={cronosLogo} alt="Cronos" className="h-5 w-5" />
                <span className="font-display font-semibold text-foreground">Cronos</span>
              </div>
              <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
                <a href="/help" className="hover:text-primary transition-colors duration-300">Aide</a>
                <a href="/privacy-policy" className="hover:text-primary transition-colors duration-300">Confidentialité</a>
                <a href="/terms-of-service" className="hover:text-primary transition-colors duration-300">Conditions</a>
                <a href="/mentions-legales" className="hover:text-primary transition-colors duration-300">Mentions légales</a>
              </div>
              <p className="text-sm text-muted-foreground">© 2025 Cronos</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
