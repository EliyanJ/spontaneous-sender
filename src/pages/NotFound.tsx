import { Link, useLocation } from "react-router-dom";
import { Header } from "@/components/Header";
import { PublicFooter } from "@/components/PublicFooter";
import { Button } from "@/components/ui/button";
import { Home, FileText, Search, Briefcase, BookOpen } from "lucide-react";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.error("404 – Route inexistante :", location.pathname);
    }
  }, [location.pathname]);

  const suggestions = [
    { label: "Accueil", href: "/", icon: <Home className="h-4 w-4" /> },
    { label: "Score CV ATS", href: "/score-cv", icon: <FileText className="h-4 w-4" /> },
    { label: "Créateur de CV", href: "/createur-de-cv", icon: <Search className="h-4 w-4" /> },
    { label: "Offres d'emploi", href: "/offres-emploi", icon: <Briefcase className="h-4 w-4" /> },
    { label: "Blog", href: "/blog", icon: <BookOpen className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 flex items-center justify-center pt-[72px] px-4 py-24">
        <div className="text-center max-w-lg">
          {/* 404 visual */}
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <span className="text-4xl font-bold text-primary">404</span>
          </div>

          <h1 className="text-3xl font-bold text-foreground mb-3 font-display">
            Page introuvable
          </h1>
          <p className="text-muted-foreground mb-10">
            La page <code className="bg-muted/60 px-1.5 py-0.5 rounded text-sm font-mono">{location.pathname}</code> n'existe pas ou a été déplacée.
          </p>

          {/* Quick links */}
          <div className="flex flex-wrap justify-center gap-3 mb-10">
            {suggestions.map((s) => (
              <Link key={s.href} to={s.href}>
                <Button variant="outline" size="sm" className="gap-2 rounded-full border-border/60 hover:border-primary/50 hover:text-primary transition-colors">
                  {s.icon}
                  {s.label}
                </Button>
              </Link>
            ))}
          </div>

          <Link to="/">
            <Button className="gap-2 rounded-full px-6">
              <Home className="h-4 w-4" />
              Retourner à l'accueil
            </Button>
          </Link>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
};

export default NotFound;
