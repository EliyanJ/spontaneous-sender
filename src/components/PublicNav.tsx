import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import logoBlack from "@/assets/logo-black.png";

/**
 * Barre de navigation unifiée pour les pages publiques SEO
 * (Score CV, CV Builder, Offres d'emploi, Blog, etc.)
 * Identique visuellement au header de la home Landing.tsx
 */
export const PublicNav = () => {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const links = [
    { label: "Comparatif de CV", href: "/score-cv" },
    { label: "Création de CV", href: "/cv-builder" },
    { label: "Conseil personnalisé", href: "/blog" },
    { label: "Offres d'emploi", href: "/offres-emploi" },
    { label: "Tarifs", href: "/pricing" },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img src={logoBlack} alt="Cronos" className="h-9 w-auto" />
            <span className="text-2xl font-bold tracking-tight text-gray-900">Cronos</span>
          </Link>

          {/* Nav desktop */}
          <nav className="hidden md:flex items-center gap-8">
            {links.map(l => (
              <Link
                key={l.href}
                to={l.href}
                className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>

          {/* Actions desktop */}
          <div className="hidden md:flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="text-sm font-medium text-gray-700 hover:text-gray-900"
            >
              Se connecter
            </Button>
            <Button
              size="sm"
              onClick={() => navigate("/login")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-lg shadow-lg shadow-primary/20 font-medium text-sm"
            >
              Commencer
            </Button>
          </div>

          {/* Mobile */}
          <div className="md:hidden flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate("/login")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg px-4 text-xs"
            >
              Commencer
            </Button>
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="p-2 text-gray-600 hover:text-gray-900"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-3">
          {links.map(l => (
            <Link
              key={l.href}
              to={l.href}
              onClick={() => setMobileOpen(false)}
              className="block text-sm font-medium text-gray-700 hover:text-primary py-1.5 transition-colors"
            >
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login")}
              className="w-full justify-start text-sm font-medium text-gray-700"
            >
              Se connecter
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};
