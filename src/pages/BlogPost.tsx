import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import cronosLogo from "@/assets/cronos-logo.png";

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const isCustomPage = location.pathname.startsWith("/p/");

  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved ? saved === 'dark' : true;
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["blog-post", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cms_pages")
        .select("*")
        .eq("slug", slug)
        .eq("status", "published")
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (page) {
      document.title = page.meta_title || page.title;
      const setMeta = (name: string, content: string, property?: boolean) => {
        if (!content) return;
        const attr = property ? "property" : "name";
        let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
        if (!el) {
          el = document.createElement("meta");
          el.setAttribute(attr, name);
          document.head.appendChild(el);
        }
        el.content = content;
      };
      setMeta("description", page.meta_description || "");
      setMeta("og:title", page.meta_title || page.title, true);
      setMeta("og:description", page.meta_description || "", true);
      if (page.og_image) setMeta("og:image", page.og_image, true);
    }
  }, [page]);

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">
      Chargement...
    </div>
  );

  if (error || !page) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Page introuvable</p>
      <Button variant="outline" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4 mr-2" />Accueil</Button>
    </div>
  );

  const isBlog = (page as any).page_type !== "page" && !isCustomPage;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/10 blur-3xl" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header */}
        <header className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-4 sm:py-6">
          <a href="/" className="flex items-center gap-3">
            <img src={cronosLogo} alt="Cronos" className="h-9 w-9 rounded-xl" />
            <span className="font-display text-xl font-bold text-foreground">Cronos</span>
          </a>

          <nav className="hidden md:flex items-center gap-8">
            <a href="/" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Accueil</a>
            <a href="/help" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Aide</a>
            <a href="/pricing" className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium">Tarifs</a>
          </nav>

          <nav className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsDark(!isDark)}
              className="rounded-full w-10 h-10 hover:bg-accent"
            >
              {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground hover:text-foreground">
              Connexion
            </Button>
            <Button size="sm" onClick={() => navigate("/register")} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              S'inscrire
            </Button>
          </nav>
        </header>

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 py-8 sm:py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground mb-4">{page.title}</h1>
            {isBlog && page.published_at && (
              <p className="text-sm text-muted-foreground mb-8">
                Publié le {new Date(page.published_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
              </p>
            )}
            <article
              className="prose prose-lg max-w-none dark:prose-invert"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        </main>

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

export default BlogPost;
