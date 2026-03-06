import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { ChevronDown, Menu, X, FileText, Target, Briefcase, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import logoBlack from "@/assets/logo-black.png";
import { ThemeToggle } from "@/components/ThemeToggle";

const TOOLS = [
  { label: "Créateur de CV", href: "/cv-builder", icon: FileText, desc: "Générez un CV professionnel" },
  { label: "Score CV", href: "/score-cv", icon: Target, desc: "Analysez votre CV avec l'ATS" },
  { label: "Offres d'emploi", href: "/offres-emploi", icon: Briefcase, desc: "Parcourez les offres du marché" },
  { label: "Blog", href: "/blog", icon: BookOpen, desc: "Conseils carrière & stratégies" },
];

export const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setToolsOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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
    <>
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
          mounted ? "animate-[header-enter_0.4s_ease-out_forwards]" : "opacity-0",
          scrolled
            ? "bg-white/96 backdrop-blur-[14px] border-b border-black/[0.08] shadow-sm"
            : "bg-white/90 backdrop-blur-[12px] border-b border-transparent"
        )}
        style={{ WebkitBackdropFilter: "blur(12px)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-[68px] gap-8">

            {/* ── Logo image noir ── */}
            <Link to="/" className="flex items-center flex-shrink-0 opacity-90 hover:opacity-100 transition-opacity duration-200">
              <img src={logoBlack} alt="Cronos" className="h-[72px] w-auto" />
            </Link>

            {/* ── Desktop nav (collé au logo) ── */}
            <nav className="hidden md:flex items-center gap-0.5">
              {/* Comment ça marche */}
              <button
                onClick={handleHowItWorks}
                className="relative px-3 py-2 text-sm font-normal text-[#374151] hover:text-[#7c3aed] transition-colors duration-200 group"
              >
                Comment ça marche
                <span className="absolute bottom-1 left-3 right-3 h-[2px] bg-[#7c3aed] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
              </button>

              {/* Tarifs */}
              <Link
                to="/pricing"
                className="relative px-3 py-2 text-sm font-normal text-[#374151] hover:text-[#7c3aed] transition-colors duration-200 group"
              >
                Tarifs
                <span className="absolute bottom-1 left-3 right-3 h-[2px] bg-[#7c3aed] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
              </Link>

              {/* Outils dropdown */}
              <div ref={dropdownRef} className="relative">
                <button
                  onClick={() => setToolsOpen(v => !v)}
                  className={cn(
                    "relative flex items-center gap-1.5 px-3 py-2 text-sm font-normal transition-colors duration-200 group",
                    toolsOpen ? "text-[#7c3aed]" : "text-[#374151] hover:text-[#7c3aed]"
                  )}
                >
                  Outils
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform duration-200",
                      toolsOpen && "rotate-180"
                    )}
                  />
                  <span className="absolute bottom-1 left-3 right-3 h-[2px] bg-[#7c3aed] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left rounded-full" />
                </button>

                {/* Dropdown panel */}
                {toolsOpen && (
                  <div
                    className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-64 bg-white rounded-xl overflow-hidden z-50"
                    style={{
                      boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
                      border: "1px solid rgba(0,0,0,0.06)",
                      animation: "dropdown-enter 0.2s ease-out forwards",
                    }}
                  >
                    <div className="p-1.5">
                      {TOOLS.map(tool => (
                        <Link
                          key={tool.href}
                          to={tool.href}
                          onClick={() => setToolsOpen(false)}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-[#7c3aed]/6 group/item transition-colors duration-150"
                        >
                          <div className="mt-0.5 w-8 h-8 rounded-lg bg-[#7c3aed]/10 flex items-center justify-center flex-shrink-0 group-hover/item:bg-[#7c3aed]/20 transition-colors">
                            <tool.icon className="h-4 w-4 text-[#7c3aed]" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 group-hover/item:text-[#7c3aed] transition-colors">{tool.label}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{tool.desc}</p>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </nav>

            {/* Spacer */}
            <div className="flex-1" />

            {/* ── CTA ── */}
            <div className="hidden md:flex items-center">
              <Link
                to="/register"
                className="group relative inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold text-white transition-all duration-200 overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                  boxShadow: "0 4px 14px rgba(124,58,237,0.35)",
                  animation: "cta-pulse 3s ease-in-out infinite",
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = "0 6px 20px rgba(124,58,237,0.5)";
                  el.style.transform = "scale(1.02)";
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLElement;
                  el.style.boxShadow = "0 4px 14px rgba(124,58,237,0.35)";
                  el.style.transform = "scale(1)";
                }}
              >
                Commencer
                <svg className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>

            {/* ── Mobile burger ── */}
            <div className="md:hidden flex items-center">
              <button
                onClick={() => setMobileOpen(v => !v)}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                aria-label="Menu"
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* ── Mobile menu ── */}
        {mobileOpen && (
          <div
            className="md:hidden bg-white border-t border-gray-100"
            style={{ animation: "mobile-menu-enter 0.25s ease-out forwards" }}
          >
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              <button
                onClick={handleHowItWorks}
                className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:text-[#7c3aed] hover:bg-[#7c3aed]/6 transition-colors"
              >
                Comment ça marche
              </button>
              <Link
                to="/pricing"
                className="block px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:text-[#7c3aed] hover:bg-[#7c3aed]/6 transition-colors"
              >
                Tarifs
              </Link>

              {/* Outils accordion mobile */}
              <div>
                <button
                  onClick={() => setMobileToolsOpen(v => !v)}
                  className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium text-gray-700 hover:text-[#7c3aed] hover:bg-[#7c3aed]/6 transition-colors"
                >
                  Outils
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", mobileToolsOpen && "rotate-180")} />
                </button>
                {mobileToolsOpen && (
                  <div className="ml-4 mt-1 space-y-0.5">
                    {TOOLS.map(tool => (
                      <Link
                        key={tool.href}
                        to={tool.href}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-gray-600 hover:text-[#7c3aed] hover:bg-[#7c3aed]/6 transition-colors"
                      >
                        <tool.icon className="h-4 w-4 text-[#7c3aed]/70" />
                        {tool.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-gray-100">
                <Link
                  to="/register"
                  className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full text-sm font-semibold text-white"
                  style={{
                    background: "linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)",
                    boxShadow: "0 4px 14px rgba(124,58,237,0.3)",
                  }}
                >
                  Commencer →
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Keyframes injected as a style tag */}
      <style>{`
        @keyframes header-enter {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dropdown-enter {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes mobile-menu-enter {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes cta-pulse {
          0%, 100% { box-shadow: 0 4px 14px rgba(124,58,237,0.35); }
          50%       { box-shadow: 0 4px 20px rgba(124,58,237,0.55); }
        }
      `}</style>
    </>
  );
};
