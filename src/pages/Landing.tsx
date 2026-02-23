import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
  Moon, 
  Sun, 
  GraduationCap, 
  Briefcase, 
  Award, 
  Route,
  Search,
  Mail,
  Send,
  BarChart3,
  Check,
  X,
  Zap,
  Clock,
  Play,
  Gift,
  Rocket,
  Crown,
  Flag
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import logoTransparent from "@/assets/logo-transparent.png";

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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-float" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-[hsl(260_60%_45%/0.15)] rounded-full blur-[120px] animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 -translate-y-1/2 w-[30%] h-[30%] bg-success/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10">
        {/* Header - fixed */}
        <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center gap-3">
                <img src={logoTransparent} alt="Cronos" className="h-10 w-auto" />
                <span className="text-2xl font-bold tracking-tight text-foreground font-display">Cronos</span>
              </div>

              <nav className="hidden md:flex items-center gap-8">
                <button onClick={() => navigate('/dashboard?tab=cv-score')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Comparatif de CV</button>
                <button onClick={() => navigate('/cv-builder')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Création de CV</button>
                <button onClick={() => navigate('/dashboard?tab=cv-advice')} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Conseil personnalisé</button>
              </nav>

              <div className="hidden md:flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="rounded-full">
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground hover:text-foreground">Se connecter</Button>
                <Button size="sm" onClick={() => navigate("/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 shadow-lg shadow-primary/20">Commencer</Button>
              </div>

              <div className="md:hidden flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => setIsDark(!isDark)} className="rounded-full">
                  {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
                </Button>
                <Button size="sm" onClick={() => navigate("/login")} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-4 text-xs">Commencer</Button>
              </div>
            </div>
          </div>
        </header>

        <main className="pt-20">
          {/* Hero Section */}
          <section className="relative pt-20 pb-32 overflow-hidden">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 border border-border/50 mb-8 animate-fade-in">
                <span className="flex h-2 w-2 rounded-full bg-success" />
                <span className="text-sm font-medium text-success">Nouveau : IA générative v2.0 disponible</span>
              </div>

              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground mb-6 leading-tight font-display animate-fade-in" style={{ animationDelay: '0.1s' }}>
                Trouve ton stage, ton alternance <br className="hidden md:block" />
                ou ton premier job — <span className="gradient-text">plus vite.</span>
              </h1>
              
              <p className="mt-6 max-w-2xl mx-auto text-xl text-muted-foreground mb-10 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                Cronos automatise les candidatures spontanées : trouve les bonnes entreprises, récupère les contacts RH et envoie des emails personnalisés générés par IA.
              </p>
              
              <p className="text-lg font-medium text-primary mb-8 animate-fade-in" style={{ animationDelay: '0.25s' }}>
                Moins de stress. Plus d'opportunités.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <Button 
                  size="lg" 
                  onClick={() => navigate("/login")}
                  className="w-full sm:w-auto px-8 h-14 bg-gradient-to-r from-primary to-[hsl(260_60%_55%)] hover:from-primary/90 hover:to-[hsl(260_60%_50%)] text-primary-foreground text-lg font-bold rounded-full shadow-[0_0_20px_hsl(var(--primary)/0.5)] hover:shadow-[0_0_30px_hsl(var(--primary)/0.7)] transition-all hover:scale-[1.02] active:scale-95"
                >
                  Commencer gratuitement
                </Button>
                <Button 
                  size="lg" 
                  variant="outline"
                  onClick={() => navigate('/login')}
                  className="w-full sm:w-auto px-8 h-14 bg-card/30 border-border/50 text-foreground text-lg font-semibold rounded-full backdrop-blur-sm hover:bg-card/50"
                >
                  <Play className="mr-2 h-4 w-4 text-primary" />
                  Voir la démo
                </Button>
              </div>

              <div className="flex flex-wrap justify-center items-center gap-6 sm:gap-12 text-muted-foreground text-sm font-medium animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-success" /> Gratuit pour démarrer
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-primary" /> 100% français
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-warning" /> Gain de temps immédiat
                </div>
              </div>
            </div>

            {/* Hero Dashboard Mockup */}
            <div className="relative mt-16 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in" style={{ animationDelay: '0.5s' }}>
              <div className="relative rounded-xl bg-background border border-border/50 shadow-2xl overflow-hidden aspect-[16/9] md:aspect-[21/9]">
                <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
                {/* Browser bar */}
                <div className="h-10 bg-card border-b border-border/50 flex items-center px-4 gap-2">
                  <div className="w-3 h-3 rounded-full bg-destructive" />
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <div className="ml-4 w-64 h-5 bg-muted/50 rounded-md" />
                </div>
                {/* Mockup Content */}
                <div className="p-6 grid grid-cols-12 gap-6 h-full bg-background/90">
                  {/* Sidebar */}
                  <div className="col-span-2 hidden md:flex flex-col gap-4 border-r border-border/30 pr-4">
                    <div className="h-8 w-full bg-card rounded-md" />
                    <div className="h-8 w-full bg-primary/20 border border-primary/30 rounded-md" />
                    <div className="h-8 w-full bg-card/50 rounded-md" />
                    <div className="h-8 w-full bg-card/50 rounded-md" />
                  </div>
                  {/* Main */}
                  <div className="col-span-12 md:col-span-10 flex flex-col gap-6">
                    <div className="flex justify-between items-center">
                      <div className="h-8 w-48 bg-card rounded-md" />
                      <div className="h-8 w-32 bg-primary rounded-md" />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { color: 'bg-success/20' },
                        { color: 'bg-primary/20' },
                        { color: 'bg-[hsl(260_60%_55%/0.2)]' },
                      ].map((item, i) => (
                        <div key={i} className="h-32 bg-card/50 border border-border/30 rounded-lg p-4">
                          <div className={`w-8 h-8 rounded-full ${item.color} mb-3`} />
                          <div className="h-4 w-24 bg-muted rounded mb-2" />
                          <div className="h-8 w-16 bg-muted/60 rounded" />
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 bg-card/30 border border-border/30 rounded-lg p-4">
                      <div className="space-y-3">
                        <div className="h-12 w-full bg-card rounded flex items-center px-4 justify-between border-l-4 border-success">
                          <div className="w-1/3 h-3 bg-muted rounded" />
                          <div className="px-3 py-1 bg-success/20 text-success text-xs rounded-full">Envoyé</div>
                        </div>
                        <div className="h-12 w-full bg-card rounded flex items-center px-4 justify-between border-l-4 border-primary">
                          <div className="w-1/3 h-3 bg-muted rounded" />
                          <div className="px-3 py-1 bg-primary/20 text-primary text-xs rounded-full">Réponse</div>
                        </div>
                        <div className="h-12 w-full bg-card rounded flex items-center px-4 justify-between border-l-4 border-muted-foreground/30">
                          <div className="w-1/3 h-3 bg-muted rounded" />
                          <div className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded-full">En attente</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Target Audience */}
          <section className="py-24 bg-card/30">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-foreground mb-4 font-display">À qui s'adresse Cronos ?</h2>
                <p className="text-muted-foreground max-w-2xl mx-auto">Une solution adaptée à chaque étape de votre parcours professionnel.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  { icon: GraduationCap, title: "Étudiant", desc: "À la recherche d'un stage obligatoire de fin d'études ou de césure.", accent: "primary" },
                  { icon: Briefcase, title: "Alternant", desc: "En recherche active d'une entreprise pour votre alternance ou apprentissage.", accent: "primary" },
                  { icon: Award, title: "Jeune diplômé", desc: "Prêt à décrocher votre premier job ou CDI pour lancer votre carrière.", accent: "success" },
                  { icon: Route, title: "En reconversion", desc: "Besoin de visibilité pour changer de voie malgré le manque de réponse.", accent: "warning" },
                ].map((item, i) => (
                  <div key={i} className="group glass-hover p-8 rounded-2xl relative overflow-hidden animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-bl-full -mr-4 -mt-4 transition-all group-hover:bg-primary/10" />
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                      <item.icon className="h-7 w-7" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">{item.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* How It Works - Timeline zigzag */}
          <section id="how-it-works" className="py-24 relative overflow-hidden">
            {/* Decorative vertical line */}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent hidden md:block" />
            
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-20">
                <span className="text-primary font-semibold tracking-wider text-sm uppercase">Processus simple</span>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mt-2 font-display">Comment ça marche ?</h2>
              </div>

              <div className="space-y-12 md:space-y-24">
                {/* Step 1 */}
                <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-background rounded-full border-2 border-primary z-20 hidden md:flex items-center justify-center font-bold text-primary shadow-[0_0_15px_hsl(var(--primary)/0.5)]">1</div>
                  
                  <div className="w-full md:w-1/2 md:text-right order-2 md:order-1">
                    <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-primary transition-colors">Définis ce que tu recherches</h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">Stage, alternance ou emploi — précise ton secteur, tes villes cibles, ta région et le type d'entreprise visé.</p>
                  </div>
                  <div className="w-full md:w-1/2 order-1 md:order-2">
                    <div className="bg-card/50 p-6 rounded-xl border border-border/30 shadow-xl transform group-hover:scale-[1.03] transition-transform duration-500">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-3 w-3 rounded-full bg-destructive" />
                        <div className="h-3 w-3 rounded-full bg-warning" />
                        <div className="h-3 w-3 rounded-full bg-success" />
                      </div>
                      <div className="space-y-4">
                        <div className="bg-background/50 p-3 rounded border border-border/30">
                          <div className="text-xs text-muted-foreground mb-1">Type de contrat</div>
                          <div className="text-foreground font-medium">Alternance / Apprentissage</div>
                        </div>
                        <div className="bg-background/50 p-3 rounded border border-border/30">
                          <div className="text-xs text-muted-foreground mb-1">Localisation</div>
                          <div className="flex gap-2">
                            <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">Paris</span>
                            <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">Lyon</span>
                            <span className="px-2 py-1 bg-primary/20 text-primary text-xs rounded">Remote</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 2 */}
                <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-background rounded-full border-2 border-[hsl(260_60%_55%)] z-20 hidden md:flex items-center justify-center font-bold text-[hsl(260_60%_55%)] shadow-[0_0_15px_hsl(260_60%_55%/0.5)]">2</div>
                  
                  <div className="w-full md:w-1/2 order-1">
                    <div className="bg-card/50 p-6 rounded-xl border border-border/30 shadow-xl transform group-hover:scale-[1.03] transition-transform duration-500 relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-[hsl(260_60%_55%/0.1)] rounded-full blur-2xl" />
                      <div className="space-y-3 relative">
                        <div className="flex items-center justify-between p-3 bg-background/80 rounded border-l-4 border-[hsl(260_60%_55%)]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-card flex items-center justify-center text-foreground text-xs font-bold">G</div>
                            <div>
                              <div className="text-sm font-medium text-foreground">Google France</div>
                              <div className="text-xs text-muted-foreground">Tech • Paris</div>
                            </div>
                          </div>
                          <div className="text-xs text-success font-mono">email trouvé</div>
                        </div>
                        <div className="flex items-center justify-between p-3 bg-background/80 rounded border-l-4 border-[hsl(260_60%_55%)]">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded bg-card flex items-center justify-center text-foreground text-xs font-bold">S</div>
                            <div>
                              <div className="text-sm font-medium text-foreground">Spotify</div>
                              <div className="text-xs text-muted-foreground">Music • Paris</div>
                            </div>
                          </div>
                          <div className="text-xs text-success font-mono">email trouvé</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 order-2">
                    <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-[hsl(260_60%_55%)] transition-colors">Cronos trouve les entreprises & contacts</h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">Notre algorithme effectue une recherche intelligente et détecte automatiquement les emails des recruteurs pertinents.</p>
                  </div>
                </div>

                {/* Step 3 */}
                <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-background rounded-full border-2 border-success z-20 hidden md:flex items-center justify-center font-bold text-success shadow-[0_0_15px_hsl(var(--success)/0.5)]">3</div>
                  
                  <div className="w-full md:w-1/2 md:text-right order-2 md:order-1">
                    <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-success transition-colors">L'IA rédige et envoie tes candidatures</h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">Emails ultra-personnalisés et lettres de motivation sur-mesure, générés par IA et envoyés via ta propre adresse Gmail.</p>
                  </div>
                  <div className="w-full md:w-1/2 order-1 md:order-2">
                    <div className="bg-card/50 p-6 rounded-xl border border-border/30 shadow-xl transform group-hover:scale-[1.03] transition-transform duration-500">
                      <div className="bg-background p-4 rounded-lg font-mono text-xs text-muted-foreground border border-border/30 relative">
                        <div className="absolute top-2 right-2 px-2 py-0.5 bg-success/20 text-success rounded text-[10px] uppercase font-sans font-semibold">IA Generated</div>
                        <p className="mb-2"><span className="text-[hsl(260_60%_55%)]">Objet:</span> Candidature spontanée - Chef de projet junior</p>
                        <p className="mb-2">Bonjour <span className="bg-success/20 text-success px-1 rounded">Sophie</span>,</p>
                        <p className="mb-2">J'ai suivi avec attention le développement récent de <span className="bg-success/20 text-success px-1 rounded">TechSolutions</span> sur le marché...</p>
                        <div className="h-2 w-full bg-muted rounded mb-1" />
                        <div className="h-2 w-2/3 bg-muted rounded" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Step 4 */}
                <div className="relative flex flex-col md:flex-row items-center gap-8 md:gap-16 group">
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-background rounded-full border-2 border-warning z-20 hidden md:flex items-center justify-center font-bold text-warning shadow-[0_0_15px_hsl(var(--warning)/0.5)]">4</div>
                  
                  <div className="w-full md:w-1/2 order-1">
                    <div className="bg-card/50 p-6 rounded-xl border border-border/30 shadow-xl transform group-hover:scale-[1.03] transition-transform duration-500">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-background p-3 rounded text-center border border-border/30">
                          <div className="text-2xl font-bold text-foreground">42</div>
                          <div className="text-[10px] text-muted-foreground uppercase">Envoyés</div>
                        </div>
                        <div className="bg-background p-3 rounded text-center border border-border/30">
                          <div className="text-2xl font-bold text-success">18%</div>
                          <div className="text-[10px] text-muted-foreground uppercase">Réponses</div>
                        </div>
                      </div>
                      <div className="h-24 bg-background rounded border border-border/30 flex items-end justify-between px-2 pb-2">
                        {[40, 60, 80, 50, 90].map((h, i) => (
                          <div key={i} className="w-1/6 rounded-t bg-primary" style={{ height: `${h}%`, opacity: 0.3 + i * 0.15 }} />
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="w-full md:w-1/2 order-2">
                    <h3 className="text-2xl font-bold text-foreground mb-4 group-hover:text-warning transition-colors">Tu suis tout depuis un dashboard</h3>
                    <p className="text-muted-foreground leading-relaxed text-lg">Réponses, relances automatiques, statistiques, pipeline visuel... Garde le contrôle total sur ta recherche.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section id="features" className="py-24 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-foreground mb-4 font-display">Fonctionnalités Puissantes</h2>
                <p className="text-muted-foreground">Tout ce dont tu as besoin pour automatiser ta réussite.</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {[
                  { icon: Search, title: "Prospection intelligente", items: ["Recherche IA par poste", "Multi-villes & régions", "Filtres taille entreprise"] },
                  { icon: Mail, title: "Emails & lettres IA", items: ["Emails RH auto-détectés", "Messages 100% personnalisés", "Lettres basées sur ton CV"] },
                  { icon: Send, title: "Envoi simple & natif", items: ["Connexion Gmail sécurisée", "Envoi immédiat ou programmé", "Pièces jointes (CV, LM)"] },
                  { icon: BarChart3, title: "Suivi & relances", items: ["Pipeline visuel complet", "Statistiques claires", "Relances automatiques"] },
                ].map((feature, i) => (
                  <div key={i} className="p-6 rounded-2xl bg-card/30 border border-border/30 hover:border-primary/40 transition-colors animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4 text-primary">
                      <feature.icon className="h-5 w-5" />
                    </div>
                    <h4 className="text-lg font-bold text-foreground mb-2">{feature.title}</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      {feature.items.map((item, j) => (
                        <li key={j} className="flex items-center gap-2">
                          <Check className="h-3.5 w-3.5 text-primary flex-shrink-0" /> {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Comparison Table */}
          <section className="py-24 bg-card/30">
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl font-bold text-foreground mb-4 font-display">Pourquoi choisir Cronos ?</h2>
              </div>
              
              <div className="overflow-hidden rounded-2xl border border-border/30 shadow-2xl bg-card/80">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border/30 bg-card/50">
                      <th className="p-6 text-sm font-medium text-muted-foreground uppercase tracking-wider w-1/2">Fonctionnalité</th>
                      <th className="p-6 text-center text-lg font-bold text-foreground w-1/4 bg-primary/10 border-x border-primary/20">Cronos</th>
                      <th className="p-6 text-center text-lg font-bold text-muted-foreground w-1/4">Classique</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20">
                    {[
                      { feature: "IA pour emails & lettres", classic: "Rédaction manuelle" },
                      { feature: "Recherche automatique d'emails", classic: "Copier-coller LinkedIn" },
                      { feature: "Scraping intelligent", classic: "Recherche Google" },
                      { feature: "Pipeline visuel", classic: "Excel / Sheets" },
                      { feature: "Envoi Gmail natif", classic: "Email par email" },
                      { feature: "Coût de démarrage", cronos: "Gratuit", classic: "Outils pro hors de prix" },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-card/50 transition-colors">
                        <td className="p-6 font-medium text-foreground/80">{row.feature}</td>
                        <td className="p-6 text-center bg-primary/5 border-x border-primary/20">
                          {row.cronos ? (
                            <span className="font-bold text-foreground">{row.cronos}</span>
                          ) : (
                            <Check className="h-5 w-5 text-success mx-auto" />
                          )}
                        </td>
                        <td className="p-6 text-center text-muted-foreground text-sm">{row.classic}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Stats Bar */}
          <section className="py-20 bg-gradient-to-r from-primary/30 via-[hsl(260_60%_45%/0.3)] to-primary/30 border-y border-border/20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                {[
                  { value: "-90%", label: "de temps sur la recherche" },
                  { value: "x20", label: "candidatures envoyées" },
                  { value: "+45%", label: "taux de réponse" },
                  { value: "∞", label: "opportunités cachées" },
                ].map((stat, i) => (
                  <div key={i} className="p-4 animate-fade-in" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="text-4xl md:text-5xl font-bold text-foreground mb-2">{stat.value}</div>
                    <p className="text-primary/80 text-sm md:text-base">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Social Proof - Stats only */}
          <section className="py-24 bg-background">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
              <div className="flex flex-col md:flex-row justify-center items-center gap-12">
                {[
                  { value: "10 000+", label: "Entreprises prospectées" },
                  { value: "5 000+", label: "Emails RH trouvés" },
                  { value: "95%", label: "Précision des données" },
                ].map((stat, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <div className="h-12 w-px bg-border hidden md:block" />}
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground mb-1">{stat.value}</div>
                      <div className="text-sm text-muted-foreground uppercase tracking-widest">{stat.label}</div>
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          </section>

          {/* Pricing */}
          <section id="pricing" className="py-24 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-background to-primary/5 pointer-events-none" />
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4 font-display">Tarification Simple</h2>
                <p className="text-muted-foreground">Commencez gratuitement, passez à la vitesse supérieure quand vous êtes prêt.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                {/* Free */}
                <div className="bg-card/40 rounded-2xl border border-border/30 p-8 flex flex-col hover:bg-card/60 transition-colors">
                  <h3 className="text-xl font-bold text-foreground mb-2">Gratuit</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-foreground">0€</span>
                    <span className="text-muted-foreground">/mois</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6 pb-6 border-b border-border/30">Pour découvrir la plateforme sans engagement.</p>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-start gap-3 text-sm text-foreground/80"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> 5 envois d'emails / mois</li>
                    <li className="flex items-start gap-3 text-sm text-foreground/80"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Recherche auto (département)</li>
                    <li className="flex items-start gap-3 text-sm text-foreground/80"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Template générique</li>
                    <li className="flex items-start gap-3 text-sm text-muted-foreground/50"><X className="h-4 w-4 mt-0.5 flex-shrink-0" /> Pas d'IA générative</li>
                    <li className="flex items-start gap-3 text-sm text-muted-foreground/50"><X className="h-4 w-4 mt-0.5 flex-shrink-0" /> Pas d'offres d'emploi</li>
                  </ul>
                  
                  <Button variant="outline" className="w-full bg-card/30 hover:bg-card/50 border-border/50" onClick={() => navigate("/login")}>
                    Commencer gratuitement
                  </Button>
                </div>

                {/* Standard */}
                <div className="bg-card/40 rounded-2xl border border-border/30 p-8 flex flex-col hover:bg-card/60 transition-colors">
                  <h3 className="text-xl font-bold text-foreground mb-2">Standard</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-foreground">14€</span>
                    <span className="text-muted-foreground">/mois</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6 pb-6 border-b border-border/30">Pour une recherche active avec plus de volume.</p>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-start gap-3 text-sm text-foreground/80"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> 100 envois d'emails / mois</li>
                    <li className="flex items-start gap-3 text-sm text-foreground/80"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Suivi des réponses</li>
                    <li className="flex items-start gap-3 text-sm text-foreground/80"><Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" /> Support par email</li>
                    <li className="flex items-start gap-3 text-sm text-muted-foreground/50"><X className="h-4 w-4 mt-0.5 flex-shrink-0" /> Pas d'IA générative</li>
                    <li className="flex items-start gap-3 text-sm text-muted-foreground/50"><X className="h-4 w-4 mt-0.5 flex-shrink-0" /> Pas d'offres d'emploi</li>
                  </ul>
                  
                  <Button variant="outline" className="w-full bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary hover:text-foreground" onClick={() => navigate("/login")}>
                    Choisir Standard
                  </Button>
                </div>

                {/* Premium */}
                <div className="bg-card/80 rounded-2xl border border-primary p-8 flex flex-col relative shadow-[0_0_30px_hsl(var(--primary)/0.15)] md:-translate-y-4">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary to-[hsl(260_60%_55%)] text-primary-foreground text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Populaire
                  </div>
                  <h3 className="text-xl font-bold text-foreground mb-2">Premium</h3>
                  <div className="flex items-baseline gap-1 mb-6">
                    <span className="text-4xl font-bold text-foreground">39€</span>
                    <span className="text-muted-foreground">/mois</span>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6 pb-6 border-b border-border/30">La puissance totale de l'IA pour décrocher le job.</p>
                  
                  <ul className="space-y-4 mb-8 flex-1">
                    <li className="flex items-start gap-3 text-sm text-foreground font-medium"><Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /> 400 envois d'emails / mois</li>
                    <li className="flex items-start gap-3 text-sm text-foreground font-medium"><Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /> Recherche IA précise (ville)</li>
                    <li className="flex items-start gap-3 text-sm text-foreground font-medium"><Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /> Emails personnalisés IA</li>
                    <li className="flex items-start gap-3 text-sm text-foreground font-medium"><Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /> Lettres motivation IA</li>
                    <li className="flex items-start gap-3 text-sm text-foreground font-medium"><Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /> Accès offres d'emploi</li>
                    <li className="flex items-start gap-3 text-sm text-foreground font-medium"><Check className="h-4 w-4 text-success mt-0.5 flex-shrink-0" /> Support prioritaire</li>
                  </ul>
                  
                  <Button className="w-full bg-gradient-to-r from-primary to-[hsl(260_60%_55%)] hover:from-primary/90 hover:to-[hsl(260_60%_50%)] text-primary-foreground font-bold shadow-lg" onClick={() => navigate("/login")}>
                    Devenir Premium
                  </Button>
                </div>
              </div>

              {/* Add-ons */}
              <div className="max-w-3xl mx-auto mt-12 p-6 rounded-xl bg-card/30 border border-border/30 text-center">
                <p className="text-muted-foreground mb-4">Besoin de plus de crédits ?</p>
                <div className="flex justify-center gap-4 flex-wrap">
                  <span className="px-4 py-2 bg-card/50 rounded-lg border border-border/30 text-sm text-foreground/80">Pack 50 crédits : <span className="text-foreground font-bold">5€</span></span>
                  <span className="px-4 py-2 bg-primary/10 rounded-lg border border-primary/30 text-sm text-primary">Pack 100 crédits : <span className="text-foreground font-bold">9€</span> <span className="text-xs bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded ml-2">-10%</span></span>
                </div>
              </div>

              <div className="text-center mt-12">
                <button onClick={() => navigate("/login")} className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors border-b border-border hover:border-foreground pb-0.5 text-sm">
                  Commencer gratuitement sans carte bancaire <ArrowRight className="ml-2 h-3 w-3" />
                </button>
              </div>
            </div>
          </section>

          {/* Final CTA */}
          <section className="py-24 relative">
            <div className="absolute inset-0 bg-gradient-to-t from-primary/10 to-transparent pointer-events-none" />
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6 font-display">Prêt à décrocher ton stage, <br/>ton alternance ou ton job ?</h2>
              <p className="text-xl text-primary/80 mb-10">Moins de candidatures dans le vide. Plus de réponses.</p>
              <Button 
                size="lg"
                onClick={() => navigate("/login")}
                className="px-10 h-14 bg-foreground text-background hover:bg-foreground/90 text-lg font-bold rounded-full shadow-[0_0_30px_hsl(var(--foreground)/0.3)] hover:scale-105 transition-transform"
              >
                Créer mon compte gratuitement
              </Button>
            </div>
          </section>
        </main>

        {/* Footer */}
        <footer className="bg-card/50 border-t border-border/30 pt-16 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col md:flex-row justify-between items-center mb-12">
              <div className="flex items-center gap-3 mb-6 md:mb-0">
                <img src={logoTransparent} alt="Cronos" className="h-8 w-auto" />
                <span className="text-xl font-bold text-foreground font-display">Cronos</span>
              </div>
              
              <div className="flex gap-8">
                <a href="/help" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Aide</a>
                <a href="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Confidentialité</a>
                <a href="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Conditions</a>
                <a href="/mentions-legales" className="text-muted-foreground hover:text-foreground transition-colors text-sm">Mentions légales</a>
              </div>
            </div>
            <div className="text-center text-muted-foreground text-xs">
              © 2025 Cronos. Tous droits réservés.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default Landing;
