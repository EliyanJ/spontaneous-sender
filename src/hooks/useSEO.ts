import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useSEO = (pagePath: string) => {
  const { data: seo } = useQuery({
    queryKey: ["seo", pagePath],
    queryFn: async () => {
      const { data } = await supabase
        .from("seo_settings")
        .select("*")
        .eq("page_path", pagePath)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (!seo) return;

    if (seo.meta_title) document.title = seo.meta_title;

    const setMeta = (nameOrProp: string, content: string, isProperty = false) => {
      if (!content) return;
      const attr = isProperty ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${nameOrProp}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, nameOrProp);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    setMeta("description", seo.meta_description || "");
    setMeta("og:title", seo.og_title || seo.meta_title || "", true);
    setMeta("og:description", seo.og_description || seo.meta_description || "", true);
    if (seo.og_image) setMeta("og:image", seo.og_image, true);

    if (seo.canonical_url) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = seo.canonical_url;
    }
  }, [seo]);
};
