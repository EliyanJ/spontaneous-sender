import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import logoBlack from "@/assets/logo-black.png";

/**
 * Barre de navigation unifiée pour les pages publiques SEO
 * (Score CV, CV Builder, Offres d'emploi, Blog, etc.)
 */
export const PublicNav = () => {
  const navigate = useNavigate();

  return (
    <nav className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
        {/* Logo → homepage */}
        <Link to="/" className="flex items-center gap-2">
          <img src={logoBlack} alt="Cronos" className="h-7 w-auto" />
          <span className="text-base font-bold text-foreground hidden sm:inline">Cronos</span>
        </Link>

        {/* Navigation centrale */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-muted-foreground">
          <Link to="/score-cv" className="hover:text-foreground transition-colors">Comparatif de CV</Link>
          <Link to="/cv-builder" className="hover:text-foreground transition-colors">Création de CV</Link>
          <Link to="/blog" className="hover:text-foreground transition-colors">Conseil personnalisé</Link>
          <Link to="/offres-emploi" className="hover:text-foreground transition-colors">Offres d'emploi</Link>
          <Link to="/pricing" className="hover:text-foreground transition-colors">Tarifs</Link>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link to="/login">
            <Button variant="outline" size="sm">Connexion</Button>
          </Link>
          <Link to="/register">
            <Button size="sm" className="hidden sm:flex">Commencer</Button>
          </Link>
        </div>
      </div>
    </nav>
  );
};
