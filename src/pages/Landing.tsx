import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, 
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
  Play,
  Flag
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Header } from "@/components/Header";
import logoBlack from "@/assets/logo-black.png";

const Landing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (user) navigate("/dashboard");
  }, [user, navigate]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white relative overflow-hidden">
      {/* Subtle background */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-gradient-to-br from-gray-50 via-white to-purple-50">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-indigo-200/20 rounded-full blur-[120px]" />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-40" style={{
          backgroundSize: '40px 40px',
          backgroundImage: 'linear-gradient(to right, hsl(263 75% 58% / 0.05) 1px, transparent 1px), linear-gradient(to bottom, hsl(263 75% 58% / 0.05) 1px, transparent 1px)'
        }} />
      </div>

      <div className="relative z-10">
        <Header />

        <main className="pt-[72px]">
          {/* Hero Section - 2 colonnes */}
          <section className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden min-h-[800px] flex items-center">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full relative z-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

                {/* Colonne gauche - texte */}
                <div className="text-left">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-semibold mb-6 uppercase tracking-wider animate-fade-in">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Nouvelle IA Générative 2.0
                  </div>

                  <h1 className="text-5xl lg:text-7xl font-bold text-gray-900 mb-6 leading-tight font-display animate-fade-in" style={{ animationDelay: '0.1s' }}>
                    Trouve ton contrat<br />
                    <span className="bg-gradient-to-r from-primary to-[hsl(260_60%_45%)] bg-clip-text text-transparent">Plus vite</span>
                  </h1>

                  <p className="text-lg text-gray-600 mb-10 leading-relaxed max-w-xl animate-fade-in" style={{ animationDelay: '0.2s' }}>
                    Accélérez votre recherche d'emploi avec Cronos. Générez des lettres de motivation personnalisées par IA, automatisez vos candidatures spontanées et suivez vos relances depuis un dashboard unique.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                    <Button
                      size="lg"
                      onClick={() => navigate("/login")}
                      className="px-8 py-4 h-auto bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold rounded-xl shadow-lg shadow-primary/30 flex items-center gap-2"
                    >
                      Créer un compte gratuit <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() => navigate('/login')}
                      className="px-8 py-4 h-auto bg-white border-gray-200 text-gray-900 text-lg font-medium rounded-xl hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Play className="h-4 w-4 text-primary" /> Voir la démo
                    </Button>
                  </div>

                  <div className="mt-10 flex items-center gap-4 text-sm text-gray-600 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    <div className="flex -space-x-2">
                      {['bg-blue-400', 'bg-purple-400', 'bg-green-400'].map((c, i) => (
                        <div key={i} className={`w-8 h-8 rounded-full ${c} border-2 border-white flex items-center justify-center text-white text-xs font-bold`}>
                          {['A', 'B', 'C'][i]}
                        </div>
                      ))}
                    </div>
                    <p><span className="text-gray-900 font-semibold">+10 000</span> entreprises prêtes à être candidatées</p>
                  </div>
                </div>

                {/* Colonne droite - Dashboard mockup */}
                <div className="relative group animate-fade-in" style={{ animationDelay: '0.5s' }}>
                  <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 to-indigo-400/20 rounded-2xl blur-2xl opacity-60 group-hover:opacity-80 transition-opacity duration-500" />

                  <div className="relative bg-white rounded-2xl p-2 border border-gray-200 shadow-2xl">
                    {/* Browser bar */}
                    <div className="h-8 bg-gray-100 rounded-t-xl flex items-center px-4 gap-2 border-b border-gray-200">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                      <div className="ml-4 bg-gray-200 px-3 py-0.5 rounded text-[10px] text-gray-600 font-mono">cronos.app/dashboard</div>
                    </div>

                    {/* Dashboard content */}
                    <div className="bg-gray-50 p-5 rounded-b-xl">
                      {/* Header dashboard */}
                      <div className="flex justify-between items-center mb-5">
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Bonjour 👋</h3>
                          <p className="text-gray-500 text-xs">Votre recherche est en bonne voie.</p>
                        </div>
                        <button className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-medium shadow-lg shadow-primary/20 flex items-center gap-1.5">
                          <Send className="h-3 w-3" /> Nouvelle campagne
                        </button>
                      </div>

                      {/* KPI Cards */}
                      <div className="grid grid-cols-4 gap-3 mb-4">
                        {[
                          { label: 'Emails trouvés', value: '28', badge: '+8.2%', badgeColor: 'text-green-600 bg-green-50', barColor: 'bg-blue-500', barW: '45%', iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
                          { label: 'CV générés', value: '14', badge: '+12.5%', badgeColor: 'text-green-600 bg-green-50', barColor: 'bg-purple-500', barW: '30%', iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
                          { label: 'Candidatures', value: '28', badge: '0.0%', badgeColor: 'text-gray-600 bg-gray-100', barColor: 'bg-orange-500', barW: '45%', iconBg: 'bg-orange-50', iconColor: 'text-orange-600' },
                          { label: 'Crédits restants', value: '5', badge: '-2.1%', badgeColor: 'text-red-600 bg-red-50', barColor: 'bg-red-500', barW: '15%', iconBg: 'bg-red-50', iconColor: 'text-red-600' },
                        ].map((kpi, i) => (
                          <div key={i} className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                              <div className={`w-7 h-7 rounded-lg ${kpi.iconBg} flex items-center justify-center ${kpi.iconColor}`}>
                                <BarChart3 className="h-3.5 w-3.5" />
                              </div>
                              <span className={`text-[10px] ${kpi.badgeColor} px-1.5 py-0.5 rounded font-medium`}>{kpi.badge}</span>
                            </div>
                            <p className="text-gray-500 text-[10px] mb-0.5">{kpi.label}</p>
                            <p className="text-xl font-bold text-gray-900">{kpi.value}</p>
                            <div className="w-full bg-gray-200 h-1 mt-2 rounded-full overflow-hidden">
                              <div className={`${kpi.barColor} h-full rounded-full`} style={{ width: kpi.barW }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom charts */}
                      <div className="grid grid-cols-3 gap-3">
                        {/* Performance chart */}
                        <div className="col-span-2 bg-white rounded-xl border border-gray-200 p-3">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="text-xs font-semibold text-gray-900">Performance de recherche</h4>
                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 rounded text-gray-600 border border-gray-300">Semaine</span>
                          </div>
                          <svg className="w-full h-16" viewBox="0 0 300 60" fill="none">
                            <path d="M0 52 C 40 45, 80 30, 120 34 C 160 38, 200 22, 240 15 L 300 8" stroke="hsl(263 75% 58%)" strokeWidth="2" fill="none"/>
                            <path d="M0 56 C 50 52, 100 49, 150 45 C 200 41, 250 34, 300 30" stroke="#10b981" strokeWidth="2" fill="none"/>
                            <path d="M0 52 C 40 45, 80 30, 120 34 C 160 38, 200 22, 240 15 L 300 8 V 60 H 0 Z" fill="url(#heroGrad)" fillOpacity="0.15"/>
                            <defs>
                              <linearGradient id="heroGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="hsl(263 75% 58%)" stopOpacity="1" />
                                <stop offset="100%" stopColor="hsl(263 75% 58%)" stopOpacity="0" />
                              </linearGradient>
                            </defs>
                          </svg>
                          <div className="flex justify-between text-[9px] text-gray-400 mt-1">
                            <span>Lun</span><span>Mer</span><span>Ven</span><span>Dim</span>
                          </div>
                        </div>

                        {/* Score CV */}
                        <div className="col-span-1 bg-white rounded-xl border border-gray-200 p-3 flex flex-col items-center justify-center relative">
                          <h4 className="text-[10px] font-semibold text-gray-900 absolute top-3 left-3">Score CV</h4>
                          <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
                              <circle cx="40" cy="40" r="30" stroke="#e5e7eb" strokeWidth="6" fill="transparent" />
                              <circle cx="40" cy="40" r="30" stroke="#fbbf24" strokeWidth="6" fill="transparent" strokeDasharray="188" strokeDashoffset="47" strokeLinecap="round" />
                            </svg>
                            <div className="absolute text-center">
                              <span className="text-lg font-bold text-gray-900 block leading-none">72</span>
                              <span className="text-[8px] text-gray-500 uppercase">Bien</span>
                            </div>
                          </div>
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
                <img src={logoBlack} alt="Cronos" className="h-8 w-auto" />
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
