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
  Sparkles,
  Gift,
  Crown,
  Play,
  Infinity
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import cronosLogo from "@/assets/cronos-logo.png";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
    { step: "1", title: "Définis ce que tu recherches", desc: "Stage, alternance ou emploi — secteur, ville, région, type d'entreprise.", icon: Search },
    { step: "2", title: "Cronos trouve les entreprises & contacts RH", desc: "Recherche intelligente + détection automatique des emails recruteurs.", icon: Target },
    { step: "3", title: "L'IA rédige et envoie tes candidatures", desc: "Emails et lettres de motivation personnalisés, envoyés via ton Gmail.", icon: Mail },
    { step: "4", title: "Tu suis tout depuis un dashboard clair", desc: "Réponses, relances, statistiques, pipeline visuel.", icon: BarChart3 },
  ];

  const features = [
    {
      icon: Search,
      title: "Recherche & Collecte",
      items: ["Recherche IA guidée par poste", "Multi-villes & régions", "Filtres par taille d'entreprise"]
    },
    {
      icon: Mail,
      title: "Emails & Lettres IA",
      items: ["Emails RH trouvés automatiquement", "Messages personnalisés par entreprise", "Lettres basées sur ton CV + données réelles"]
    },
    {
      icon: Send,
      title: "Envoi Simple & Natif",
      items: ["Connexion Gmail sécurisée", "Envoi immédiat ou programmé", "Pièces jointes (CV, LM)"]
    },
    {
      icon: BarChart3,
      title: "Suivi & Relances",
      items: ["Pipeline visuel", "Statistiques claires", "Relances automatiques"]
    },
  ];

  const comparison = [
    { feature: "Rédaction d'emails", cronos: true, classic: false },
    { feature: "Recherche d'emails RH", cronos: true, classic: false },
    { feature: "Scraping intelligent", cronos: true, classic: false },
    { feature: "Pipeline visuel", cronos: true, classic: false },
    { feature: "Envoi Gmail natif", cronos: true, classic: false },
    { feature: "Gratuit pour commencer", cronos: true, classic: false },
  ];

  const statsBar = [
    { value: "-90%", label: "de temps sur la recherche" },
    { value: "x20", label: "candidatures envoyées" },
    { value: "+45%", label: "de taux de réponse" },
    { value: "∞", label: "opportunités cachées" },
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
        {/* Header */}
        <header className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6">
          <div className="hidden sm:flex items-center gap-3">
            <img src={cronosLogo} alt="Cronos" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-xl font-bold text-foreground">Cronos</span>
          </div>
          
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setIsDark(!isDark)}
            className="sm:hidden rounded-full w-10 h-10 hover:bg-accent"
          >
            {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          </Button>
          
          <nav className="hidden md:flex items-center gap-8">
            <button onClick={() => scrollToSection('features')} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Fonctionnalités</button>
            <button onClick={() => scrollToSection('how-it-works')} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Comment ça marche</button>
            <button onClick={() => scrollToSection('pricing')} className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Tarification</button>
          </nav>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="hidden sm:flex rounded-full w-10 h-10 hover:bg-accent">
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground hover:text-foreground text-xs sm:text-sm px-2 sm:px-3">Se connecter</Button>
            <Button size="sm" onClick={() => navigate("/login")} className="btn-premium bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 text-xs sm:text-sm px-3 sm:px-4 whitespace-nowrap">Commencer</Button>
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

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <Button 
                size="lg" 
                onClick={() => navigate("/login")}
                className="btn-premium bg-primary hover:bg-primary/90 text-primary-foreground px-8 h-14 text-base font-semibold shadow-xl shadow-primary/30 transition-all duration-300"
              >
                Commencer gratuitement
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline"
                onClick={() => scrollToSection('how-it-works')}
                className="px-8 h-14 text-base font-semibold border-border hover:bg-accent"
              >
                <Play className="mr-2 h-5 w-5" />
                Voir la démo
              </Button>
            </div>
            
            <div className="flex flex-wrap justify-center gap-4 text-sm text-muted-foreground animate-fade-in" style={{ animationDelay: '0.35s' }}>
              <span className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-primary" /> Gratuit pour démarrer
              </span>
              <span className="flex items-center gap-1">🇫🇷 100 % français</span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4 text-primary" /> Gain de temps immédiat
              </span>
            </div>
          </div>

          {/* Browser Frame Mockup */}
          <div className="mx-auto max-w-5xl mt-16 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <div className="rounded-xl border border-border/50 bg-card shadow-2xl shadow-primary/10 overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border/50">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/70" />
                  <div className="w-3 h-3 rounded-full bg-warning/70" />
                  <div className="w-3 h-3 rounded-full bg-success/70" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-background rounded-md px-3 py-1.5 text-xs text-muted-foreground text-center max-w-xs mx-auto">
                    app.cronos.fr/dashboard
                  </div>
                </div>
              </div>
              {/* Dashboard mockup content */}
              <div className="p-6 bg-background/50">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {["Candidatures envoyées", "Réponses reçues", "Entreprises trouvées", "Taux de réponse"].map((label, i) => (
                    <div key={i} className="rounded-lg bg-card border border-border/50 p-4">
                      <div className="text-xs text-muted-foreground mb-1">{label}</div>
                      <div className="text-2xl font-bold text-foreground">
                        {["147", "23", "89", "15.6%"][i]}
                      </div>
                      <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${[73, 45, 62, 80][i]}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 rounded-lg bg-card border border-border/50 p-4 h-32">
                    <div className="text-xs text-muted-foreground mb-3">Pipeline de candidatures</div>
                    <div className="flex gap-2 h-16">
                      {[60, 40, 75, 30, 55, 45, 65].map((h, i) => (
                        <div key={i} className="flex-1 flex items-end">
                          <div className="w-full rounded-t bg-primary/60" style={{ height: `${h}%` }} />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-lg bg-card border border-border/50 p-4 h-32">
                    <div className="text-xs text-muted-foreground mb-3">Dernières réponses</div>
                    <div className="space-y-2">
                      {["Réponse positive", "Entretien planifié", "En attente"].map((item, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs">
                          <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-success' : i === 1 ? 'bg-primary' : 'bg-warning'}`} />
                          <span className="text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TARGET AUDIENCE Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">À qui s'adresse Cronos ?</h2>
            <p className="text-muted-foreground text-lg">Une solution adaptée à chaque étape de votre parcours professionnel</p>
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
        </section>

        {/* HOW IT WORKS Section - Timeline zigzag */}
        <section id="how-it-works" className="container mx-auto px-6 py-16 bg-card/30">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-semibold text-primary uppercase tracking-wider mb-4">
              Processus simple
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Comment ça marche</h2>
            <p className="text-muted-foreground text-lg">Simplement, en 4 étapes</p>
          </div>
          
          <div className="max-w-5xl mx-auto relative">
            {/* Vertical connecting line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px border-l-2 border-dashed border-border hidden lg:block" />
            
            <div className="space-y-12 lg:space-y-16">
              {howItWorks.map((step, i) => (
                <div 
                  key={i}
                  className={`flex flex-col lg:flex-row items-center gap-8 lg:gap-16 animate-fade-in ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
                  style={{ animationDelay: `${i * 0.15}s` }}
                >
                  {/* Content side */}
                  <div className="flex-1 text-center lg:text-left">
                    <div className="inline-flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg">
                        {step.step}
                      </div>
                      <h3 className="text-xl font-semibold text-foreground">{step.title}</h3>
                    </div>
                    <p className="text-muted-foreground max-w-md">{step.desc}</p>
                  </div>
                  
                  {/* Visual/mockup side */}
                  <div className="flex-1 flex justify-center">
                    <div className="w-full max-w-sm rounded-2xl bg-card border border-border/50 p-6 shadow-lg">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <step.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="h-2.5 bg-muted rounded-full flex-1" />
                      </div>
                      <div className="space-y-2">
                        <div className="h-2 bg-muted rounded-full w-full" />
                        <div className="h-2 bg-muted rounded-full w-4/5" />
                        <div className="h-2 bg-muted rounded-full w-3/5" />
                      </div>
                      <div className="mt-4 flex gap-2">
                        <div className="h-8 bg-primary/20 rounded-lg flex-1" />
                        <div className="h-8 bg-muted rounded-lg flex-1" />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <p className="text-center text-lg font-medium text-primary mt-12">
            👉 Résultat : plus de candidatures pertinentes, moins de temps perdu.
          </p>
        </section>

        {/* FEATURES Section */}
        <section id="features" className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Fonctionnalités Puissantes</h2>
            <p className="text-muted-foreground text-lg">Tout ce dont tu as besoin pour automatiser ta recherche.</p>
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

        {/* COMPARISON Section - Table style */}
        <section className="container mx-auto px-6 py-16 bg-card/30">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Pourquoi choisir Cronos ?</h2>
          </div>
          
          <div className="max-w-3xl mx-auto rounded-2xl overflow-hidden border border-border/50 bg-card">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-foreground font-semibold text-sm uppercase tracking-wider">Fonctionnalité</TableHead>
                  <TableHead className="text-center text-foreground font-semibold text-sm uppercase tracking-wider">Cronos</TableHead>
                  <TableHead className="text-center text-foreground font-semibold text-sm uppercase tracking-wider">Classique</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {comparison.map((row, i) => (
                  <TableRow key={i} className="hover:bg-muted/20">
                    <TableCell className="text-foreground font-medium">{row.feature}</TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex w-5 h-5 rounded-full bg-primary" />
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="inline-flex w-5 h-5 rounded-full bg-muted-foreground/30" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>

        {/* STATS BAR Section */}
        <section className="w-full py-16 bg-gradient-to-r from-primary via-primary/80 to-[hsl(260_60%_55%)]">
          <div className="container mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-5xl mx-auto text-center">
              {statsBar.map((stat, i) => (
                <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-2">
                    {stat.value}
                  </div>
                  <div className="text-primary-foreground/70 text-sm md:text-base">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* SOCIAL PROOF Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Ils nous font confiance</h2>
          </div>
          
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 max-w-4xl mx-auto opacity-50">
            {["AWS", "Google", "Web Summit", "BPI France", "Station F"].map((name, i) => (
              <div key={i} className="text-lg md:text-xl font-semibold text-muted-foreground/60 hover:text-muted-foreground transition-colors">
                {name}
              </div>
            ))}
          </div>
        </section>

        {/* PRICING Section */}
        <section id="pricing" className="container mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">Tarification Simple</h2>
            <p className="text-muted-foreground text-lg">Choisissez le plan adapté à vos besoins</p>
          </div>
          
          <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
            {/* Gratuit */}
            <div className="rounded-2xl p-6 bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in">
              <div className="mb-4 inline-flex p-3 rounded-xl bg-muted">
                <Gift className="h-6 w-6 text-muted-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Gratuit</h3>
              <p className="text-muted-foreground text-sm mb-4">Pour découvrir Cronos et faire ses premières candidatures.</p>
              <div className="text-3xl font-bold text-foreground mb-6">0€</div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />5 envois par mois</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Recherche automatique par département</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Template email générique</li>
              </ul>
              <Button variant="outline" className="w-full" onClick={() => navigate("/login")}>
                Commencer gratuitement
              </Button>
            </div>
            
            {/* Standard */}
            <div className="rounded-2xl p-6 bg-card border-2 border-primary shadow-lg shadow-primary/10 transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10">
                <Rocket className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Standard</h3>
              <p className="text-muted-foreground text-sm mb-4">Pour une recherche sérieuse avec plus de volume.</p>
              <div className="text-3xl font-bold text-primary mb-6">14€<span className="text-sm text-muted-foreground font-normal">/mois</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />100 envois par mois</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Recherche automatique par département</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Template email générique</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Suivi des réponses</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Support par email</li>
              </ul>
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => navigate("/login")}>
                Choisir Standard
              </Button>
            </div>
            
            {/* Premium */}
            <div className="rounded-2xl p-6 bg-card border border-border/50 hover:border-primary/30 transition-all duration-300 animate-fade-in relative" style={{ animationDelay: '0.2s' }}>
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full">
                Premium
              </div>
              <div className="mb-4 inline-flex p-3 rounded-xl bg-primary/10">
                <Crown className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-xl font-bold text-foreground mb-2">Premium</h3>
              <p className="text-muted-foreground text-sm mb-4">Toutes les fonctionnalités IA pour maximiser tes chances.</p>
              <div className="text-3xl font-bold text-foreground mb-6">39€<span className="text-sm text-muted-foreground font-normal">/mois</span></div>
              <ul className="space-y-2 text-sm text-muted-foreground mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />400 envois par mois</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Recherche IA + manuelle par ville</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Emails personnalisés par IA</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Lettres de motivation générées</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Accès aux offres d'emploi</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-primary" />Support prioritaire</li>
              </ul>
              <Button className="w-full bg-primary hover:bg-primary/90" onClick={() => navigate("/login")}>
                Devenir Premium
              </Button>
            </div>
          </div>
          
          <div className="text-center mt-8 space-y-2">
            <p className="text-sm text-muted-foreground">
              Besoin de plus de crédits ? <button onClick={() => navigate("/login")} className="text-primary hover:underline font-medium">Acheter des tokens</button>
            </p>
          </div>
        </section>

        {/* FINAL CTA Section */}
        <section className="container mx-auto px-4 sm:px-6 py-12 sm:py-20">
          <div className="max-w-3xl mx-auto text-center glass rounded-3xl p-6 sm:p-12 border border-primary/20 animate-glow-pulse">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-4">
              Prêt à décrocher ton stage, ton alternance ou ton job ?
            </h2>
            <p className="text-muted-foreground text-base sm:text-lg mb-6 sm:mb-8">
              Moins de candidatures dans le vide. Plus de réponses.
            </p>
            <Button 
              size="lg" 
              onClick={() => navigate("/login")}
              className="btn-premium bg-primary hover:bg-primary/90 text-primary-foreground px-6 sm:px-10 h-12 sm:h-14 text-sm sm:text-lg font-semibold shadow-xl shadow-primary/30 whitespace-nowrap max-w-full"
            >
              Créer mon compte gratuitement
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
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
