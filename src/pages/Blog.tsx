import { useNavigate } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Tag } from "lucide-react";
import logoBlack from "@/assets/logo-black.png";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";

const ARTICLES = [
  {
    tag: "CV & Lettre",
    tagColor: "bg-primary/10 text-primary",
    title: "Comment rédiger un CV percutant en 2025 ?",
    desc: "Découvrez les structures et mots-clés qui attirent l'attention des recruteurs dès les premières secondes.",
    readTime: "5 min",
    slug: "rediger-cv-percutant-2025",
  },
  {
    tag: "Entretien",
    tagColor: "bg-violet-500/10 text-violet-600",
    title: "Les 10 questions pièges en entretien",
    desc: "Préparez vos réponses aux questions les plus difficiles pour transformer l'essai lors de votre rencontre.",
    readTime: "7 min",
    slug: "questions-pieges-entretien",
  },
  {
    tag: "Négociation",
    tagColor: "bg-teal-500/10 text-teal-600",
    title: "Négocier son salaire : le guide complet",
    desc: "Apprenez à évaluer votre valeur sur le marché et à aborder la question du salaire avec confiance.",
    readTime: "8 min",
    slug: "negocier-salaire-guide",
  },
  {
    tag: "Stratégie",
    tagColor: "bg-amber-500/10 text-amber-600",
    title: "Candidature spontanée : la méthode qui fonctionne",
    desc: "Comment cibler les bonnes entreprises et rédiger un message d'approche qui retient l'attention des recruteurs.",
    readTime: "6 min",
    slug: "candidature-spontanee-methode",
  },
  {
    tag: "CV & Lettre",
    tagColor: "bg-primary/10 text-primary",
    title: "Les erreurs qui font rejeter votre CV par l'ATS",
    desc: "75% des CV sont filtrés avant d'être lus. Évitez ces erreurs courantes pour passer les systèmes automatisés.",
    readTime: "4 min",
    slug: "erreurs-cv-ats",
  },
  {
    tag: "Carrière",
    tagColor: "bg-rose-500/10 text-rose-600",
    title: "Comment décrocher un stage en Grande École",
    desc: "Les stratégies concrètes utilisées par les étudiants qui obtiennent les stages les plus convoités.",
    readTime: "9 min",
    slug: "stage-grande-ecole",
  },
];

export default function Blog() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-b border-border/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-8">
              <div className="flex items-center gap-2 cursor-pointer flex-shrink-0" onClick={() => navigate('/')}>
                <img src={logoBlack} alt="Cronos" className="h-8 w-auto" />
              </div>
              <nav className="hidden lg:flex items-center gap-7">
                <button onClick={() => navigate('/score-cv')} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Comparatif de CV</button>
                <button onClick={() => navigate('/cv-builder')} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Création de CV</button>
                <button onClick={() => navigate('/blog')} className="text-sm font-medium text-primary transition-colors">Conseil personnalisé</button>
                <button onClick={() => navigate('/pricing')} className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Tarification</button>
              </nav>
            </div>
            <div className="flex items-center gap-3">
              {user ? (
                <Button size="sm" onClick={() => navigate('/dashboard')} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 shadow-md shadow-primary/20">
                  Mon tableau de bord
                </Button>
              ) : (
                <>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="text-muted-foreground hover:text-foreground hidden sm:flex">
                    Connexion
                  </Button>
                  <Button size="sm" onClick={() => navigate('/register')} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-5 font-semibold shadow-md shadow-primary/20 uppercase text-xs tracking-wide">
                    CRÉER MON CV
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="pt-16">
        {/* Hero */}
        <div className="relative bg-gradient-to-br from-primary/8 via-background to-violet-500/5 border-b border-border/50 py-16">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(var(--primary)/0.08)_0%,transparent_60%)]" />
          <div className="relative max-w-5xl mx-auto px-4 sm:px-6 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/20 mb-5">
              <BookOpen className="h-3.5 w-3.5" />
              Conseils & Guides Carrière
            </div>
            <h1 className="text-4xl sm:text-5xl font-extrabold text-foreground mb-4 tracking-tight leading-tight">
              Boostez votre <span className="text-primary">recherche d'emploi</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Des guides pratiques, des stratégies éprouvées et des conseils d'experts pour maximiser vos chances et décrocher le poste de vos rêves.
            </p>
          </div>
        </div>

        {/* Articles grid */}
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-14">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold text-foreground">Tous les articles</h2>
            <span className="text-sm text-muted-foreground">{ARTICLES.length} articles disponibles</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {ARTICLES.map((article, i) => (
              <div
                key={i}
                onClick={() => navigate(`/blog/${article.slug}`)}
                className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-lg transition-all cursor-pointer group"
              >
                <div className="h-36 bg-gradient-to-br from-muted/80 to-muted/30 flex items-center justify-center">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${article.tagColor}`}>
                    <BookOpen className="h-6 w-6" />
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-block text-xs font-semibold px-2.5 py-0.5 rounded-full ${article.tagColor}`}>
                      {article.tag}
                    </span>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />{article.readTime}
                    </span>
                  </div>
                  <h3 className="font-semibold text-foreground text-sm mb-2 group-hover:text-primary transition-colors leading-snug">
                    {article.title}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed mb-4">{article.desc}</p>
                  <span className="text-xs font-medium text-primary flex items-center gap-1 group-hover:gap-2 transition-all">
                    Lire l'article <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Coming soon banner */}
          <div className="mt-12 bg-gradient-to-r from-primary/5 via-primary/10 to-violet-500/5 border border-primary/20 rounded-2xl p-8 text-center">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-semibold px-3 py-1.5 rounded-full border border-primary/20 mb-3">
              <Tag className="h-3.5 w-3.5" />
              Bientôt disponible
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">Des dizaines d'articles en cours de rédaction</h3>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Notre équipe prépare des guides approfondis pour chaque étape de votre recherche d'emploi. Inscrivez-vous pour être notifié.
            </p>
            <Button onClick={() => navigate('/register')} className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 shadow-lg shadow-primary/20">
              Créer un compte gratuit <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Footer */}
        <footer className="bg-card border-t border-border py-8">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
              <img src={logoBlack} alt="Cronos" className="h-6 w-auto" />
            </div>
            <p className="text-xs text-muted-foreground">© 2025 GetCronos. Tous droits réservés.</p>
          </div>
        </footer>
      </div>
    </div>
  );
}
