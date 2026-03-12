
-- Create job_title_clusters table for automatic profession detection
CREATE TABLE public.job_title_clusters (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  normalized_title text NOT NULL UNIQUE,
  raw_titles text[] DEFAULT '{}',
  analysis_ids uuid[] DEFAULT '{}',
  analysis_count integer DEFAULT 0,
  keyword_frequencies jsonb DEFAULT '{}',
  suggested_profession_id uuid REFERENCES public.ats_professions(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending',
  cluster_threshold integer NOT NULL DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_job_title_clusters_status ON public.job_title_clusters(status);
CREATE INDEX IF NOT EXISTS idx_job_title_clusters_normalized ON public.job_title_clusters(normalized_title);
CREATE INDEX IF NOT EXISTS idx_job_title_clusters_count ON public.job_title_clusters(analysis_count);

-- Enable RLS
ALTER TABLE public.job_title_clusters ENABLE ROW LEVEL SECURITY;

-- Admins can manage all clusters
CREATE POLICY "Admins can manage job_title_clusters"
  ON public.job_title_clusters
  FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Edge functions (service role) can upsert clusters
CREATE POLICY "Service role can manage clusters"
  ON public.job_title_clusters
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- updated_at trigger
CREATE TRIGGER update_job_title_clusters_updated_at
  BEFORE UPDATE ON public.job_title_clusters
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
