-- Create enum for job status
CREATE TYPE public.job_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create enum for blacklist reason
CREATE TYPE public.blacklist_reason AS ENUM ('no_email_found', 'api_error', 'invalid_company');

-- Create job_queue table
CREATE TABLE public.job_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    status job_status NOT NULL DEFAULT 'pending',
    priority INTEGER NOT NULL DEFAULT 100,
    is_premium BOOLEAN NOT NULL DEFAULT false,
    
    -- Job parameters
    search_params JSONB NOT NULL,
    company_sirens TEXT[] NOT NULL DEFAULT '{}',
    
    -- Progress tracking
    total_count INTEGER NOT NULL DEFAULT 0,
    processed_count INTEGER NOT NULL DEFAULT 0,
    success_count INTEGER NOT NULL DEFAULT 0,
    error_count INTEGER NOT NULL DEFAULT 0,
    skipped_count INTEGER NOT NULL DEFAULT 0,
    
    -- Results
    results JSONB DEFAULT '[]'::jsonb,
    errors JSONB DEFAULT '[]'::jsonb,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create company_blacklist table
CREATE TABLE public.company_blacklist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_siren TEXT NOT NULL UNIQUE,
    company_name TEXT,
    blacklist_reason blacklist_reason NOT NULL,
    is_permanent BOOLEAN NOT NULL DEFAULT false,
    expires_at TIMESTAMP WITH TIME ZONE,
    hit_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_blacklist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for job_queue
CREATE POLICY "Users can view own jobs"
ON public.job_queue FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own jobs"
ON public.job_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own jobs"
ON public.job_queue FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own jobs"
ON public.job_queue FOR DELETE
USING (auth.uid() = user_id);

-- RLS Policies for company_blacklist (public read, service role write)
CREATE POLICY "Anyone can view blacklist"
ON public.company_blacklist FOR SELECT
USING (true);

-- Create indexes for performance
CREATE INDEX idx_job_queue_status ON public.job_queue(status);
CREATE INDEX idx_job_queue_priority ON public.job_queue(priority DESC, created_at ASC);
CREATE INDEX idx_job_queue_user_status ON public.job_queue(user_id, status);
CREATE INDEX idx_company_blacklist_siren ON public.company_blacklist(company_siren);
CREATE INDEX idx_company_blacklist_expires ON public.company_blacklist(expires_at) WHERE expires_at IS NOT NULL;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_job_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_job_queue_updated_at
    BEFORE UPDATE ON public.job_queue
    FOR EACH ROW
    EXECUTE FUNCTION public.update_job_queue_updated_at();

CREATE TRIGGER update_company_blacklist_updated_at
    BEFORE UPDATE ON public.company_blacklist
    FOR EACH ROW
    EXECUTE FUNCTION public.update_job_queue_updated_at();

-- Enable realtime for job_queue
ALTER PUBLICATION supabase_realtime ADD TABLE public.job_queue;

-- Function to check if company is blacklisted
CREATE OR REPLACE FUNCTION public.is_company_blacklisted(p_siren TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.company_blacklist
        WHERE company_siren = p_siren
        AND (is_permanent = true OR expires_at > now())
    )
$$;

-- Function to add company to blacklist
CREATE OR REPLACE FUNCTION public.add_to_blacklist(
    p_siren TEXT,
    p_name TEXT,
    p_reason blacklist_reason,
    p_permanent BOOLEAN DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.company_blacklist (company_siren, company_name, blacklist_reason, is_permanent, expires_at)
    VALUES (
        p_siren,
        p_name,
        p_reason,
        p_permanent,
        CASE WHEN p_permanent THEN NULL ELSE now() + interval '24 hours' END
    )
    ON CONFLICT (company_siren) DO UPDATE SET
        hit_count = company_blacklist.hit_count + 1,
        updated_at = now(),
        -- If already permanent, keep it permanent
        is_permanent = CASE WHEN company_blacklist.is_permanent THEN true ELSE EXCLUDED.is_permanent END,
        expires_at = CASE WHEN company_blacklist.is_permanent THEN NULL ELSE EXCLUDED.expires_at END;
END;
$$;