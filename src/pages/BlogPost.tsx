import React, { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Moon, Sun, Clock, ChevronRight } from "lucide-react";
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

  // Estimate reading time
  const getReadingTime = (html: string) => {
    const text = html?.replace(/<[^>]*>/g, "") || "";
    const words = text.trim().split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  };

  if (isLoading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  );

  if (error || !page) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <div className="h-16 w-16 rounded-2xl bg-muted/60 flex items-center justify-center mb-2">
        <span className="text-3xl">🔍</span>
      </div>
      <p className="text-lg font-medium text-foreground">Page introuvable</p>
      <p className="text-sm text-muted-foreground">Le contenu que vous recherchez n'existe pas ou a été supprimé</p>
      <Button variant="outline" onClick={() => navigate("/")} className="rounded-xl mt-2">
        <ArrowLeft className="h-4 w-4 mr-2" />Retour à l'accueil
      </Button>
    </div>
  );

  const isBlog = (page as any).page_type !== "page" && !isCustomPage;
  const readingTime = getReadingTime(page.content || "");

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient background effects — subtils */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-1/2 -left-1/4 w-[800px] h-[800px] rounded-full bg-primary/3 blur-[120px]" />
        <div className="absolute -bottom-1/2 -right-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        {/* Header — glassmorphism sticky */}
        <header className="sticky top-0 z-50 border-b border-border/30 bg-background/80 backdrop-blur-xl">
          <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 py-3.5">
            <a href="/" className="flex items-center gap-2.5 group">
              <img src={cronosLogo} alt="Cronos" className="h-8 w-8 rounded-xl transition-transform group-hover:scale-105" />
              <span className="font-display text-lg font-bold text-foreground">Cronos</span>
            </a>

            <nav className="hidden md:flex items-center gap-8">
              {[
                { label: "Accueil", href: "/" },
                { label: "Aide", href: "/help" },
                { label: "Tarifs", href: "/pricing" },
              ].map((link) => (
                <a 
                  key={link.href}
                  href={link.href} 
                  className="text-muted-foreground hover:text-foreground transition-colors text-sm font-medium relative after:absolute after:bottom-0 after:left-0 after:w-0 hover:after:w-full after:h-px after:bg-primary after:transition-all"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <nav className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDark(!isDark)}
                className="rounded-xl w-9 h-9 hover:bg-accent"
              >
                {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")} className="text-muted-foreground hover:text-foreground rounded-lg">
                Connexion
              </Button>
              <Button size="sm" onClick={() => navigate("/register")} className="rounded-xl shadow-lg shadow-primary/20">
                S'inscrire
              </Button>
            </nav>
          </div>
        </header>

        {/* Breadcrumb */}
        {isBlog && (
          <div className="container mx-auto px-4 sm:px-6 pt-6">
            <nav className="flex items-center gap-1.5 text-xs text-muted-foreground/60">
              <a href="/" className="hover:text-foreground transition-colors">Accueil</a>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground/80 font-medium truncate">{page.title}</span>
            </nav>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 container mx-auto px-4 py-8 sm:py-12">
          <div className="max-w-2xl mx-auto">
            {/* Article header */}
            <header className="mb-10">
              <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-bold text-foreground leading-tight tracking-tight">
                {page.title}
              </h1>
              {isBlog && (
                <div className="flex items-center gap-4 mt-5 text-sm text-muted-foreground">
                  {page.published_at && (
                    <time className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                      {new Date(page.published_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
                    </time>
                  )}
                  <span className="flex items-center gap-1.5 text-muted-foreground/60">
                    <Clock className="h-3.5 w-3.5" />
                    {readingTime} min de lecture
                  </span>
                </div>
              )}
              {isBlog && <div className="h-px bg-gradient-to-r from-primary/20 via-border/50 to-transparent mt-8" />}
            </header>

            {/* Article body */}
            <article
              className="prose prose-lg max-w-none dark:prose-invert 
                prose-headings:text-foreground prose-headings:tracking-tight prose-headings:font-bold
                prose-p:text-muted-foreground prose-p:leading-relaxed
                prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                prose-strong:text-foreground
                prose-img:rounded-xl prose-img:shadow-lg
                prose-blockquote:border-primary/30 prose-blockquote:bg-muted/20 prose-blockquote:rounded-r-xl prose-blockquote:py-1
                prose-code:text-primary prose-code:bg-muted/40 prose-code:rounded-md prose-code:px-1.5 prose-code:py-0.5 prose-code:text-sm
                prose-pre:rounded-xl prose-pre:bg-card prose-pre:border prose-pre:border-border/50
                prose-li:text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: page.content }}
            />
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border/30 bg-card/20 backdrop-blur-sm">
          <div className="container mx-auto px-6 py-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <a href="/" className="flex items-center gap-2 group">
                <img src={cronosLogo} alt="Cronos" className="h-5 w-5 transition-transform group-hover:scale-105" />
                <span className="font-display font-semibold text-foreground">Cronos</span>
              </a>
              <div className="flex flex-wrap justify-center gap-4 md:gap-6 text-sm text-muted-foreground">
                <a href="/help" className="hover:text-primary transition-colors duration-300">Aide</a>
                <a href="/privacy-policy" className="hover:text-primary transition-colors duration-300">Confidentialité</a>
                <a href="/terms-of-service" className="hover:text-primary transition-colors duration-300">Conditions</a>
                <a href="/mentions-legales" className="hover:text-primary transition-colors duration-300">Mentions légales</a>
              </div>
              <p className="text-sm text-muted-foreground/60">© 2026 Cronos</p>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default BlogPost;
