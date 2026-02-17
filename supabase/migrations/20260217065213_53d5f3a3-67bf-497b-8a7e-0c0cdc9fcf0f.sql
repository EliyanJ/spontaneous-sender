
-- Bucket cms-media public
INSERT INTO storage.buckets (id, name, public) VALUES ('cms-media', 'cms-media', true);

-- Politique RLS storage : admins upload/delete, public read
CREATE POLICY "Public read cms-media" ON storage.objects FOR SELECT USING (bucket_id = 'cms-media');
CREATE POLICY "Admins can upload cms-media" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'cms-media' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete cms-media" ON storage.objects FOR DELETE USING (bucket_id = 'cms-media' AND public.has_role(auth.uid(), 'admin'));

-- Table cms_blocks
CREATE TABLE public.cms_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  html_template TEXT NOT NULL DEFAULT '',
  css TEXT DEFAULT '',
  js TEXT,
  thumbnail_url TEXT,
  editable_params JSONB DEFAULT '[]'::jsonb,
  category TEXT DEFAULT 'general',
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.cms_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage blocks" ON public.cms_blocks FOR ALL USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Public can read blocks" ON public.cms_blocks FOR SELECT USING (true);

-- Trigger updated_at
CREATE TRIGGER update_cms_blocks_updated_at
  BEFORE UPDATE ON public.cms_blocks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
