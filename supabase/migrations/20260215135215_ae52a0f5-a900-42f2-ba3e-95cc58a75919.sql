
-- CMS Pages table
CREATE TABLE public.cms_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  content text DEFAULT '',
  meta_title text,
  meta_description text,
  og_image text,
  status text NOT NULL DEFAULT 'draft',
  author_id uuid NOT NULL,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cms_pages ENABLE ROW LEVEL SECURITY;

-- Public can read published pages
CREATE POLICY "Anyone can read published cms pages"
ON public.cms_pages FOR SELECT
USING (status = 'published');

-- Admins can do everything
CREATE POLICY "Admins can manage all cms pages"
ON public.cms_pages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto update updated_at
CREATE TRIGGER update_cms_pages_updated_at
BEFORE UPDATE ON public.cms_pages
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- SEO Settings table
CREATE TABLE public.seo_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_path text NOT NULL UNIQUE,
  meta_title text,
  meta_description text,
  og_title text,
  og_description text,
  og_image text,
  canonical_url text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;

-- Public can read SEO settings
CREATE POLICY "Anyone can read seo settings"
ON public.seo_settings FOR SELECT
USING (true);

-- Admins can manage SEO settings
CREATE POLICY "Admins can manage seo settings"
ON public.seo_settings FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_seo_settings_updated_at
BEFORE UPDATE ON public.seo_settings
FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
