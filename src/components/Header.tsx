import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Menu, X, PenLine, BarChart2, Briefcase, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";

const TOOLS = [
  {
    label: "Créateur de CV",
    href: "/cv-builder",
    Icon: PenLine,
    desc: "Créez un CV parfait",
    iconBg: "bg-blue-100 dark:bg-blue-900/40",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconHoverBg: "group-hover/item:bg-blue-600 dark:group-hover/item:bg-blue-500",
    iconHoverColor: "group-hover/item:text-white",
  },
  {
    label: "Score CV",
    href: "/score-cv",
    Icon: BarChart2,
    desc: "Analysez votre impact",
    iconBg: "bg-green-100 dark:bg-green-900/40",
    iconColor: "text-green-600 dark:text-green-400",
    iconHoverBg: "group-hover/item:bg-green-600 dark:group-hover/item:bg-green-500",
    iconHoverColor: "group-hover/item:text-white",
  },
  {
    label: "Offres d'emplois",
    href: "/offres-emploi",
    Icon: Briefcase,
    desc: "Trouvez votre job",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
    iconColor: "text-purple-600 dark:text-purple-400",
    iconHoverBg: "group-hover/item:bg-purple-600 dark:group-hover/item:bg-purple-500",
    iconHoverColor: "group-hover/item:text-white",
  },
  {
    label: "Blog",
    href: "/blog",
    Icon: Newspaper,
    desc: "Conseils carrière",
    iconBg: "bg-orange-100 dark:bg-orange-900/40",
    iconColor: "text-orange-600 dark:text-orange-400",
    iconHoverBg: "group-hover/item:bg-orange-600 dark:group-hover/item:bg-orange-500",
    iconHoverColor: "group-hover/item:text-white",
  },
];

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
    setToolsOpen(false);
  }, [location.pathname]);

  const handleHowItWorks = () => {
    if (location.pathname === "/") {
      const el = document.getElementById("how-it-works");
      if (el) el.scrollIntoView({ behavior: "smooth" });
    } else {
      navigate("/#how-it-works");
    }
    setMobileOpen(false);
  };

  return (
    <header className="fixed top-0 w-full z-50 px-4 md:px-8" style={{ paddingTop: "8px", paddingBottom: "8px" }}>
      <div className="max-w-7xl mx-auto">

        {/* ── Main nav pill — fixed 64px total height ── */}
        <nav className="h-12 bg-background/80 dark:bg-background/90 backdrop-blur-[10px] rounded-2xl px-4 flex items-center justify-between shadow-sm border border-border/50">

          {/* Left: Logo + "Cronos" text + ThemeToggle */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <Link to="/" className="flex items-center gap-2 flex-shrink-0">
              <Logo height={48} />
              <span className="text-[1.1rem] font-bold text-foreground tracking-tight">Cronos</span>
            </Link>
            {/* Theme toggle — discret, right after logo */}
            <ThemeToggle />
          </div>

          {/* Desktop menu */}
          <div className="hidden md:flex items-center gap-8">
            <button
              onClick={handleHowItWorks}
              className="relative text-muted-foreground hover:text-foreground font-medium text-sm pb-0.5 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-primary after:scale-x-0 after:origin-right hover:after:scale-x-100 hover:after:origin-left after:transition-transform after:duration-300 transition-colors"
            >
              Comment ça marche
            </button>
            <Link
              to="/pricing"
              className="relative text-muted-foreground hover:text-foreground font-medium text-sm pb-0.5 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-primary after:scale-x-0 after:origin-right hover:after:scale-x-100 hover:after:origin-left after:transition-transform after:duration-300 transition-colors"
            >
              Tarif
            </Link>

            {/* Outils dropdown */}
            <div
              className="relative group py-2"
              onMouseLeave={() => setToolsOpen(false)}
              onMouseEnter={() => setToolsOpen(true)}
            >
              <button className="relative flex items-center gap-1 text-muted-foreground hover:text-foreground font-medium text-sm pb-0.5 after:absolute after:bottom-0 after:left-0 after:h-[2px] after:w-full after:bg-primary after:scale-x-0 after:origin-right hover:after:scale-x-100 hover:after:origin-left after:transition-transform after:duration-300 transition-colors focus:outline-none">
                Outils
                <ChevronDown
                  className={cn(
                    "text-xs w-3.5 h-3.5 transition-transform duration-300",
                    toolsOpen && "rotate-180"
                  )}
                />
              </button>

              <div
                className={cn(
                  "absolute top-full left-1/2 -translate-x-1/2 w-64 pt-4 transition-all duration-300",
                  toolsOpen ? "opacity-100 visible translate-y-0" : "opacity-0 invisible translate-y-2.5"
                )}
              >
                <div className="bg-popover/95 backdrop-blur-[10px] rounded-xl shadow-lg border border-border p-2 overflow-hidden">
                  {TOOLS.map(tool => (
                    <Link
                      key={tool.href}
                      to={tool.href}
                      onClick={() => setToolsOpen(false)}
                      className="block px-4 py-3 rounded-lg hover:bg-accent transition-colors group/item"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 transition-colors",
                            tool.iconBg,
                            tool.iconColor,
                            tool.iconHoverBg,
                            tool.iconHoverColor
                          )}
                        >
                          <tool.Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{tool.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{tool.desc}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right side: connexion + CTA */}
          <div className="flex items-center gap-3">
            {!user ? (
              <Link
                to="/login"
                className="hidden lg:block text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Connexion
              </Link>
            ) : (
              <Link
                to="/dashboard"
                className="hidden lg:block text-muted-foreground hover:text-foreground text-sm font-medium transition-colors"
              >
                Mon Dashboard
              </Link>
            )}

            {/* CTA Commencer */}
            <Link
              to={user ? "/dashboard" : "/register"}
              className="bg-primary hover:bg-primary/90 text-primary-foreground px-4 py-2 rounded-full text-sm font-semibold transition-all shadow-md shadow-primary/20 flex items-center gap-2"
            >
              <svg className="h-3.5 w-3.5 opacity-90 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                <path d="M0 3.449L9.75 2.1v9.451H0m10.949-9.602L24 0v11.4H10.949M0 12.6h9.75v9.451L0 20.699M10.949 12.749H24V24l-12.9-1.801" />
              </svg>
              <span>{user ? "Dashboard" : "Commencer"}</span>
            </Link>

            {/* Mobile burger */}
            <button
              onClick={() => setMobileOpen(v => !v)}
              className="md:hidden text-foreground/70 hover:text-foreground focus:outline-none"
              aria-label="Menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </nav>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div className="md:hidden mt-2 bg-background/95 backdrop-blur-[10px] rounded-2xl p-4 border border-border shadow-lg">
            <div className="flex flex-col gap-4">
              <button
                onClick={handleHowItWorks}
                className="text-left text-foreground font-medium px-2 py-1 hover:bg-accent rounded-lg transition-colors text-sm"
              >
                Comment ça marche
              </button>
              <Link
                to="/pricing"
                className="text-foreground font-medium px-2 py-1 hover:bg-accent rounded-lg transition-colors text-sm"
              >
                Tarif
              </Link>

              <div className="border-t border-border pt-2">
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2 px-2">Outils</p>
                {TOOLS.map(tool => (
                  <Link
                    key={tool.href}
                    to={tool.href}
                    className={cn(
                      "flex items-center gap-3 px-2 py-2 hover:bg-accent rounded-lg transition-colors",
                      tool.iconColor
                    )}
                  >
                    <tool.Icon className="w-4 h-4" />
                    <span className="text-foreground text-sm">{tool.label}</span>
                  </Link>
                ))}
              </div>

              <div className="border-t border-border pt-3 flex flex-col gap-3">
                <Link
                  to={user ? "/dashboard" : "/login"}
                  className="text-center text-muted-foreground font-medium text-sm"
                >
                  {user ? "Mon Dashboard" : "Connexion"}
                </Link>
                <Link
                  to={user ? "/dashboard" : "/register"}
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full text-sm font-semibold text-primary-foreground bg-primary hover:bg-primary/90 transition-colors shadow-md shadow-primary/20"
                >
                  {user ? "Dashboard" : "Commencer"} →
                </Link>
              </div>
            </div>
          </div>
        )}

      </div>
    </header>
  );
};
