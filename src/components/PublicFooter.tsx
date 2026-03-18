import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";

/**
 * Shared footer for all public pages.
 * Centralises internal linking for SEO and maintenance.
 */
export const PublicFooter = () => {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-card/50 border-t border-border/30 py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Top row: Logo + product links */}
        <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            <Logo height={28} className="transition-transform group-hover:scale-105" />
            <span className="text-base font-bold text-foreground font-display">Cronos</span>
          </Link>

          {/* Link groups */}
          <div className="flex flex-wrap gap-x-12 gap-y-6 text-sm">
            {/* Produit */}
            <div>
              <p className="font-semibold text-foreground mb-3">Outils</p>
              <ul className="space-y-2">
                <li><Link to="/score-cv" className="text-muted-foreground hover:text-foreground transition-colors">Score CV ATS</Link></li>
                <li><Link to="/createur-de-cv" className="text-muted-foreground hover:text-foreground transition-colors">Créateur de CV</Link></li>
                <li><Link to="/offres-emploi" className="text-muted-foreground hover:text-foreground transition-colors">Offres d'emploi</Link></li>
              </ul>
            </div>

            {/* Entreprise */}
            <div>
              <p className="font-semibold text-foreground mb-3">Ressources</p>
              <ul className="space-y-2">
                <li><Link to="/blog" className="text-muted-foreground hover:text-foreground transition-colors">Blog</Link></li>
                <li><Link to="/prix" className="text-muted-foreground hover:text-foreground transition-colors">Tarifs</Link></li>
                <li><Link to="/help" className="text-muted-foreground hover:text-foreground transition-colors">Centre d'aide</Link></li>
              </ul>
            </div>

            {/* Légal */}
            <div>
              <p className="font-semibold text-foreground mb-3">Légal</p>
              <ul className="space-y-2">
                <li><Link to="/privacy-policy" className="text-muted-foreground hover:text-foreground transition-colors">Confidentialité</Link></li>
                <li><Link to="/terms-of-service" className="text-muted-foreground hover:text-foreground transition-colors">CGU</Link></li>
                <li><Link to="/mentions-legales" className="text-muted-foreground hover:text-foreground transition-colors">Mentions légales</Link></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom row: copyright */}
        <div className="pt-6 border-t border-border/30 text-center text-xs text-muted-foreground">
          © {year} Cronos — GetCronos.fr. Tous droits réservés.
        </div>
      </div>
    </footer>
  );
};
