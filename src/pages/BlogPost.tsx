import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const BlogPost = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement...</div>;
  if (error || !page) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-muted-foreground">Page introuvable</p>
      <Button variant="outline" onClick={() => navigate("/")}><ArrowLeft className="h-4 w-4 mr-2" />Accueil</Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="gap-2">
            <ArrowLeft className="h-4 w-4" /> Retour
          </Button>
        </div>
      </header>
      <main className="container mx-auto px-4 py-12 max-w-3xl">
        <h1 className="text-4xl font-bold text-foreground mb-4">{page.title}</h1>
        {page.published_at && (
          <p className="text-sm text-muted-foreground mb-8">
            Publié le {new Date(page.published_at).toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" })}
          </p>
        )}
        <article
          className="prose prose-lg max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: page.content }}
        />
      </main>
    </div>
  );
};

export default BlogPost;
