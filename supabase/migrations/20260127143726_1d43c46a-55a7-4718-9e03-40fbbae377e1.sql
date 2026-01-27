-- Add batch tracking columns to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS search_batch_id UUID,
ADD COLUMN IF NOT EXISTS search_batch_date TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Create index for efficient batch queries
CREATE INDEX IF NOT EXISTS idx_companies_search_batch_id ON public.companies(search_batch_id);
CREATE INDEX IF NOT EXISTS idx_companies_search_batch_date ON public.companies(search_batch_date DESC);