-- Add updated_at column and trigger for public.companies to fix update errors
-- Ensure timestamps are handled properly

-- 1) Add updated_at if missing
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- 2) Ensure created_at has a default and is populated
ALTER TABLE public.companies
ALTER COLUMN created_at SET DEFAULT now();

UPDATE public.companies
SET created_at = now()
WHERE created_at IS NULL;

-- 3) Create/replace trigger to auto-update updated_at on any UPDATE
DROP TRIGGER IF EXISTS set_companies_updated_at ON public.companies;
CREATE TRIGGER set_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at();